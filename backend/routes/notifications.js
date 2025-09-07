const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { 
  sendNotification, 
  sendBulkNotification, 
  sendRoleBasedNotification,
  sendOverdueTaskReminders,
  subscribeToTopic,
  unsubscribeFromTopic
} = require('../utils/notifications');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

const router = express.Router();

// @route   POST /api/notifications/send
// @desc    Send notification to specific user
// @access  Private (Super Admin, Manager)
router.post('/send', [
  authenticate,
  authorize('super_admin', 'manager'),
  body('userId')
    .isMongoId()
    .withMessage('Invalid user ID'),
  body('title')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters'),
  body('body')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Body must be between 1 and 200 characters'),
  body('type')
    .optional()
    .isIn(['task_assigned', 'task_updated', 'system_notification', 'general'])
    .withMessage('Invalid notification type'),
  body('data')
    .optional()
    .isObject()
    .withMessage('Data must be an object')
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

    const { userId, title, body, type = 'general', data = {} } = req.body;

    // Check if target user exists and is accessible
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Target user not found'
      });
    }

    // Managers can only send notifications to their team members
    if (req.user.role === 'manager') {
      const isTeamMember = targetUser.managerId?.toString() === req.user._id.toString();
      const isSelf = userId === req.user._id.toString();
      
      if (!isTeamMember && !isSelf) {
        return res.status(403).json({
          success: false,
          message: 'You can only send notifications to your team members'
        });
      }
    }

    // Send notification
    const result = await sendNotification({
      userId,
      title,
      body,
      data: {
        ...data,
        type,
        sentBy: req.user.name,
        sentById: req.user._id.toString()
      }
    });

    // Log notification sending
    await AuditLog.logAction({
      user: req.user._id,
      action: 'notification_sent',
      resource: 'notification',
      details: {
        targetUser: targetUser.name,
        title,
        type,
        success: result.success
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      success: result.success,
      category: 'system'
    });

    if (result.success) {
      res.json({
        success: true,
        message: 'Notification sent successfully',
        data: { messageId: result.messageId }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to send notification',
        error: result.error
      });
    }

  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send notification'
    });
  }
});

// @route   POST /api/notifications/broadcast
// @desc    Send notification to multiple users or roles
// @access  Private (Super Admin only)
router.post('/broadcast', [
  authenticate,
  authorize('super_admin'),
  body('title')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters'),
  body('body')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Body must be between 1 and 200 characters'),
  body('type')
    .optional()
    .isIn(['system_notification', 'announcement', 'maintenance', 'general'])
    .withMessage('Invalid notification type'),
  body('targetType')
    .isIn(['users', 'role', 'all'])
    .withMessage('Target type must be users, role, or all'),
  body('targets')
    .optional()
    .isArray()
    .withMessage('Targets must be an array'),
  body('role')
    .optional()
    .isIn(['super_admin', 'manager', 'employee'])
    .withMessage('Invalid role')
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

    const { title, body, type = 'general', targetType, targets, role, data = {} } = req.body;

    let result;
    const notificationData = {
      title,
      body,
      data: {
        ...data,
        type,
        sentBy: req.user.name,
        sentById: req.user._id.toString(),
        broadcast: true
      }
    };

    switch (targetType) {
      case 'users':
        if (!targets || targets.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'User targets are required'
          });
        }
        result = await sendBulkNotification(targets, notificationData);
        break;

      case 'role':
        if (!role) {
          return res.status(400).json({
            success: false,
            message: 'Role is required for role-based broadcast'
          });
        }
        result = await sendRoleBasedNotification(role, notificationData);
        break;

      case 'all':
        const allUsers = await User.find({ 
          isActive: true, 
          fcmToken: { $exists: true, $ne: null } 
        }).select('_id');
        const allUserIds = allUsers.map(user => user._id);
        result = await sendBulkNotification(allUserIds, notificationData);
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid target type'
        });
    }

    // Log broadcast notification
    await AuditLog.logAction({
      user: req.user._id,
      action: 'notification_sent',
      resource: 'notification',
      details: {
        broadcast: true,
        targetType,
        targets: targetType === 'users' ? targets : undefined,
        role: targetType === 'role' ? role : undefined,
        title,
        type,
        totalSent: result.totalSent,
        totalFailed: result.totalFailed
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      success: result.success,
      severity: 'medium',
      category: 'system'
    });

    res.json({
      success: true,
      message: 'Broadcast notification completed',
      data: {
        totalSent: result.totalSent,
        totalFailed: result.totalFailed
      }
    });

  } catch (error) {
    console.error('Broadcast notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send broadcast notification'
    });
  }
});

// @route   POST /api/notifications/reminders/overdue
// @desc    Send reminders for overdue tasks
// @access  Private (Super Admin, Manager)
router.post('/reminders/overdue', [
  authenticate,
  authorize('super_admin', 'manager')
], async (req, res) => {
  try {
    const result = await sendOverdueTaskReminders();

    // Log reminder sending
    await AuditLog.logAction({
      user: req.user._id,
      action: 'notification_sent',
      resource: 'notification',
      details: {
        type: 'overdue_reminders',
        totalSent: result.totalSent,
        totalTasks: result.totalTasks
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      success: result.success,
      category: 'system'
    });

    if (result.success) {
      res.json({
        success: true,
        message: 'Overdue task reminders sent',
        data: {
          totalSent: result.totalSent,
          totalTasks: result.totalTasks
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to send overdue reminders',
        error: result.error
      });
    }

  } catch (error) {
    console.error('Send overdue reminders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send overdue reminders'
    });
  }
});

// @route   PUT /api/notifications/settings
// @desc    Update user notification settings
// @access  Private
router.put('/settings', [
  authenticate,
  body('taskAssignments')
    .optional()
    .isBoolean()
    .withMessage('taskAssignments must be a boolean'),
  body('taskUpdates')
    .optional()
    .isBoolean()
    .withMessage('taskUpdates must be a boolean'),
  body('taskApprovals')
    .optional()
    .isBoolean()
    .withMessage('taskApprovals must be a boolean'),
  body('systemNotifications')
    .optional()
    .isBoolean()
    .withMessage('systemNotifications must be a boolean')
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

    const { taskAssignments, taskUpdates, taskApprovals, systemNotifications } = req.body;

    const updateData = {};
    if (taskAssignments !== undefined) updateData['notificationSettings.taskAssignments'] = taskAssignments;
    if (taskUpdates !== undefined) updateData['notificationSettings.taskUpdates'] = taskUpdates;
    if (taskApprovals !== undefined) updateData['notificationSettings.taskApprovals'] = taskApprovals;
    if (systemNotifications !== undefined) updateData['notificationSettings.systemNotifications'] = systemNotifications;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { new: true }
    );

    // Log settings change
    await AuditLog.logAction({
      user: req.user._id,
      action: 'settings_changed',
      resource: 'user',
      resourceId: req.user._id,
      details: {
        settingsChanged: Object.keys(updateData),
        newSettings: user.notificationSettings
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      category: 'user_action'
    });

    res.json({
      success: true,
      message: 'Notification settings updated successfully',
      data: {
        notificationSettings: user.notificationSettings
      }
    });

  } catch (error) {
    console.error('Update notification settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification settings'
    });
  }
});

// @route   GET /api/notifications/settings
// @desc    Get user notification settings
// @access  Private
router.get('/settings', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notificationSettings');

    res.json({
      success: true,
      data: {
        notificationSettings: user.notificationSettings
      }
    });

  } catch (error) {
    console.error('Get notification settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notification settings'
    });
  }
});

// @route   POST /api/notifications/topics/subscribe
// @desc    Subscribe to notification topic
// @access  Private
router.post('/topics/subscribe', [
  authenticate,
  body('topic')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Topic must be between 1 and 50 characters')
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

    const { topic } = req.body;

    const result = await subscribeToTopic(req.user._id, topic);

    if (result.success) {
      res.json({
        success: true,
        message: `Subscribed to topic: ${topic}`
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to subscribe to topic',
        error: result.error
      });
    }

  } catch (error) {
    console.error('Subscribe to topic error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to subscribe to topic'
    });
  }
});

// @route   POST /api/notifications/topics/unsubscribe
// @desc    Unsubscribe from notification topic
// @access  Private
router.post('/topics/unsubscribe', [
  authenticate,
  body('topic')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Topic must be between 1 and 50 characters')
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

    const { topic } = req.body;

    const result = await unsubscribeFromTopic(req.user._id, topic);

    if (result.success) {
      res.json({
        success: true,
        message: `Unsubscribed from topic: ${topic}`
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to unsubscribe from topic',
        error: result.error
      });
    }

  } catch (error) {
    console.error('Unsubscribe from topic error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unsubscribe from topic'
    });
  }
});

// @route   GET /api/notifications/test
// @desc    Test notification system
// @access  Private (Super Admin only)
router.get('/test', [
  authenticate,
  authorize('super_admin')
], async (req, res) => {
  try {
    const result = await sendNotification({
      userId: req.user._id,
      title: 'Test Notification',
      body: 'This is a test notification from the Task Management System',
      data: {
        type: 'system_test',
        timestamp: new Date().toISOString()
      }
    });

    res.json({
      success: true,
      message: 'Test notification sent',
      data: result
    });

  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test notification'
    });
  }
});

module.exports = router;