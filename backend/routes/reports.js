const express = require('express');
const { query, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const User = require('../models/User');
const Task = require('../models/Task');
const AuditLog = require('../models/AuditLog');

const router = express.Router();

// @route   GET /api/reports/dashboard
// @desc    Get dashboard statistics
// @access  Private
router.get('/dashboard', [
  authenticate,
  query('period').optional().isIn(['7d', '30d', '90d', '1y']).withMessage('Invalid period')
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

    const period = req.query.period || '30d';
    const periodDays = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    };

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays[period]);

    let taskQuery = { createdAt: { $gte: startDate } };
    let userQuery = {};

    // Role-based filtering
    switch (req.user.role) {
      case 'super_admin':
        // Super admin can see all data
        break;
      case 'manager':
        // Manager can see their team's data
        const teamMembers = await User.find({ managerId: req.user._id }).select('_id');
        const teamMemberIds = teamMembers.map(member => member._id);
        taskQuery.$or = [
          { assignedTo: req.user._id },
          { assignedBy: req.user._id },
          { assignedTo: { $in: teamMemberIds } }
        ];
        userQuery = { 
          $or: [
            { _id: req.user._id },
            { managerId: req.user._id }
          ]
        };
        break;
      case 'employee':
        // Employee can only see their own data
        taskQuery.assignedTo = req.user._id;
        userQuery._id = req.user._id;
        break;
    }

    // Get task statistics
const taskStats = await Task.aggregate([
  { $match: taskQuery },
  {
    $group: {
      _id: '$status',
      count: { $sum: 1 },
      avgCompletionTime: {
        $avg: {
          $cond: [
            { $in: ['$status', ['completed', 'approved']] }, // completed ya approved tasks
            { $subtract: ['$completedAt', '$createdAt'] },
            null
          ]
        }
      },
      overdueCount: {
        $sum: {
          $cond: [
            {
              $and: [
                { $lt: ['$deadline', new Date()] },
                { $not: { $in: ['$status', ['completed', 'approved']] } } // MongoDB 6+ compatible
              ]
            },
            1,
            0
          ]
        }
      }
    }
  }
]);


    // Get priority distribution
    const priorityStats = await Task.aggregate([
      { $match: taskQuery },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get overdue tasks count
const overdueCount = await Task.countDocuments({
  ...taskQuery,
  deadline: { $lt: new Date() },
  status: { $not: { $in: ['completed', 'approved'] } } // ✅ replace $nin
});

    // Get completion rate over time
    const completionTrend = await Task.aggregate([
      { $match: taskQuery },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          statuses: {
            $push: {
              status: '$_id.status',
              count: '$count'
            }
          },
          totalTasks: { $sum: '$count' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get user activity (for managers and super admins)
    let userActivity = [];
    if (req.user.role !== 'employee') {
      userActivity = await Task.aggregate([
        { $match: taskQuery },
        {
          $group: {
            _id: '$assignedTo',
            totalTasks: { $sum: 1 },
            completedTasks: {
              $sum: { $cond: [{ $in: ['$status', ['completed', 'approved']] }, 1, 0] }
            },
            overdueTasks: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $lt: ['$deadline', new Date()] },
                    { $not: { $in: ['$status', ['completed', 'approved']] } }
                    ]
                  },
                  1,
                  0
                ]
              }
            }
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
            totalTasks: 1,
            completedTasks: 1,
            overdueTasks: 1,
            completionRate: {
              $cond: [
                { $gt: ['$totalTasks', 0] },
                { $multiply: [{ $divide: ['$completedTasks', '$totalTasks'] }, 100] },
                0
              ]
            }
          }
        },
        { $sort: { completionRate: -1 } }
      ]);
    }

    // Get total users count (for super admin and managers)
    let totalUsers = 0;
    if (req.user.role !== 'employee') {
      totalUsers = await User.countDocuments(userQuery);
    }

    // Format response
    const dashboard = {
      period,
      summary: {
        totalTasks: taskStats.reduce((sum, stat) => sum + stat.count, 0),
        totalUsers,
        overdueCount,
        avgCompletionTime: taskStats.find(s => s._id === 'completed')?.avgCompletionTime || 0
      },
      tasksByStatus: taskStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
      tasksByPriority: priorityStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
      completionTrend,
      userActivity: req.user.role !== 'employee' ? userActivity : []
    };

    // Log report generation
    await AuditLog.logAction({
      user: req.user._id,
      action: 'report_generated',
      resource: 'report',
      details: {
        reportType: 'dashboard',
        period,
        totalTasks: dashboard.summary.totalTasks
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      category: 'data'
    });

    res.json({
      success: true,
      data: dashboard
    });

  } catch (error) {
    console.error('Dashboard report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate dashboard report'
    });
  }
});

// @route   GET /api/reports/tasks
// @desc    Get detailed task report
// @access  Private
router.get('/tasks', [
  authenticate,
  query('startDate').optional().isISO8601().withMessage('Invalid start date'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date'),
  query('status').optional().isIn(['pending', 'in_progress', 'completed', 'approved', 'rejected']).withMessage('Invalid status'),
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
  query('assignedTo').optional().isMongoId().withMessage('Invalid assignedTo ID'),
  query('format').optional().isIn(['json', 'csv']).withMessage('Invalid format')
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

    const {
      startDate,
      endDate,
      status,
      priority,
      assignedTo,
      format = 'json'
    } = req.query;

    let query = {};

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Role-based filtering
    switch (req.user.role) {
      case 'super_admin':
        // Super admin can see all tasks
        break;
      case 'manager':
        // Manager can see their team's tasks
        const teamMembers = await User.find({ managerId: req.user._id }).select('_id');
        const teamMemberIds = teamMembers.map(member => member._id);
        query.$or = [
          { assignedTo: req.user._id },
          { assignedBy: req.user._id },
          { assignedTo: { $in: teamMemberIds } }
        ];
        break;
      case 'employee':
        // Employee can only see their own tasks
        query.assignedTo = req.user._id;
        break;
    }

    // Additional filters
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;

    const tasks = await Task.find(query)
      .populate('assignedBy', 'name email role')
      .populate('assignedTo', 'name email role')
      .populate('approvedBy', 'name email role')
      .sort({ createdAt: -1 });

    // Calculate statistics
    const stats = {
      total: tasks.length,
      byStatus: {},
      byPriority: {},
      overdue: 0,
      avgCompletionTime: 0,
      completionRate: 0
    };

    let totalCompletionTime = 0;
    let completedCount = 0;

    tasks.forEach(task => {
      // Status distribution
      stats.byStatus[task.status] = (stats.byStatus[task.status] || 0) + 1;
      
      // Priority distribution
      stats.byPriority[task.priority] = (stats.byPriority[task.priority] || 0) + 1;
      
      // Overdue count
      if (task.deadline < new Date() && !['completed', 'approved'].includes(task.status)) {
        stats.overdue++;
      }
      
      // Completion time calculation
      if (task.completedAt && task.createdAt) {
        totalCompletionTime += (task.completedAt - task.createdAt);
        completedCount++;
      }
    });

    if (completedCount > 0) {
      stats.avgCompletionTime = totalCompletionTime / completedCount;
      stats.completionRate = (completedCount / tasks.length) * 100;
    }

    // Log report generation
    await AuditLog.logAction({
      user: req.user._id,
      action: 'report_generated',
      resource: 'report',
      details: {
        reportType: 'tasks',
        filters: { startDate, endDate, status, priority, assignedTo },
        totalTasks: tasks.length,
        format
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      category: 'data'
    });

    if (format === 'csv') {
      // Generate CSV format
      const csvHeaders = [
        'ID', 'Title', 'Description', 'Status', 'Priority', 
        'Assigned By', 'Assigned To', 'Created Date', 'Deadline', 
        'Completed Date', 'Approved By', 'Overdue'
      ];

      const csvRows = tasks.map(task => [
        task._id,
        `"${task.title.replace(/"/g, '""')}"`,
        `"${task.description.replace(/"/g, '""')}"`,
        task.status,
        task.priority,
        task.assignedBy.name,
        task.assignedTo.name,
        task.createdAt.toISOString(),
        task.deadline.toISOString(),
        task.completedAt ? task.completedAt.toISOString() : '',
        task.approvedBy ? task.approvedBy.name : '',
        task.isOverdue ? 'Yes' : 'No'
      ]);

      const csvContent = [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="tasks-report-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);
    } else {
      res.json({
        success: true,
        data: {
          tasks,
          statistics: stats,
          filters: { startDate, endDate, status, priority, assignedTo }
        }
      });
    }

  } catch (error) {
    console.error('Task report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate task report'
    });
  }
});

// @route   GET /api/reports/users
// @desc    Get user performance report
// @access  Private (Super Admin, Manager)
router.get('/users', [
  authenticate,
  authorize('super_admin', 'manager'),
  query('startDate').optional().isISO8601().withMessage('Invalid start date'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date'),
  query('userId').optional().isMongoId().withMessage('Invalid user ID')
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

    const { startDate, endDate, userId } = req.query;

    let userQuery = { isActive: true };
    let taskQuery = {};

    // Date range filter
    if (startDate || endDate) {
      taskQuery.createdAt = {};
      if (startDate) taskQuery.createdAt.$gte = new Date(startDate);
      if (endDate) taskQuery.createdAt.$lte = new Date(endDate);
    }

    // Role-based filtering
    if (req.user.role === 'manager') {
      userQuery = {
        $or: [
          { _id: req.user._id },
          { managerId: req.user._id }
        ]
      };
    }

    // Specific user filter
    if (userId) {
      userQuery._id = userId;
    }

    const userPerformance = await User.aggregate([
      { $match: userQuery },
      {
        $lookup: {
          from: 'tasks',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$assignedTo', '$$userId'] },
                ...taskQuery
              }
            }
          ],
          as: 'tasks'
        }
      },
      {
        $addFields: {
          totalTasks: { $size: '$tasks' },
          completedTasks: {
            $size: {
              $filter: {
                input: '$tasks',
                cond: { $in: ['$$this.status', ['completed', 'approved']] }
              }
            }
          },
          pendingTasks: {
            $size: {
              $filter: {
                input: '$tasks',
                cond: { $eq: ['$$this.status', 'pending'] }
              }
            }
          },
          inProgressTasks: {
            $size: {
              $filter: {
                input: '$tasks',
                cond: { $eq: ['$$this.status', 'in_progress'] }
              }
            }
          },
          overdueTasks: {
            $size: {
              $filter: {
                input: '$tasks',
                cond: {
                  $and: [
                    { $lt: ['$$this.deadline', new Date()] },
                
                    { $not: { $in: ['$$this.status', ['completed', 'approved']] } }
                  ]
                }
              }
            }
          },
          avgCompletionTime: {
            $avg: {
              $map: {
                input: {
                  $filter: {
                    input: '$tasks',
                    cond: { $ne: ['$$this.completedAt', null] }
                  }
                },
                as: 'task',
                in: { $subtract: ['$$task.completedAt', '$$task.createdAt'] }
              }
            }
          }
        }
      },
      {
        $addFields: {
          completionRate: {
            $cond: [
              { $gt: ['$totalTasks', 0] },
              { $multiply: [{ $divide: ['$completedTasks', '$totalTasks'] }, 100] },
              0
            ]
          },
          overdueRate: {
            $cond: [
              { $gt: ['$totalTasks', 0] },
              { $multiply: [{ $divide: ['$overdueTasks', '$totalTasks'] }, 100] },
              0
            ]
          }
        }
      },
      {
        $project: {
          name: 1,
          email: 1,
          role: 1,
          department: 1,
          totalTasks: 1,
          completedTasks: 1,
          pendingTasks: 1,
          inProgressTasks: 1,
          overdueTasks: 1,
          completionRate: 1,
          overdueRate: 1,
          avgCompletionTime: 1,
          lastLogin: 1
        }
      },
      { $sort: { completionRate: -1 } }
    ]);

    // Log report generation
    await AuditLog.logAction({
      user: req.user._id,
      action: 'report_generated',
      resource: 'report',
      details: {
        reportType: 'users',
        filters: { startDate, endDate, userId },
        totalUsers: userPerformance.length
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      category: 'data'
    });

    res.json({
      success: true,
      data: {
        users: userPerformance,
        filters: { startDate, endDate, userId }
      }
    });

  } catch (error) {
    console.error('User report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate user report'
    });
  }
});

// @route   GET /api/reports/analytics
// @desc    Get advanced analytics
// @access  Private (Super Admin, Manager)
router.get('/analytics', [
  authenticate,
  authorize('super_admin', 'manager'),
  query('period').optional().isIn(['7d', '30d', '90d', '1y']).withMessage('Invalid period')
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

    const period = req.query.period || '30d';
    const periodDays = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    };

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays[period]);

    let taskQuery = { createdAt: { $gte: startDate } };

    // Role-based filtering
    if (req.user.role === 'manager') {
      const teamMembers = await User.find({ managerId: req.user._id }).select('_id');
      const teamMemberIds = teamMembers.map(member => member._id);
      taskQuery.$or = [
        { assignedTo: req.user._id },
        { assignedBy: req.user._id },
        { assignedTo: { $in: teamMemberIds } }
      ];
    }

    // Task creation trend
    const creationTrend = await Task.aggregate([
      { $match: taskQuery },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Task completion trend
    const completionTrend = await Task.aggregate([
      { 
        $match: { 
          ...taskQuery,
          completedAt: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Average completion time by priority
    const completionTimeByPriority = await Task.aggregate([
      { 
        $match: { 
          ...taskQuery,
          completedAt: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$priority',
          avgTime: { $avg: { $subtract: ['$completedAt', '$createdAt'] } },
          count: { $sum: 1 }
        }
      }
    ]);

    // Task distribution by department (if available)
    const departmentStats = await Task.aggregate([
      { $match: taskQuery },
      {
        $lookup: {
          from: 'users',
          localField: 'assignedTo',
          foreignField: '_id',
          as: 'assignee'
        }
      },
      { $unwind: '$assignee' },
      {
        $group: {
          _id: '$assignee.department',
          totalTasks: { $sum: 1 },
          completedTasks: {
            $sum: { $cond: [{ $in: ['$status', ['completed', 'approved']] }, 1, 0] }
          }
        }
      },
      {
        $addFields: {
          completionRate: {
            $cond: [
              { $gt: ['$totalTasks', 0] },
              { $multiply: [{ $divide: ['$completedTasks', '$totalTasks'] }, 100] },
              0
            ]
          }
        }
      }
    ]);

    // Workload distribution
    const workloadDistribution = await Task.aggregate([
      { $match: taskQuery },
      {
        $group: {
          _id: '$assignedTo',
          taskCount: { $sum: 1 },
          avgPriority: {
            $avg: {
              $switch: {
                branches: [
                  { case: { $eq: ['$priority', 'low'] }, then: 1 },
                  { case: { $eq: ['$priority', 'medium'] }, then: 2 },
                  { case: { $eq: ['$priority', 'high'] }, then: 3 },
                  { case: { $eq: ['$priority', 'urgent'] }, then: 4 }
                ],
                default: 2
              }
            }
          }
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
          taskCount: 1,
          avgPriority: 1,
          workloadScore: { $multiply: ['$taskCount', '$avgPriority'] }
        }
      },
      { $sort: { workloadScore: -1 } }
    ]);

    const analytics = {
      period,
      trends: {
        taskCreation: creationTrend,
        taskCompletion: completionTrend
      },
      performance: {
        completionTimeByPriority,
        departmentStats: departmentStats.filter(d => d._id), // Remove null departments
        workloadDistribution
      }
    };

    // Log analytics generation
    await AuditLog.logAction({
      user: req.user._id,
      action: 'report_generated',
      resource: 'report',
      details: {
        reportType: 'analytics',
        period
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      category: 'data'
    });

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Analytics report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate analytics report'
    });
  }
});

module.exports = router;