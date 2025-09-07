# Task Management Mobile App

A comprehensive task management application with role-based access control, built with React frontend and Node.js backend. Features mobile-first design, real-time push notifications, and advanced reporting capabilities.

## 🚀 Features

### Core Functionality
- **Role-Based Access Control**: Super Admin, Manager, and Employee roles with specific permissions
- **Task Management**: Create, assign, track, and approve tasks with priority levels
- **Mobile-First Design**: Responsive UI optimized for mobile devices
- **Real-Time Notifications**: Snapchat-style push notifications using Firebase
- **File Attachments**: Upload and manage task-related files
- **Comments System**: Collaborative task discussions
- **Advanced Reporting**: Analytics dashboard with charts and export functionality
- **Audit Logging**: Comprehensive system activity tracking

### User Roles & Permissions

#### Super Admin
- Full system access and control
- User management (create, edit, delete users)
- Task oversight across all teams
- System-wide reporting and analytics
- Audit log access and management
- Broadcast notifications to all users

#### Manager
- Team member management
- Task assignment and approval
- Team performance reporting
- Task creation and delegation
- Team-specific notifications

#### Employee
- View assigned tasks
- Update task status and progress
- Add comments and attachments
- Receive task-related notifications
- Personal profile management

## 🏗️ Architecture

### Backend (Node.js + Express)
```
├── server.js                 # Main server file
├── models/                   # MongoDB models
│   ├── User.js              # User model with authentication
│   ├── Task.js              # Task model with status tracking
│   └── AuditLog.js          # Audit logging model
├── routes/                   # API routes
│   ├── auth.js              # Authentication endpoints
│   ├── users.js             # User management
│   ├── tasks.js             # Task operations
│   ├── notifications.js     # Push notifications
│   ├── reports.js           # Analytics and reporting
│   └── audit.js             # Audit log access
├── middleware/               # Custom middleware
│   └── auth.js              # JWT authentication & authorization
└── utils/                    # Utility functions
    └── notifications.js      # Firebase notification service
```

### Frontend (React)
```
├── src/
│   ├── components/           # Reusable components
│   │   ├── Layout/          # App layout components
│   │   └── UI/              # UI components
│   ├── contexts/            # React contexts
│   │   ├── AuthContext.js   # Authentication state
│   │   └── NotificationContext.js # Push notifications
│   ├── pages/               # Page components
│   │   ├── Auth/            # Login/authentication
│   │   ├── Dashboard/       # Main dashboard
│   │   ├── Tasks/           # Task management
│   │   ├── Users/           # User management
│   │   ├── Reports/         # Analytics
│   │   ├── Admin/           # Admin features
│   │   ├── Profile/         # User profile
│   │   └── Settings/        # App settings
│   └── index.css            # Tailwind CSS styles
```

## 🛠️ Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing
- **Firebase Admin SDK** - Push notifications
- **Multer** - File upload handling
- **Helmet** - Security middleware

### Frontend
- **React 18** - UI framework
- **React Router** - Client-side routing
- **React Query** - Data fetching and caching
- **React Hook Form** - Form management
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Icon library
- **Firebase SDK** - Push notifications
- **Axios** - HTTP client

### Development Tools
- **Nodemon** - Development server
- **ESLint** - Code linting
- **Prettier** - Code formatting

## 📱 Mobile Features

### Progressive Web App (PWA)
- Installable on mobile devices
- Offline capability with service workers
- App-like experience with native feel

### Mobile-Optimized UI
- Touch-friendly interface with 44px minimum tap targets
- Swipe gestures for task actions
- Bottom navigation for easy thumb access
- Responsive design for all screen sizes

### Push Notifications
- Real-time task assignments
- Status update notifications
- Deadline reminders
- Approval/rejection alerts
- Customizable notification preferences

## 🔐 Security Features

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (RBAC)
- Session timeout management
- Account lockout after failed attempts
- Password strength requirements

### Data Protection
- Password hashing with bcrypt
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection
- Rate limiting on sensitive endpoints

### Audit & Monitoring
- Comprehensive audit logging
- Failed login attempt tracking
- User activity monitoring
- Security event alerts
- Data access logging

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- Firebase project (for push notifications)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd task-management-mobile-app
```

2. **Install backend dependencies**
```bash
npm install
```

3. **Install frontend dependencies**
```bash
cd client
npm install
cd ..
```

4. **Environment Configuration**

Create a `.env` file in the root directory:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/task-management-app

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d

# Firebase (for push notifications)
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-private-key\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your-client-email@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id

# Security
BCRYPT_ROUNDS=12
SESSION_TIMEOUT=900000
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_TIME=1800000
```

Create a `.env` file in the `client` directory:
```env
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
REACT_APP_FIREBASE_VAPID_KEY=your-vapid-key
```

5. **Start the application**

Development mode (runs both backend and frontend):
```bash
# Terminal 1 - Backend
npm run dev

# Terminal 2 - Frontend
npm run client
```

Production mode:
```bash
npm run build
npm start
```

### Default Users

The application includes demo credentials for testing:

- **Super Admin**: admin@example.com / admin123
- **Manager**: manager@example.com / manager123
- **Employee**: employee@example.com / employee123

## 📊 API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/change-password` - Change password

### User Management
- `GET /api/users` - List users (role-based filtering)
- `POST /api/users` - Create user
- `GET /api/users/:id` - Get user details
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Deactivate user

### Task Management
- `GET /api/tasks` - List tasks (role-based filtering)
- `POST /api/tasks` - Create task
- `GET /api/tasks/:id` - Get task details
- `PUT /api/tasks/:id` - Update task
- `PUT /api/tasks/:id/status` - Update task status
- `POST /api/tasks/:id/comments` - Add comment
- `POST /api/tasks/:id/attachments` - Upload attachment

### Notifications
- `POST /api/notifications/send` - Send notification
- `POST /api/notifications/broadcast` - Broadcast notification
- `PUT /api/notifications/settings` - Update notification settings

### Reports & Analytics
- `GET /api/reports/dashboard` - Dashboard statistics
- `GET /api/reports/tasks` - Task reports
- `GET /api/reports/users` - User performance reports
- `GET /api/reports/analytics` - Advanced analytics

### Audit Logs (Super Admin only)
- `GET /api/audit/logs` - Get audit logs
- `GET /api/audit/security` - Security-related logs
- `GET /api/audit/user/:userId` - User-specific logs

## 🔧 Configuration

### Firebase Setup
1. Create a Firebase project
2. Enable Cloud Messaging
3. Generate service account credentials
4. Add web app configuration
5. Configure VAPID keys for web push

### MongoDB Setup
1. Install MongoDB locally or use MongoDB Atlas
2. Create database: `task-management-app`
3. The application will create collections automatically

### Security Configuration
- Update JWT secret in production
- Configure proper CORS origins
- Set up rate limiting based on your needs
- Enable HTTPS in production
- Configure proper MongoDB authentication

## 📱 Mobile Deployment

### PWA Installation
1. Build the application: `npm run build`
2. Serve over HTTPS
3. Users can install via browser "Add to Home Screen"

### Mobile App Stores
The PWA can be packaged for app stores using:
- **Capacitor** - For native iOS/Android apps
- **Electron** - For desktop applications
- **PWA Builder** - For Microsoft Store

## 🧪 Testing

### Backend Testing
```bash
npm test
```

### Frontend Testing
```bash
cd client
npm test
```

### Manual Testing Checklist
- [ ] User authentication and authorization
- [ ] Task creation and assignment
- [ ] Push notifications
- [ ] File uploads
- [ ] Mobile responsiveness
- [ ] Role-based access control
- [ ] Audit logging

## 🚀 Deployment

### Production Deployment
1. Set `NODE_ENV=production`
2. Update environment variables
3. Build frontend: `npm run build`
4. Start server: `npm start`

### Docker Deployment
```dockerfile
# Dockerfile example
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

### Cloud Deployment Options
- **Heroku** - Easy deployment with MongoDB Atlas
- **AWS** - EC2 with RDS/DocumentDB
- **Google Cloud** - App Engine with Cloud Firestore
- **DigitalOcean** - Droplets with managed databases

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the API endpoints
- Test with provided demo credentials

## 🔮 Future Enhancements

- [ ] Real-time collaboration features
- [ ] Advanced analytics with machine learning
- [ ] Integration with external calendar systems
- [ ] Voice-to-text task creation
- [ ] Offline task management
- [ ] Multi-language support
- [ ] Dark mode theme
- [ ] Advanced file preview capabilities
- [ ] Time tracking and productivity metrics
- [ ] Integration with popular project management tools

---

**Built with ❤️ for efficient team task management**