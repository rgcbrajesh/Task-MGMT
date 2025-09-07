const express = require('express');
const { query, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');

const router = express.Router();

// @route   GET /api/audit/logs
// @desc    Get audit logs
// @access  Private (Super Admin only)
router.get('/logs', [
  authenticate,
  authorize('super_admin'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('action').optional().isString().withMessage('Action must be a string'),
  query('resource').optional().isIn(['user', 'task', 'notification', 'report', 'system', 'auth']).withMessage('Invalid resource'),
  query('userId').optional().isMongoId().withMessage('Invalid user ID'),
  query('startDate').optional().isISO8601().withMessage('Invalid start date'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date'),
  query('success').optional().isBoolean().withMessage('Success must be a boolean'),
  query('severity').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid severity'),
  query('category').optional().isIn(['security', 'data', 'system', 'user_action']).withMessage('Invalid category')
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
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const {
      action,
      resource,
      userId,
      startDate,
      endDate,
      success,
      severity,
      category
    } = req.query;

    // Build query
    let query = {};

    if (action) {
      query.action = { $regex: action, $options: 'i' };
    }

    if (resource) {
      query.resource = resource;
    }

    if (userId) {
      query.user = userId;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (success !== undefined) {
      query.success = success === 'true';
    }

    if (severity) {
      query.severity = severity;
    }

    if (category) {
      query.category = category;
    }

    const logs = await AuditLog.find(query)
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await AuditLog.countDocuments(query);

    // Log the audit log access
    await AuditLog.logAction({
      user: req.user._id,
      action: 'system_access',
      resource: 'system',
      details: {
        endpoint: 'audit_logs',
        filters: { action, resource, userId, startDate, endDate, success, severity, category },
        totalResults: total
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      category: 'system'
    });

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          limit
        },
        filters: { action, resource, userId, startDate, endDate, success, severity, category }
      }
    });

  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit logs'
    });
  }
});

// @route   GET /api/audit/logs/:id
// @desc    Get specific audit log
// @access  Private (Super Admin only)
router.get('/logs/:id', [
  authenticate,
  authorize('super_admin')
], async (req, res) => {
  try {
    const log = await AuditLog.findById(req.params.id)
      .populate('user', 'name email role');

    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Audit log not found'
      });
    }

    res.json({
      success: true,
      data: { log }
    });

  } catch (error) {
    console.error('Get audit log error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit log'
    });
  }
});

// @route   GET /api/audit/security
// @desc    Get security-related audit logs
// @access  Private (Super Admin only)
router.get('/security', [
  authenticate,
  authorize('super_admin'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('hours').optional().isInt({ min: 1, max: 168 }).withMessage('Hours must be between 1 and 168')
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
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const hours = parseInt(req.query.hours) || 24;

    const since = new Date(Date.now() - (hours * 60 * 60 * 1000));

    const securityLogs = await AuditLog.find({
      $or: [
        { category: 'security' },
        { action: { $in: ['login', 'logout', 'failed_login', 'password_change'] } },
        { success: false },
        { severity: { $in: ['high', 'critical'] } }
      ],
      createdAt: { $gte: since }
    })
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await AuditLog.countDocuments({
      $or: [
        { category: 'security' },
        { action: { $in: ['login', 'logout', 'failed_login', 'password_change'] } },
        { success: false },
        { severity: { $in: ['high', 'critical'] } }
      ],
      createdAt: { $gte: since }
    });

    // Get security summary
    const securitySummary = await AuditLog.aggregate([
      {
        $match: {
          $or: [
            { category: 'security' },
            { action: { $in: ['login', 'logout', 'failed_login', 'password_change'] } },
            { success: false }
          ],
          createdAt: { $gte: since }
        }
      },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
          successCount: {
            $sum: { $cond: [{ $eq: ['$success', true] }, 1, 0] }
          },
          failureCount: {
            $sum: { $cond: [{ $eq: ['$success', false] }, 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get failed login attempts by IP
    const failedLoginsByIP = await AuditLog.aggregate([
      {
        $match: {
          action: 'failed_login',
          createdAt: { $gte: since }
        }
      },
      {
        $group: {
          _id: '$ipAddress',
          count: { $sum: 1 },
          lastAttempt: { $max: '$createdAt' },
          users: { $addToSet: '$user' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Log security audit access
    await AuditLog.logAction({
      user: req.user._id,
      action: 'system_access',
      resource: 'system',
      details: {
        endpoint: 'security_audit',
        timeframe: `${hours} hours`,
        totalResults: total
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      category: 'security'
    });

    res.json({
      success: true,
      data: {
        logs: securityLogs,
        summary: securitySummary,
        failedLoginsByIP,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          limit
        },
        timeframe: `${hours} hours`
      }
    });

  } catch (error) {
    console.error('Get security logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve security logs'
    });
  }
});

// @route   GET /api/audit/user/:userId
// @desc    Get audit logs for specific user
// @access  Private (Super Admin only)
router.get('/user/:userId', [
  authenticate,
  authorize('super_admin'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365')
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

    const userId = req.params.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const days = parseInt(req.query.days) || 30;

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const since = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));

    const userLogs = await AuditLog.find({
      user: userId,
      createdAt: { $gte: since }
    })
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await AuditLog.countDocuments({
      user: userId,
      createdAt: { $gte: since }
    });

    // Get user activity summary
    const activitySummary = await AuditLog.aggregate([
      {
        $match: {
          user: mongoose.Types.ObjectId(userId),
          createdAt: { $gte: since }
        }
      },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
          lastActivity: { $max: '$createdAt' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get daily activity
    const dailyActivity = await AuditLog.aggregate([
      {
        $match: {
          user: mongoose.Types.ObjectId(userId),
          createdAt: { $gte: since }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          actions: { $addToSet: '$action' }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        logs: userLogs,
        activitySummary,
        dailyActivity,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          limit
        },
        timeframe: `${days} days`
      }
    });

  } catch (error) {
    console.error('Get user audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user audit logs'
    });
  }
});

// @route   GET /api/audit/summary
// @desc    Get audit summary statistics
// @access  Private (Super Admin only)
router.get('/summary', [
  authenticate,
  authorize('super_admin'),
  query('period').optional().isIn(['24h', '7d', '30d', '90d']).withMessage('Invalid period')
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

    const period = req.query.period || '24h';
    const periodHours = {
      '24h': 24,
      '7d': 168,
      '30d': 720,
      '90d': 2160
    };

    const since = new Date(Date.now() - (periodHours[period] * 60 * 60 * 1000));

    // Overall activity summary
    const overallSummary = await AuditLog.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: null,
          totalActions: { $sum: 1 },
          successfulActions: {
            $sum: { $cond: [{ $eq: ['$success', true] }, 1, 0] }
          },
          failedActions: {
            $sum: { $cond: [{ $eq: ['$success', false] }, 1, 0] }
          },
          uniqueUsers: { $addToSet: '$user' },
          uniqueIPs: { $addToSet: '$ipAddress' }
        }
      },
      {
        $addFields: {
          uniqueUserCount: { $size: '$uniqueUsers' },
          uniqueIPCount: { $size: '$uniqueIPs' },
          successRate: {
            $multiply: [
              { $divide: ['$successfulActions', '$totalActions'] },
              100
            ]
          }
        }
      }
    ]);

    // Activity by category
    const categoryBreakdown = await AuditLog.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          successCount: {
            $sum: { $cond: [{ $eq: ['$success', true] }, 1, 0] }
          },
          failureCount: {
            $sum: { $cond: [{ $eq: ['$success', false] }, 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Top actions
    const topActions = await AuditLog.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
          successCount: {
            $sum: { $cond: [{ $eq: ['$success', true] }, 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Most active users
    const mostActiveUsers = await AuditLog.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: '$user',
          actionCount: { $sum: 1 },
          lastActivity: { $max: '$createdAt' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          name: '$user.name',
          email: '$user.email',
          role: '$user.role',
          actionCount: 1,
          lastActivity: 1
        }
      },
      { $sort: { actionCount: -1 } },
      { $limit: 10 }
    ]);

    // Security alerts (high severity or failed actions)
    const securityAlerts = await AuditLog.countDocuments({
      createdAt: { $gte: since },
      $or: [
        { severity: { $in: ['high', 'critical'] } },
        { success: false, category: 'security' }
      ]
    });

    const summary = {
      period,
      overall: overallSummary[0] || {
        totalActions: 0,
        successfulActions: 0,
        failedActions: 0,
        uniqueUserCount: 0,
        uniqueIPCount: 0,
        successRate: 0
      },
      categoryBreakdown,
      topActions,
      mostActiveUsers,
      securityAlerts
    };

    res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('Get audit summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate audit summary'
    });
  }
});

// @route   DELETE /api/audit/logs/cleanup
// @desc    Clean up old audit logs
// @access  Private (Super Admin only)
router.delete('/logs/cleanup', [
  authenticate,
  authorize('super_admin'),
  query('days').optional().isInt({ min: 30, max: 365 }).withMessage('Days must be between 30 and 365')
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

    const days = parseInt(req.query.days) || 90; // Default to 90 days
    const cutoffDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));

    // Count logs to be deleted
    const logsToDelete = await AuditLog.countDocuments({
      createdAt: { $lt: cutoffDate },
      severity: { $nin: ['high', 'critical'] } // Keep high/critical severity logs
    });

    // Delete old logs (except high/critical severity)
    const deleteResult = await AuditLog.deleteMany({
      createdAt: { $lt: cutoffDate },
      severity: { $nin: ['high', 'critical'] }
    });

    // Log the cleanup action
    await AuditLog.logAction({
      user: req.user._id,
      action: 'data_export', // Using data_export as closest match for cleanup
      resource: 'system',
      details: {
        action: 'audit_log_cleanup',
        cutoffDate: cutoffDate.toISOString(),
        logsDeleted: deleteResult.deletedCount,
        retentionDays: days
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      severity: 'medium',
      category: 'system'
    });

    res.json({
      success: true,
      message: 'Audit log cleanup completed',
      data: {
        logsDeleted: deleteResult.deletedCount,
        cutoffDate,
        retentionDays: days
      }
    });

  } catch (error) {
    console.error('Audit log cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup audit logs'
    });
  }
});

module.exports = router;