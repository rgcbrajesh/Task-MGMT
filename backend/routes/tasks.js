const express = require('express');
const { body, validationResult, query } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Task = require('../models/Task');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { authenticate, authorize, authorizeTeamAccess } = require('../middleware/auth');
const { sendNotification } = require('../utils/notifications');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/tasks';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = process.env.ALLOWED_FILE_TYPES?.split(',') || [
    'image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880 // 5MB
  }
});

// @route   GET /api/tasks
// @desc    Get tasks based on user role
// @access  Private
router.get('/', [
  authenticate,
  query('status').optional().isIn(['pending', 'in_progress', 'completed', 'approved', 'rejected']).withMessage('Invalid status'),
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().isLength({ min: 1 }).withMessage('Search term cannot be empty'),
  query('assignedTo').optional().isMongoId().withMessage('Invalid assignedTo ID'),
  query('overdue').optional().isBoolean().withMessage('Overdue must be a boolean')
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
    const { status, priority, search, assignedTo, overdue } = req.query;

    let query = {};

    // Role-based filtering
    switch (req.user.role) {
      case 'super_admin':
        // Super admin can see all tasks
        break;
      case 'manager':
        // Manager can see tasks assigned to them or their team members
        const teamMembers = await User.find({ managerId: req.user._id }).select('_id');
        const teamMemberIds = teamMembers.map(member => member._id);
        query = {
          $or: [
            { assignedTo: req.user._id },
            { assignedBy: req.user._id },
            { assignedTo: { $in: teamMemberIds } }
          ]
        };
        break;
      case 'employee':
        // Employee can only see tasks assigned to them
        query = { assignedTo: req.user._id };
        break;
    }

    // Additional filters
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;
    
    if (search) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]
      });
    }

    if (overdue === 'true') {
      query.deadline = { $lt: new Date() };
      query.status = { $nin: ['completed', 'approved'] };
    }

    const tasks = await Task.find(query)
      .populate('assignedBy', 'name email role')
      .populate('assignedTo', 'name email role')
      .populate('approvedBy', 'name email role')
      .populate('comments.user', 'name email')
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
    console.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve tasks'
    });
  }
});

// @route   GET /api/tasks/:id
// @desc    Get task by ID
// @access  Private
router.get('/:id', [
  authenticate
], async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedBy', 'name email role')
      .populate('assignedTo', 'name email role')
      .populate('approvedBy', 'name email role')
      .populate('comments.user', 'name email')
      .populate('attachments.uploadedBy', 'name email')
      .populate('statusHistory.changedBy', 'name email');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check access permissions
    const hasAccess = 
      req.user.role === 'super_admin' ||
      task.assignedTo._id.toString() === req.user._id.toString() ||
      task.assignedBy._id.toString() === req.user._id.toString() ||
      (req.user.role === 'manager' && task.assignedTo.managerId?.toString() === req.user._id.toString());

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { task }
    });

  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve task'
    });
  }
});

// @route   POST /api/tasks
// @desc    Create new task
// @access  Private (Super Admin, Manager)
router.post('/', [
  authenticate,
  authorize('super_admin', 'manager'),
  body('title')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  body('assignedTo')
    .isMongoId()
    .withMessage('Invalid assignedTo ID'),
  body('deadline')
    .isISO8601()
    .withMessage('Invalid deadline format'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority'),
  body('estimatedHours')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Estimated hours must be a positive number'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
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

    const { title, description, assignedTo, deadline, priority, estimatedHours, tags } = req.body;

    // Validate assignee exists and is accessible
    const assignee = await User.findById(assignedTo);
    if (!assignee) {
      return res.status(400).json({
        success: false,
        message: 'Assigned user not found'
      });
    }

    // Managers can only assign tasks to their team members
    if (req.user.role === 'manager') {
      if (assignee.managerId?.toString() !== req.user._id.toString() && 
          assignedTo !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only assign tasks to your team members'
        });
      }
    }

    // Validate deadline is in the future
    if (new Date(deadline) <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Deadline must be in the future'
      });
    }

    const task = new Task({
      title,
      description,
      assignedBy: req.user._id,
      assignedTo,
      deadline: new Date(deadline),
      priority: priority || 'medium',
      estimatedHours,
      tags: tags || []
    });

    await task.save();

    // Populate the task for response
    await task.populate('assignedBy', 'name email role');
    await task.populate('assignedTo', 'name email role');

    // Send notification to assignee
    await sendNotification({
      userId: assignedTo,
      title: 'New Task Assigned',
      body: `New task "${title}" assigned by ${req.user.name}`,
      data: {
        type: 'task_assigned',
        taskId: task._id.toString(),
        assignedBy: req.user.name
      }
    });

    // Log task creation
    await AuditLog.logAction({
      user: req.user._id,
      action: 'task_created',
      resource: 'task',
      resourceId: task._id,
      details: {
        title,
        assignedTo: assignee.name,
        priority,
        deadline
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      category: 'data'
    });

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: { task }
    });

  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create task'
    });
  }
});

// @route   PUT /api/tasks/:id
// @desc    Update task
// @access  Private
router.put('/:id', [
  authenticate,
  body('title').optional().trim().isLength({ min: 3, max: 100 }).withMessage('Title must be between 3 and 100 characters'),
  body('description').optional().trim().isLength({ min: 10, max: 1000 }).withMessage('Description must be between 10 and 1000 characters'),
  body('deadline').optional().isISO8601().withMessage('Invalid deadline format'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
  body('estimatedHours').optional().isFloat({ min: 0 }).withMessage('Estimated hours must be a positive number'),
  body('actualHours').optional().isFloat({ min: 0 }).withMessage('Actual hours must be a positive number'),
  body('tags').optional().isArray().withMessage('Tags must be an array')
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

    const taskId = req.params.id;
    const updates = req.body;

    const task = await Task.findById(taskId)
      .populate('assignedBy', 'name email role')
      .populate('assignedTo', 'name email role');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check permissions
    const canEdit = 
      req.user.role === 'super_admin' ||
      task.assignedBy._id.toString() === req.user._id.toString() ||
      (req.user.role === 'manager' && task.assignedTo.managerId?.toString() === req.user._id.toString());

    if (!canEdit) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to edit this task'
      });
    }

    // Employees can only update certain fields
    if (req.user.role === 'employee' && task.assignedTo._id.toString() === req.user._id.toString()) {
      const allowedFields = ['actualHours'];
      const updateKeys = Object.keys(updates);
      const hasUnauthorizedFields = updateKeys.some(key => !allowedFields.includes(key));
      
      if (hasUnauthorizedFields) {
        return res.status(403).json({
          success: false,
          message: 'Employees can only update actual hours'
        });
      }
    }

    // Validate deadline if being updated
    if (updates.deadline && new Date(updates.deadline) <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Deadline must be in the future'
      });
    }

    // Update task
    Object.keys(updates).forEach(key => {
      task[key] = updates[key];
    });

    await task.save();

    // Log task update
    await AuditLog.logAction({
      user: req.user._id,
      action: 'task_updated',
      resource: 'task',
      resourceId: task._id,
      details: {
        updatedFields: Object.keys(updates),
        taskTitle: task.title
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      category: 'data'
    });

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: { task }
    });

  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update task'
    });
  }
});

// @route   PUT /api/tasks/:id/status
// @desc    Update task status
// @access  Private
router.put('/:id/status', [
  authenticate,
  body('status')
    .isIn(['pending', 'in_progress', 'completed', 'approved', 'rejected'])
    .withMessage('Invalid status'),
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Comment cannot exceed 200 characters'),
  body('rejectionReason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Rejection reason cannot exceed 500 characters')
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

    const taskId = req.params.id;
    const { status, comment, rejectionReason } = req.body;

    const task = await Task.findById(taskId)
      .populate('assignedBy', 'name email role')
      .populate('assignedTo', 'name email role');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check permissions based on status change
    let hasPermission = false;
    
    if (status === 'in_progress' || status === 'completed') {
      // Employee can mark their tasks as in_progress or completed
      hasPermission = task.assignedTo._id.toString() === req.user._id.toString();
    } else if (status === 'approved' || status === 'rejected') {
      // Only managers and super admins can approve/reject
      hasPermission = 
        req.user.role === 'super_admin' ||
        task.assignedBy._id.toString() === req.user._id.toString() ||
        (req.user.role === 'manager' && task.assignedTo.managerId?.toString() === req.user._id.toString());
    } else if (status === 'pending') {
      // Anyone with edit access can reset to pending
      hasPermission = 
        req.user.role === 'super_admin' ||
        task.assignedBy._id.toString() === req.user._id.toString() ||
        task.assignedTo._id.toString() === req.user._id.toString() ||
        (req.user.role === 'manager' && task.assignedTo.managerId?.toString() === req.user._id.toString());
    }

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to change this task status'
      });
    }

    // Update status with history
    if (status === 'rejected' && rejectionReason) {
      task.rejectionReason = rejectionReason;
    }

    await task.updateStatus(status, req.user._id, comment);

    // Send notification based on status change
    let notificationTitle, notificationBody, notificationData;
    
    switch (status) {
      case 'in_progress':
        notificationTitle = 'Task Started';
        notificationBody = `${req.user.name} started working on "${task.title}"`;
        notificationData = { type: 'task_started', taskId: task._id.toString() };
        // Notify assignedBy
        await sendNotification({
          userId: task.assignedBy._id,
          title: notificationTitle,
          body: notificationBody,
          data: notificationData
        });
        break;
      
      case 'completed':
        notificationTitle = 'Task Completed';
        notificationBody = `${req.user.name} completed "${task.title}"`;
        notificationData = { type: 'task_completed', taskId: task._id.toString() };
        // Notify assignedBy
        await sendNotification({
          userId: task.assignedBy._id,
          title: notificationTitle,
          body: notificationBody,
          data: notificationData
        });
        break;
      
      case 'approved':
        notificationTitle = 'Task Approved';
        notificationBody = `Your task "${task.title}" has been approved`;
        notificationData = { type: 'task_approved', taskId: task._id.toString() };
        // Notify assignedTo
        await sendNotification({
          userId: task.assignedTo._id,
          title: notificationTitle,
          body: notificationBody,
          data: notificationData
        });
        break;
      
      case 'rejected':
        notificationTitle = 'Task Rejected';
        notificationBody = `Your task "${task.title}" needs revision`;
        notificationData = { type: 'task_rejected', taskId: task._id.toString() };
        // Notify assignedTo
        await sendNotification({
          userId: task.assignedTo._id,
          title: notificationTitle,
          body: notificationBody,
          data: notificationData
        });
        break;
    }

    // Log status change
    await AuditLog.logAction({
      user: req.user._id,
      action: `task_${status}`,
      resource: 'task',
      resourceId: task._id,
      details: {
        taskTitle: task.title,
        previousStatus: task.statusHistory[task.statusHistory.length - 2]?.status || 'pending',
        newStatus: status,
        comment
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      category: 'data'
    });

    res.json({
      success: true,
      message: `Task ${status} successfully`,
      data: { task }
    });

  } catch (error) {
    console.error('Update task status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update task status'
    });
  }
});

// @route   POST /api/tasks/:id/comments
// @desc    Add comment to task
// @access  Private
router.post('/:id/comments', [
  authenticate,
  body('text')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Comment must be between 1 and 500 characters')
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

    const taskId = req.params.id;
    const { text } = req.body;

    const task = await Task.findById(taskId)
      .populate('assignedBy', 'name email role')
      .populate('assignedTo', 'name email role');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check access permissions
    const hasAccess = 
      req.user.role === 'super_admin' ||
      task.assignedTo._id.toString() === req.user._id.toString() ||
      task.assignedBy._id.toString() === req.user._id.toString() ||
      (req.user.role === 'manager' && task.assignedTo.managerId?.toString() === req.user._id.toString());

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await task.addComment(req.user._id, text);
    
    // Populate the new comment
    await task.populate('comments.user', 'name email');

    // Send notification to relevant users
    const notificationUsers = [];
    if (task.assignedTo._id.toString() !== req.user._id.toString()) {
      notificationUsers.push(task.assignedTo._id);
    }
    if (task.assignedBy._id.toString() !== req.user._id.toString()) {
      notificationUsers.push(task.assignedBy._id);
    }

    for (const userId of notificationUsers) {
      await sendNotification({
        userId,
        title: 'New Comment',
        body: `${req.user.name} commented on "${task.title}"`,
        data: {
          type: 'comment_added',
          taskId: task._id.toString(),
          commentBy: req.user.name
        }
      });
    }

    // Log comment addition
    await AuditLog.logAction({
      user: req.user._id,
      action: 'comment_added',
      resource: 'task',
      resourceId: task._id,
      details: {
        taskTitle: task.title,
        commentLength: text.length
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      category: 'data'
    });

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: { 
        task,
        newComment: task.comments[task.comments.length - 1]
      }
    });

  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add comment'
    });
  }
});

// @route   POST /api/tasks/:id/attachments
// @desc    Upload attachment to task
// @access  Private
router.post('/:id/attachments', [
  authenticate,
  upload.single('attachment')
], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const taskId = req.params.id;
    const task = await Task.findById(taskId)
      .populate('assignedBy', 'name email role')
      .populate('assignedTo', 'name email role');

    if (!task) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check access permissions
    const hasAccess = 
      req.user.role === 'super_admin' ||
      task.assignedTo._id.toString() === req.user._id.toString() ||
      task.assignedBy._id.toString() === req.user._id.toString() ||
      (req.user.role === 'manager' && task.assignedTo.managerId?.toString() === req.user._id.toString());

    if (!hasAccess) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const attachmentData = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploadedBy: req.user._id,
      url: `/uploads/tasks/${req.file.filename}`
    };

    await task.addAttachment(attachmentData);
    await task.populate('attachments.uploadedBy', 'name email');

    // Send notification to relevant users
    const notificationUsers = [];
    if (task.assignedTo._id.toString() !== req.user._id.toString()) {
      notificationUsers.push(task.assignedTo._id);
    }
    if (task.assignedBy._id.toString() !== req.user._id.toString()) {
      notificationUsers.push(task.assignedBy._id);
    }

    for (const userId of notificationUsers) {
      await sendNotification({
        userId,
        title: 'New Attachment',
        body: `${req.user.name} uploaded a file to "${task.title}"`,
        data: {
          type: 'attachment_uploaded',
          taskId: task._id.toString(),
          uploadedBy: req.user.name
        }
      });
    }

    // Log attachment upload
    await AuditLog.logAction({
      user: req.user._id,
      action: 'attachment_uploaded',
      resource: 'task',
      resourceId: task._id,
      details: {
        taskTitle: task.title,
        filename: req.file.originalname,
        fileSize: req.file.size
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      category: 'data'
    });

    res.status(201).json({
      success: true,
      message: 'Attachment uploaded successfully',
      data: { 
        attachment: task.attachments[task.attachments.length - 1]
      }
    });

  } catch (error) {
    // Clean up uploaded file on error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    
    console.error('Upload attachment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload attachment'
    });
  }
});

// @route   DELETE /api/tasks/:id
// @desc    Delete task (soft delete by archiving)
// @access  Private (Super Admin, Task creator)
router.delete('/:id', [
  authenticate,
  authorize('super_admin', 'manager')
], async (req, res) => {
  try {
    const taskId = req.params.id;
    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Only super admin or task creator can delete
    if (req.user.role !== 'super_admin' && task.assignedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete tasks you created'
      });
    }

    // Soft delete by archiving
    task.isArchived = true;
    await task.save();

    // Log task deletion
    await AuditLog.logAction({
      user: req.user._id,
      action: 'task_deleted',
      resource: 'task',
      resourceId: task._id,
      details: {
        taskTitle: task.title,
        assignedTo: task.assignedTo
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      severity: 'medium',
      category: 'data'
    });

    res.json({
      success: true,
      message: 'Task archived successfully'
    });

  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete task'
    });
  }
});

module.exports = router;