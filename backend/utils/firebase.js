const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
};

// Initialize Firebase Admin if not already initialized
let firebaseApp;
try {
  // Try to get existing app first
  firebaseApp = admin.app();
  console.log('Firebase Admin SDK already initialized');
} catch (error) {
  // App doesn't exist, create it
  try {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
    });
    console.log('Firebase Admin SDK initialized successfully');
  } catch (initError) {
    console.error('Failed to initialize Firebase Admin SDK:', initError.message);
  }
}

// Get Firestore instance
const db = admin.firestore();

// Get Auth instance
const auth = admin.auth();

// Helper functions for common operations
const firebaseHelpers = {
  // User operations
  async createUser(userData) {
    try {
      const userRecord = await auth.createUser(userData);
      await db.collection('users').doc(userRecord.uid).set({
        email: userData.email,
        displayName: userData.displayName || '',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return userRecord;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },

  // Task operations
  async createTask(taskData) {
    try {
      const taskRef = await db.collection('tasks').add({
        ...taskData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return taskRef;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  },

  // Get tasks by user
  async getTasksByUser(userId) {
    try {
      const snapshot = await db.collection('tasks')
        .where('assignedTo', '==', userId)
        .get();
      
      const tasks = [];
      snapshot.forEach(doc => {
        tasks.push({ id: doc.id, ...doc.data() });
      });
      
      return tasks;
    } catch (error) {
      console.error('Error getting tasks:', error);
      throw error;
    }
  },

  // Notification operations
  async createNotification(notificationData) {
    try {
      const notificationRef = await db.collection('notifications').add({
        ...notificationData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        read: false
      });
      return notificationRef;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  },

  // Audit log operations
  async createAuditLog(logData) {
    try {
      const auditRef = await db.collection('auditLogs').add({
        ...logData,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
      return auditRef;
    } catch (error) {
      console.error('Error creating audit log:', error);
      throw error;
    }
  },

  // Verify Firebase token
  async verifyToken(idToken) {
    try {
      const decodedToken = await auth.verifyIdToken(idToken);
      return decodedToken;
    } catch (error) {
      console.error('Error verifying token:', error);
      throw error;
    }
  }
};

module.exports = {
  admin,
  db,
  auth,
  firebaseHelpers
};