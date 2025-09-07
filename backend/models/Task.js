const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Task description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'approved', 'rejected'],
    default: 'pending'
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  deadline: {
    type: Date,
    required: [true, 'Deadline is required']
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true,
      maxlength: [500, 'Comment cannot exceed 500 characters']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  attachments: [{
    filename: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    mimetype: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    url: {
      type: String,
      required: true
    }
  }],
  tags: [{
    type: String,
    trim: true
  }],
  estimatedHours: {
    type: Number,
    min: 0,
    default: null
  },
  actualHours: {
    type: Number,
    min: 0,
    default: null
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  reminderSent: {
    type: Boolean,
    default: false
  },
  lastReminderAt: {
    type: Date,
    default: null
  },
  statusHistory: [{
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'approved', 'rejected'],
      required: true
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    comment: {
      type: String,
      maxlength: [200, 'Status comment cannot exceed 200 characters']
    }
  }],
  rejectionReason: {
    type: String,
    maxlength: [500, 'Rejection reason cannot exceed 500 characters'],
    default: null
  }
}, {
  timestamps: true
});

// Virtual for checking if task is overdue
taskSchema.virtual('isOverdue').get(function() {
  return this.deadline < new Date() && this.status !== 'completed' && this.status !== 'approved';
});

// Virtual for calculating days until deadline
taskSchema.virtual('daysUntilDeadline').get(function() {
  const now = new Date();
  const deadline = new Date(this.deadline);
  const diffTime = deadline - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Pre-save middleware to update status history
taskSchema.pre('save', function(next) {
  if (this.isModified('status') && !this.isNew) {
    this.statusHistory.push({
      status: this.status,
      changedBy: this._statusChangedBy || this.assignedBy,
      changedAt: new Date(),
      comment: this._statusChangeComment || null
    });
  }
  
  // Set completion date when status changes to completed
  if (this.isModified('status') && this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  }
  
  // Set approval date when status changes to approved
  if (this.isModified('status') && this.status === 'approved' && !this.approvedAt) {
    this.approvedAt = new Date();
  }
  
  next();
});

// Method to add comment
taskSchema.methods.addComment = function(userId, text) {
  this.comments.push({
    user: userId,
    text: text,
    createdAt: new Date()
  });
  return this.save();
};

// Method to add attachment
taskSchema.methods.addAttachment = function(attachmentData) {
  this.attachments.push(attachmentData);
  return this.save();
};

// Method to update status with history
taskSchema.methods.updateStatus = function(newStatus, changedBy, comment = null) {
  this._statusChangedBy = changedBy;
  this._statusChangeComment = comment;
  this.status = newStatus;
  
  if (newStatus === 'approved') {
    this.approvedBy = changedBy;
    this.approvedAt = new Date();
  }
  
  return this.save();
};

// Static method to get tasks by user role
taskSchema.statics.getTasksByRole = function(userId, userRole) {
  let query = {};
  
  switch (userRole) {
    case 'super_admin':
      // Super admin can see all tasks
      query = {};
      break;
    case 'manager':
      // Manager can see tasks assigned to them or their team members
      query = {
        $or: [
          { assignedTo: userId },
          { assignedBy: userId }
        ]
      };
      break;
    case 'employee':
      // Employee can only see tasks assigned to them
      query = { assignedTo: userId };
      break;
    default:
      query = { assignedTo: userId };
  }
  
  return this.find(query)
    .populate('assignedBy', 'name email role')
    .populate('assignedTo', 'name email role')
    .populate('approvedBy', 'name email role')
    .populate('comments.user', 'name email')
    .populate('attachments.uploadedBy', 'name email')
    .sort({ createdAt: -1 });
};

// Indexes for better query performance
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ assignedBy: 1 });
taskSchema.index({ deadline: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ createdAt: -1 });
taskSchema.index({ isArchived: 1 });

module.exports = mongoose.model('Task', taskSchema);