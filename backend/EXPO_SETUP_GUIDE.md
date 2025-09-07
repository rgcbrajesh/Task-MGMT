# Expo Mobile App Setup Guide

## Prerequisites
1. **Install Node.js** (if not already installed)
   - Download from: https://nodejs.org/
   - Install LTS version

2. **Install Expo CLI**
   ```bash
   npm install -g @expo/cli
   ```

3. **Install Expo Go App** on your mobile device
   - iOS: Download from App Store
   - Android: Download from Google Play Store

## Create Expo Mobile App

### Step 1: Create New Expo Project
```bash
# Navigate to your project directory
cd /Users/jaideepmishra/Desktop/Task-Mobile

# Create new Expo app
npx create-expo-app mobile-app --template blank

# Navigate to mobile app directory
cd mobile-app
```

### Step 2: Install Required Dependencies
```bash
# Install navigation dependencies
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs

# Install required peer dependencies
npx expo install react-native-screens react-native-safe-area-context

# Install Firebase for mobile
npm install firebase

# Install additional UI libraries
npm install react-native-elements react-native-vector-icons
npx expo install expo-linear-gradient

# Install form handling
npm install react-hook-form

# Install HTTP client
npm install axios

# Install async storage
npx expo install @react-native-async-storage/async-storage
```

### Step 3: Configure Firebase for Mobile
Create `config/firebase.js` in your mobile app:

```javascript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "taskmanagemnet-a1e5a.firebaseapp.com",
  projectId: "taskmanagemnet-a1e5a",
  storageBucket: "taskmanagemnet-a1e5a.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

### Step 4: Get Firebase Web Config
1. Go to Firebase Console
2. Project Settings → General tab
3. Scroll to "Your apps" section
4. Click "Web" icon (</>) if not already added
5. Copy the config object

### Step 5: Run Your Mobile App
```bash
# Start Expo development server
npx expo start

# Options will appear:
# - Press 'i' for iOS simulator
# - Press 'a' for Android emulator
# - Scan QR code with Expo Go app on your phone
```

## Project Structure for Mobile App
```
mobile-app/
├── App.js
├── app.json
├── package.json
├── config/
│   └── firebase.js
├── src/
│   ├── components/
│   │   ├── common/
│   │   └── forms/
│   ├── screens/
│   │   ├── Auth/
│   │   ├── Dashboard/
│   │   ├── Tasks/
│   │   └── Profile/
│   ├── navigation/
│   │   └── AppNavigator.js
│   ├── services/
│   │   └── api.js
│   ├── contexts/
│   │   └── AuthContext.js
│   └── utils/
│       └── helpers.js
```

## Backend API Configuration
Your backend is running on port 3001, so in your mobile app's API service:

```javascript
// src/services/api.js
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001'; // For simulator
// const API_BASE_URL = 'http://YOUR_IP:3001'; // For physical device

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

export default api;
```

## Testing on Physical Device
If testing on a physical device, replace `localhost` with your computer's IP address:

1. Find your IP address:
   ```bash
   # On macOS/Linux
   ifconfig | grep "inet " | grep -v 127.0.0.1
   
   # On Windows
   ipconfig
   ```

2. Update API_BASE_URL in your mobile app to use your IP address

## Current Status
- ✅ Backend server configured (port 3001)
- ✅ Firebase setup complete
- ✅ Database rules configured
- 🔄 Mobile app needs to be created with Expo

## Next Steps
1. Install Node.js and Expo CLI
2. Create Expo mobile app
3. Configure Firebase for mobile
4. Test the complete application