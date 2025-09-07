import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCwxV428v3CcRQGh7R9WoWYRekp4tld_ys",
  authDomain: "taskmanagemnet-a1e5a.firebaseapp.com",
  projectId: "taskmanagemnet-a1e5a",
  storageBucket: "taskmanagemnet-a1e5a.firebasestorage.app",
  messagingSenderId: "470415879743",
  appId: "1:470415879743:web:99c652c33153bc23acd28a",
  measurementId: "G-KM820RJ2JV"
};

// VAPID key for web push
const VAPID_KEY = process.env.REACT_APP_FIREBASE_VAPID_KEY;

// Create context
const NotificationContext = createContext();

// Custom hook to use notification context
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

// Notification Provider component
export const NotificationProvider = ({ children }) => {
  const [messaging, setMessaging] = useState(null);
  const [fcmToken, setFcmToken] = useState(null);
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [notifications, setNotifications] = useState([]);
  const { user, updateFCMToken } = useAuth();

  // Initialize Firebase
  useEffect(() => {
    if (!firebaseConfig.projectId) {
      console.warn('Firebase configuration not found. Push notifications will be disabled.');
      return;
    }

    try {
      const app = initializeApp(firebaseConfig);
      const messagingInstance = getMessaging(app);
      setMessaging(messagingInstance);
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
    }
  }, []);

  // Request notification permission
  const requestPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        toast.success('Notifications enabled successfully!');
        return true;
      } else if (permission === 'denied') {
        toast.error('Notifications blocked. Please enable them in your browser settings.');
        return false;
      } else {
        toast.info('Notification permission not granted.');
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Failed to request notification permission.');
      return false;
    }
  };

  // Get FCM token
  const getFCMToken = useCallback(async () => {
    if (!messaging) {
      console.warn('Firebase messaging not initialized');
      return null;
    }

    if (!VAPID_KEY) {
      console.warn('VAPID key missing - push notifications will not work');
      return null;
    }

    try {
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
      });
      
      if (token) {
        setFcmToken(token);
        // Update token on server
        if (user) {
          await updateFCMToken(token);
        }
        return token;
      } else {
        console.warn('No registration token available.');
        return null;
      }
    } catch (error) {
      console.error('An error occurred while retrieving token:', error);
      return null;
    }
  }, [messaging, user, updateFCMToken]);

  // Initialize notifications when user is available
  useEffect(() => {
    if (user && messaging) {
      // Check current permission
      setNotificationPermission(Notification.permission);
      
      // Get FCM token if permission is granted
      if (Notification.permission === 'granted') {
        getFCMToken();
      }
    }
  }, [user, messaging, getFCMToken]);

  // Set up foreground message listener
  useEffect(() => {
    if (!messaging) return;

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Message received in foreground:', payload);
      
      const { notification, data } = payload;
      
      // Add to notifications list
      const newNotification = {
        id: Date.now(),
        title: notification?.title || 'New Notification',
        body: notification?.body || '',
        data: data || {},
        timestamp: new Date(),
        read: false,
      };
      
      setNotifications(prev => [newNotification, ...prev]);
      
      // Show toast notification
      toast.custom((t) => (
        <div
          className={`${
            t.visible ? 'animate-enter' : 'animate-leave'
          } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
        >
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-primary-500 flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {notification?.title?.charAt(0) || 'N'}
                  </span>
                </div>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {notification?.title}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {notification?.body}
                </p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-gray-200">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-primary-600 hover:text-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              Close
            </button>
          </div>
        </div>
      ), {
        duration: 5000,
        position: 'top-right',
      });
      
      // Handle notification click action
      if (data?.type) {
        handleNotificationAction(data);
      }
    });

    return unsubscribe;
  }, [messaging]);

  // Handle notification actions
  const handleNotificationAction = (data) => {
    const { type, taskId, userId } = data;
    
    switch (type) {
      case 'task_assigned':
      case 'task_updated':
      case 'task_completed':
      case 'task_approved':
      case 'task_rejected':
        if (taskId) {
          // Navigate to task detail (you'll need to implement navigation)
          window.location.href = `/tasks/${taskId}`;
        }
        break;
      case 'user_created':
      case 'user_updated':
        if (userId) {
          window.location.href = `/users/${userId}`;
        }
        break;
      default:
        // Navigate to dashboard
        window.location.href = '/dashboard';
    }
  };

  // Mark notification as read
  const markAsRead = (notificationId) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  // Mark all notifications as read
  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  // Clear notification
  const clearNotification = (notificationId) => {
    setNotifications(prev =>
      prev.filter(notification => notification.id !== notificationId)
    );
  };

  // Clear all notifications
  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // Get unread count
  const getUnreadCount = () => {
    return notifications.filter(notification => !notification.read).length;
  };

  // Enable notifications (request permission and get token)
  const enableNotifications = async () => {
    const permissionGranted = await requestPermission();
    if (permissionGranted) {
      await getFCMToken();
      return true;
    }
    return false;
  };

  // Disable notifications
  const disableNotifications = async () => {
    try {
      // Clear FCM token on server
      if (user) {
        await updateFCMToken(null);
      }
      setFcmToken(null);
      toast.success('Notifications disabled successfully!');
      return true;
    } catch (error) {
      console.error('Error disabling notifications:', error);
      toast.error('Failed to disable notifications.');
      return false;
    }
  };

  // Check if notifications are supported
  const isNotificationSupported = () => {
    return 'Notification' in window && 'serviceWorker' in navigator;
  };

  // Check if notifications are enabled
  const isNotificationEnabled = () => {
    return notificationPermission === 'granted' && fcmToken !== null;
  };

  const value = {
    // State
    notifications,
    notificationPermission,
    fcmToken,
    
    // Actions
    requestPermission,
    enableNotifications,
    disableNotifications,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
    
    // Getters
    getUnreadCount,
    isNotificationSupported,
    isNotificationEnabled,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;