const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: [true, 'Action is required'],
    enum: [
      'login',
      'logout',
      'failed_login',
      'password_change',
      'user_created',
      'user_updated',
      'user_deleted',
      'task_created',
      'task_updated',
      'task_deleted',
      'task_assigned',
      'task_completed',
      'task_approved',
      'task_rejected',
      'comment_added',
      'attachment_uploaded',
      'notification_sent',
      'report_generated',
      'role_changed',
      'team_updated',
      'settings_changed',
      'data_export',
      'system_access'
    ]
  },
  resource: {
    type: String,
    required: true,
    enum: ['user', 'task', 'notification', 'report', 'system', 'auth']
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    default: null
  },
  sessionId: {
    type: String,
    default: null
  },
  success: {
    type: Boolean,
    default: true
  },
  errorMessage: {
    type: String,
    default: null
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },
  category: {
    type: String,
    enum: ['security', 'data', 'system', 'user_action'],
    default: 'user_action'
  },
  metadata: {
    browser: String,
    os: String,
    device: String,
    location: {
      country: String,
      city: String,
      coordinates: {
        lat: Number,
        lng: Number
      }
    }
  }
}, {
  timestamps: true
});

// Static method to log an action
auditLogSchema.statics.logAction = async function(logData) {
  try {
    const auditLog = new this(logData);
    await auditLog.save();
    return auditLog;
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw error to prevent breaking the main functionality
    return null;
  }
};

// Static method to get logs by user
auditLogSchema.statics.getLogsByUser = function(userId, limit = 50) {
  return this.find({ user: userId })
    .populate('user', 'name email role')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get logs by action
auditLogSchema.statics.getLogsByAction = function(action, limit = 100) {
  return this.find({ action })
    .populate('user', 'name email role')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get security-related logs
auditLogSchema.statics.getSecurityLogs = function(limit = 100) {
  return this.find({
    $or: [
      { category: 'security' },
      { action: { $in: ['login', 'logout', 'failed_login', 'password_change'] } },
      { success: false }
    ]
  })
    .populate('user', 'name email role')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get failed login attempts
auditLogSchema.statics.getFailedLogins = function(timeframe = 24) {
  const since = new Date(Date.now() - (timeframe * 60 * 60 * 1000));
  return this.find({
    action: 'failed_login',
    createdAt: { $gte: since }
  })
    .populate('user', 'name email role')
    .sort({ createdAt: -1 });
};

// Static method to get activity summary
auditLogSchema.statics.getActivitySummary = async function(timeframe = 24) {
  const since = new Date(Date.now() - (timeframe * 60 * 60 * 1000));
  
  const summary = await this.aggregate([
    { $match: { createdAt: { $gte: since } } },
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
  
  return summary;
};

// Static method to get user activity report
auditLogSchema.statics.getUserActivityReport = async function(userId, days = 30) {
  const since = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
  
  const report = await this.aggregate([
    { 
      $match: { 
        user: mongoose.Types.ObjectId(userId),
        createdAt: { $gte: since }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          action: '$action'
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.date',
        actions: {
          $push: {
            action: '$_id.action',
            count: '$count'
          }
        },
        totalActions: { $sum: '$count' }
      }
    },
    { $sort: { _id: -1 } }
  ]);
  
  return report;
};

// Method to format log for display
auditLogSchema.methods.getDisplayMessage = function() {
  const actionMessages = {
    'login': 'User logged in',
    'logout': 'User logged out',
    'failed_login': 'Failed login attempt',
    'password_change': 'Password changed',
    'user_created': 'User account created',
    'user_updated': 'User account updated',
    'user_deleted': 'User account deleted',
    'task_created': 'Task created',
    'task_updated': 'Task updated',
    'task_deleted': 'Task deleted',
    'task_assigned': 'Task assigned',
    'task_completed': 'Task completed',
    'task_approved': 'Task approved',
    'task_rejected': 'Task rejected',
    'comment_added': 'Comment added to task',
    'attachment_uploaded': 'File attachment uploaded',
    'notification_sent': 'Notification sent',
    'report_generated': 'Report generated',
    'role_changed': 'User role changed',
    'team_updated': 'Team membership updated',
    'settings_changed': 'Settings modified',
    'data_export': 'Data exported',
    'system_access': 'System accessed'
  };
  
  return actionMessages[this.action] || this.action;
};

// Indexes for better query performance
auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, createdAt: -1 });
auditLogSchema.index({ category: 1, createdAt: -1 });
auditLogSchema.index({ success: 1, createdAt: -1 });
auditLogSchema.index({ severity: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ ipAddress: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);