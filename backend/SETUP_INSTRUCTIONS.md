# Complete Setup Instructions

## 🚨 Current Issue: Login Error
You're getting "An unexpected error occurred. Please try again." because:
1. Backend server might not be running
2. No demo users exist in the database
3. Firebase Admin SDK needs to be properly initialized

## 🔧 Step-by-Step Fix

### Step 1: Install Node.js (if not already installed)
1. Download from: https://nodejs.org/
2. Install LTS version
3. Restart terminal/VS Code

### Step 2: Install Dependencies
```bash
# Install backend dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..
```

### Step 3: Create Demo Users
```bash
# Run the seed script to create demo users
npm run seed
```

This will create:
- **Super Admin**: admin@example.com / admin123
- **Manager**: manager@example.com / manager123  
- **Employee**: employee@example.com / employee123

### Step 4: Start Backend Server
```bash
# Start the backend server (will run on port 3001)
npm run dev
```

You should see:
```
Firebase Admin SDK initialized successfully
MongoDB connected successfully
Server running on port 3001
```

### Step 5: Start Frontend Client
```bash
# In a new terminal window
cd client
npm start
```

This will start the React app on http://localhost:3000

### Step 6: Test Login
1. Go to http://localhost:3000
2. Use any of the demo credentials:
   - admin@example.com / admin123
   - manager@example.com / manager123
   - employee@example.com / employee123

## 🔍 Troubleshooting

### If you get "npm: command not found"
- Node.js is not installed or not in PATH
- Install Node.js from https://nodejs.org/

### If you get "Firebase Admin SDK initialization failed"
- Check your `.env` file has correct Firebase credentials
- Ensure FIREBASE_PRIVATE_KEY is properly formatted with \n

### If you get "MongoDB connection error"
- Check your MONGODB_URI in `.env` file
- Ensure MongoDB Atlas cluster is running
- Check network access settings in MongoDB Atlas

### If you get "Port 3001 already in use"
- Kill the process: `lsof -ti:3001 | xargs kill -9`
- Or change PORT in `.env` file

### If login still fails
1. Check browser console for errors
2. Check backend terminal for error logs
3. Ensure both frontend and backend are running
4. Verify demo users were created with `npm run seed`

## 📱 Expo Mobile App Setup (After Web App Works)

Once your web app is working, follow the `EXPO_SETUP_GUIDE.md` to create the mobile version.

## 🔐 Firebase Configuration Status
- ✅ Firebase project created
- ✅ Firestore database configured
- ✅ Security rules implemented
- ✅ Service account credentials set
- ✅ Firebase Admin SDK integrated

## 📊 Project Structure
```
Task-Mobile/
├── server.js              # Main server file
├── .env                   # Environment variables
├── package.json           # Backend dependencies
├── utils/firebase.js      # Firebase configuration
├── scripts/seedUsers.js   # Demo user creation
├── routes/               # API routes
├── models/               # Database models
├── middleware/           # Authentication middleware
└── client/               # React frontend
    ├── src/
    ├── package.json
    └── ...
```

## 🎯 Next Steps After Login Works
1. Test all features (tasks, users, reports)
2. Set up Expo mobile app
3. Configure push notifications
4. Deploy to production

## 📞 Support
If you continue to have issues:
1. Check all terminals for error messages
2. Ensure all dependencies are installed
3. Verify environment variables are correct
4. Make sure both servers are running simultaneously