const express = require('express');
const { body, validationResult, query } = require('express-validator');
const User = require('../models/User');
const Task = require('../models/Task');
const AuditLog = require('../models/AuditLog');
const { authenticate, authorize, authorizeTeamAccess } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users (Super Admin) or team members (Manager)
// @access  Private (Super Admin, Manager)
router.get('/', [
  authenticate,
  authorize('super_admin', 'manager'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('role').optional().isIn(['super_admin', 'manager', 'employee']).withMessage('Invalid role filter'),
  query('search').optional().isLength({ min: 1 }).withMessage('Search term cannot be empty')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { role, search, isActive } = req.query;

    let query = {};

    // Role-based filtering
    if (req.user.role === 'manager') {
      // Manager can only see their team members and themselves
      query = {
        $or: [
          { managerId: req.user._id },
          { _id: req.user._id }
        ]
      };
    }

    // Additional filters
    if (role) {
      query.role = role;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .populate('managerId', 'name email')
      .populate('teamMembers', 'name email role')
      .select('-password -twoFactorSecret')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          limit
        }
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users'
    });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private (Super Admin, Manager for team members, Employee for self)
router.get('/:id', [
  authenticate,
  authorizeTeamAccess
], async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('managerId', 'name email role')
      .populate('teamMembers', 'name email role')
      .select('-password -twoFactorSecret');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user'
    });
  }
});

// @route   POST /api/users
// @desc    Create new user
// @access  Private (Super Admin, Manager for employees)
router.post('/', [
  authenticate,
  authorize('super_admin', 'manager'),
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('role')
    .isIn(['manager', 'employee'])
    .withMessage('Role must be either manager or employee'),
  body('department').optional().trim().isLength({ max: 50 }).withMessage('Department cannot exceed 50 characters'),
  body('phoneNumber').optional().isMobilePhone().withMessage('Please provide a valid phone number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, password, role, department, phoneNumber } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Managers can only create employees in their team
    if (req.user.role === 'manager' && role !== 'employee') {
      return res.status(403).json({
        success: false,
        message: 'Managers can only create employee accounts'
      });
    }

    const userData = {
      name,
      email,
      password,
      role,
      department,
      phoneNumber
    };

    // If manager is creating employee, set managerId
    if (req.user.role === 'manager' && role === 'employee') {
      userData.managerId = req.user._id;
    }

    const user = new User(userData);
    await user.save();

    // Update manager's team if employee is created
    if (userData.managerId) {
      await User.findByIdAndUpdate(userData.managerId, {
        $addToSet: { teamMembers: user._id }
      });
    }

    // Log user creation
    await AuditLog.logAction({
      user: req.user._id,
      action: 'user_created',
      resource: 'user',
      resourceId: user._id,
      details: { 
        createdUser: { name, email, role },
        createdBy: req.user.role
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      category: 'data'
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { user: user.toSafeObject() }
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user'
    });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private (Super Admin, Manager for team members, Employee for self - limited fields)
router.put('/:id', [
  authenticate,
  authorizeTeamAccess,
  body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('role').optional().isIn(['super_admin', 'manager', 'employee']).withMessage('Invalid role'),
  body('department').optional().trim().isLength({ max: 50 }).withMessage('Department cannot exceed 50 characters'),
  body('phoneNumber').optional().isMobilePhone().withMessage('Please provide a valid phone number'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.params.id;
    const updates = req.body;

    // Remove sensitive fields that shouldn't be updated via this endpoint
    delete updates.password;
    delete updates.loginAttempts;
    delete updates.lockUntil;
    delete updates.twoFactorSecret;

    // Role-based update restrictions
    if (req.user.role === 'employee') {
      // Employees can only update their own basic info
      const allowedFields = ['name', 'phoneNumber', 'notificationSettings'];
      const updateKeys = Object.keys(updates);
      const hasUnauthorizedFields = updateKeys.some(key => !allowedFields.includes(key));
      
      if (hasUnauthorizedFields || userId !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Employees can only update their own basic information'
        });
      }
    }

    if (req.user.role === 'manager') {
      // Managers cannot change roles or activate/deactivate users
      delete updates.role;
      delete updates.isActive;
    }

    // Check if email is being changed and if it already exists
    if (updates.email) {
      const existingUser = await User.findOne({ 
        email: updates.email, 
        _id: { $ne: userId } 
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('managerId', 'name email').populate('teamMembers', 'name email role');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Log user update
    await AuditLog.logAction({
      user: req.user._id,
      action: 'user_updated',
      resource: 'user',
      resourceId: user._id,
      details: { 
        updatedFields: Object.keys(updates),
        updatedBy: req.user.role
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      category: 'data'
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user: user.toSafeObject() }
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user (soft delete by deactivating)
// @access  Private (Super Admin only)
router.delete('/:id', [
  authenticate,
  authorize('super_admin')
], async (req, res) => {
  try {
    const userId = req.params.id;

    // Cannot delete self
    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Soft delete by deactivating
    user.isActive = false;
    await user.save();

    // Reassign tasks if user has active tasks
    const activeTasks = await Task.find({
      assignedTo: userId,
      status: { $in: ['pending', 'in_progress'] }
    });

    if (activeTasks.length > 0) {
      // For now, we'll just mark them as needing reassignment
      // In a real app, you might want to reassign to manager or another team member
      await Task.updateMany(
        { assignedTo: userId, status: { $in: ['pending', 'in_progress'] } },
        { 
          $set: { 
            status: 'pending',
            assignedTo: null 
          },
          $push: {
            comments: {
              user: req.user._id,
              text: `Task reassignment needed - original assignee account deactivated`,
              createdAt: new Date()
            }
          }
        }
      );
    }

    // Remove from manager's team
    if (user.managerId) {
      await User.findByIdAndUpdate(user.managerId, {
        $pull: { teamMembers: userId }
      });
    }

    // Log user deletion
    await AuditLog.logAction({
      user: req.user._id,
      action: 'user_deleted',
      resource: 'user',
      resourceId: user._id,
      details: { 
        deletedUser: { name: user.name, email: user.email, role: user.role },
        activeTasks: activeTasks.length
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      severity: 'high',
      category: 'data'
    });

    res.json({
      success: true,
      message: 'User deactivated successfully',
      data: {
        reassignedTasks: activeTasks.length
      }
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
});

// @route   GET /api/users/:id/tasks
// @desc    Get tasks for a specific user
// @access  Private (Super Admin, Manager for team members, Employee for self)
router.get('/:id/tasks', [
  authenticate,
  authorizeTeamAccess,
  query('status').optional().isIn(['pending', 'in_progress', 'completed', 'approved', 'rejected']).withMessage('Invalid status'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { status } = req.query;

    let query = { assignedTo: userId };
    if (status) {
      query.status = status;
    }

    const tasks = await Task.find(query)
      .populate('assignedBy', 'name email role')
      .populate('assignedTo', 'name email role')
      .populate('approvedBy', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Task.countDocuments(query);

    res.json({
      success: true,
      data: {
        tasks,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          limit
        }
      }
    });

  } catch (error) {
    console.error('Get user tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user tasks'
    });
  }
});

// @route   PUT /api/users/:id/activate
// @desc    Activate/Deactivate user
// @access  Private (Super Admin only)
router.put('/:id/activate', [
  authenticate,
  authorize('super_admin'),
  body('isActive').isBoolean().withMessage('isActive must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.params.id;
    const { isActive } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { isActive },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Log activation/deactivation
    await AuditLog.logAction({
      user: req.user._id,
      action: 'user_updated',
      resource: 'user',
      resourceId: user._id,
      details: { 
        action: isActive ? 'activated' : 'deactivated',
        targetUser: { name: user.name, email: user.email }
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      severity: 'medium',
      category: 'data'
    });

    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: { user: user.toSafeObject() }
    });

  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status'
    });
  }
});

module.exports = router;