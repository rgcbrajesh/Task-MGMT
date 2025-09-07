const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

// Use existing Firebase Admin SDK instance
const { admin } = require('./firebase');
const firebaseApp = admin;

/**
 * Send push notification to a user
 * @param {Object} options - Notification options
 * @param {string} options.userId - Target user ID
 * @param {string} options.title - Notification title
 * @param {string} options.body - Notification body
 * @param {Object} options.data - Additional data payload
 * @param {string} options.icon - Notification icon URL
 * @param {string} options.clickAction - Action when notification is clicked
 */
const sendNotification = async (options) => {
  try {
    if (!firebaseApp) {
      console.warn('Firebase not initialized. Skipping notification.');
      return { success: false, error: 'Firebase not configured' };
    }

    const { userId, title, body, data = {}, icon, clickAction } = options;

    // Get user's FCM token
    const user = await User.findById(userId);
    if (!user || !user.fcmToken) {
      console.warn(`No FCM token found for user ${userId}`);
      return { success: false, error: 'No FCM token' };
    }

    // Check user's notification settings
    const notificationType = data.type;
    if (notificationType && user.notificationSettings) {
      const settingKey = getNotificationSettingKey(notificationType);
      if (settingKey && !user.notificationSettings[settingKey]) {
        console.log(`User ${userId} has disabled ${settingKey} notifications`);
        return { success: false, error: 'Notifications disabled by user' };
      }
    }

    // Prepare notification payload
    const message = {
      token: user.fcmToken,
      notification: {
        title,
        body,
        icon: icon || '/icons/app-icon-192.png'
      },
      data: {
        ...data,
        timestamp: Date.now().toString(),
        userId: userId.toString()
      },
      android: {
        notification: {
          channelId: 'task_management',
          priority: 'high',
          defaultSound: true,
          defaultVibrateTimings: true,
          clickAction: clickAction || 'FLUTTER_NOTIFICATION_CLICK'
        },
        data: {
          ...data,
          timestamp: Date.now().toString()
        }
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title,
              body
            },
            badge: 1,
            sound: 'default',
            category: 'TASK_MANAGEMENT'
          }
        },
        fcmOptions: {
          imageUrl: icon
        }
      },
      webpush: {
        notification: {
          title,
          body,
          icon: icon || '/icons/app-icon-192.png',
          badge: '/icons/badge-icon.png',
          tag: data.type || 'general',
          requireInteraction: data.type === 'urgent',
          actions: getNotificationActions(data.type)
        },
        fcmOptions: {
          link: clickAction || '/'
        }
      }
    };

    // Send notification
    const response = await admin.messaging().send(message);
    
    // Log successful notification
    await AuditLog.logAction({
      user: userId,
      action: 'notification_sent',
      resource: 'notification',
      details: {
        title,
        type: data.type || 'general',
        messageId: response
      },
      ipAddress: '127.0.0.1', // Server-side action
      userAgent: 'Firebase Admin SDK',
      category: 'system'
    });

    console.log(`Notification sent successfully to user ${userId}:`, response);
    return { success: true, messageId: response };

  } catch (error) {
    console.error('Failed to send notification:', error);
    
    // Handle invalid FCM token
    if (error.code === 'messaging/invalid-registration-token' || 
        error.code === 'messaging/registration-token-not-registered') {
      // Remove invalid FCM token
      await User.findByIdAndUpdate(userId, { $unset: { fcmToken: 1 } });
      console.log(`Removed invalid FCM token for user ${userId}`);
    }

    // Log failed notification
    await AuditLog.logAction({
      user: userId,
      action: 'notification_sent',
      resource: 'notification',
      details: {
        title: options.title,
        type: options.data?.type || 'general',
        error: error.message
      },
      ipAddress: '127.0.0.1',
      userAgent: 'Firebase Admin SDK',
      success: false,
      category: 'system'
    });

    return { success: false, error: error.message };
  }
};

/**
 * Send notification to multiple users
 * @param {Array} userIds - Array of user IDs
 * @param {Object} notificationData - Notification data
 */
const sendBulkNotification = async (userIds, notificationData) => {
  try {
    if (!firebaseApp) {
      console.warn('Firebase not initialized. Skipping bulk notification.');
      return { success: false, error: 'Firebase not configured' };
    }

    const results = [];
    
    // Send notifications in batches to avoid rate limiting
    const batchSize = 100;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      const batchPromises = batch.map(userId => 
        sendNotification({ ...notificationData, userId })
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults);
    }

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failureCount = results.length - successCount;

    console.log(`Bulk notification completed: ${successCount} sent, ${failureCount} failed`);
    
    return {
      success: true,
      totalSent: successCount,
      totalFailed: failureCount,
      results
    };

  } catch (error) {
    console.error('Failed to send bulk notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send notification to all users with a specific role
 * @param {string} role - User role (super_admin, manager, employee)
 * @param {Object} notificationData - Notification data
 */
const sendRoleBasedNotification = async (role, notificationData) => {
  try {
    const users = await User.find({ 
      role, 
      isActive: true, 
      fcmToken: { $exists: true, $ne: null } 
    }).select('_id');

    const userIds = users.map(user => user._id);
    
    if (userIds.length === 0) {
      console.log(`No active users found with role: ${role}`);
      return { success: true, totalSent: 0, totalFailed: 0 };
    }

    return await sendBulkNotification(userIds, notificationData);

  } catch (error) {
    console.error('Failed to send role-based notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send reminder notifications for overdue tasks
 */
const sendOverdueTaskReminders = async () => {
  try {
    const Task = require('../models/Task');
    
    // Find overdue tasks that haven't been reminded recently
    const overdueDate = new Date();
    const reminderCooldown = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    const overdueTasks = await Task.find({
      deadline: { $lt: overdueDate },
      status: { $in: ['pending', 'in_progress'] },
      isArchived: false,
      $or: [
        { reminderSent: false },
        { lastReminderAt: { $lt: reminderCooldown } }
      ]
    }).populate('assignedTo', 'name email fcmToken')
      .populate('assignedBy', 'name email');

    console.log(`Found ${overdueTasks.length} overdue tasks for reminders`);

    const results = [];
    for (const task of overdueTasks) {
      if (task.assignedTo && task.assignedTo.fcmToken) {
        const daysOverdue = Math.ceil((overdueDate - task.deadline) / (1000 * 60 * 60 * 24));
        
        const result = await sendNotification({
          userId: task.assignedTo._id,
          title: 'Task Overdue',
          body: `Task "${task.title}" is ${daysOverdue} day(s) overdue`,
          data: {
            type: 'task_overdue',
            taskId: task._id.toString(),
            daysOverdue: daysOverdue.toString()
          }
        });

        results.push(result);

        // Update reminder status
        task.reminderSent = true;
        task.lastReminderAt = new Date();
        await task.save();
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Sent ${successCount} overdue task reminders`);

    return { success: true, totalSent: successCount, totalTasks: overdueTasks.length };

  } catch (error) {
    console.error('Failed to send overdue task reminders:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get notification setting key based on notification type
 * @param {string} type - Notification type
 * @returns {string} - Setting key
 */
const getNotificationSettingKey = (type) => {
  const typeMapping = {
    'task_assigned': 'taskAssignments',
    'task_started': 'taskUpdates',
    'task_completed': 'taskUpdates',
    'task_approved': 'taskApprovals',
    'task_rejected': 'taskApprovals',
    'comment_added': 'taskUpdates',
    'attachment_uploaded': 'taskUpdates',
    'task_overdue': 'taskUpdates',
    'system_notification': 'systemNotifications'
  };

  return typeMapping[type] || 'systemNotifications';
};

/**
 * Get notification actions based on type
 * @param {string} type - Notification type
 * @returns {Array} - Array of notification actions
 */
const getNotificationActions = (type) => {
  const actionMapping = {
    'task_assigned': [
      { action: 'view', title: 'View Task' },
      { action: 'accept', title: 'Accept' }
    ],
    'task_completed': [
      { action: 'review', title: 'Review' },
      { action: 'approve', title: 'Approve' }
    ],
    'task_overdue': [
      { action: 'view', title: 'View Task' },
      { action: 'update', title: 'Update Status' }
    ]
  };

  return actionMapping[type] || [{ action: 'view', title: 'View' }];
};

/**
 * Subscribe user to topic for broadcast notifications
 * @param {string} userId - User ID
 * @param {string} topic - Topic name
 */
const subscribeToTopic = async (userId, topic) => {
  try {
    if (!firebaseApp) {
      return { success: false, error: 'Firebase not configured' };
    }

    const user = await User.findById(userId);
    if (!user || !user.fcmToken) {
      return { success: false, error: 'No FCM token found' };
    }

    await admin.messaging().subscribeToTopic([user.fcmToken], topic);
    console.log(`User ${userId} subscribed to topic: ${topic}`);
    
    return { success: true };

  } catch (error) {
    console.error('Failed to subscribe to topic:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Unsubscribe user from topic
 * @param {string} userId - User ID
 * @param {string} topic - Topic name
 */
const unsubscribeFromTopic = async (userId, topic) => {
  try {
    if (!firebaseApp) {
      return { success: false, error: 'Firebase not configured' };
    }

    const user = await User.findById(userId);
    if (!user || !user.fcmToken) {
      return { success: false, error: 'No FCM token found' };
    }

    await admin.messaging().unsubscribeFromTopic([user.fcmToken], topic);
    console.log(`User ${userId} unsubscribed from topic: ${topic}`);
    
    return { success: true };

  } catch (error) {
    console.error('Failed to unsubscribe from topic:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendNotification,
  sendBulkNotification,
  sendRoleBasedNotification,
  sendOverdueTaskReminders,
  subscribeToTopic,
  unsubscribeFromTopic
};