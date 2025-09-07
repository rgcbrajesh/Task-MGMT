import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';

// Components
import Layout from './components/Layout/Layout';
import LoadingSpinner from './components/UI/LoadingSpinner';

// Pages
import Login from './pages/Auth/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import Tasks from './pages/Tasks/Tasks';
import TaskDetail from './pages/Tasks/TaskDetail';
import CreateTask from './pages/Tasks/CreateTask';
import Users from './pages/Users/Users';
import UserDetail from './pages/Users/UserDetail';
import EditUser from './pages/Users/EditUser';
import EditTask from './pages/Tasks/EditTask';
import CreateUser from './pages/Users/CreateUser';
import Reports from './pages/Reports/Reports';
import AuditLogs from './pages/Admin/AuditLogs';
import Profile from './pages/Profile/Profile';
import Settings from './pages/Settings/Settings';
import NotFound from './pages/NotFound';

// Debug Components (only in development)
import DevelopmentTester from './components/Debug/DevelopmentTester';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Protected Route Component
const ProtectedRoute = ({ children, roles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Public Route Component (redirect if authenticated)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        
        {/* Dashboard */}
        <Route path="dashboard" element={<Dashboard />} />

        {/* Tasks */}
        <Route path="tasks" element={<Tasks />} />
        <Route path="tasks/create" element={
          <ProtectedRoute roles={['super_admin', 'manager']}>
            <CreateTask />
          </ProtectedRoute>
        } />
        <Route path="tasks/:id" element={<TaskDetail />} />
        <Route path="/tasks/:id/edit" element={
          <ProtectedRoute roles={['super_admin', 'manager','employee']}>
            <EditTask />
          </ProtectedRoute>
        } />

        {/* Users - Super Admin and Manager only */}
        <Route path="users" element={
          <ProtectedRoute roles={['super_admin', 'manager']}>
            <Users />
          </ProtectedRoute>
        } />
        <Route path="users/create" element={
          <ProtectedRoute roles={['super_admin', 'manager']}>
            <CreateUser />
          </ProtectedRoute>
        } />
        <Route path="users/:id" element={
          <ProtectedRoute roles={['super_admin', 'manager','employee']}>
            <UserDetail />
          </ProtectedRoute>
        } />
        
      <Route path="users/:id/edit" element={
          <ProtectedRoute roles={['super_admin', 'manager','employee']}>
            <EditUser />
          </ProtectedRoute>
        } />
        {/* Reports - Super Admin and Manager only */}
        <Route path="reports" element={
          <ProtectedRoute roles={['super_admin', 'manager']}>
            <Reports />
          </ProtectedRoute>
        } />

        {/* Audit Logs - Super Admin only */}
        <Route path="audit" element={
          <ProtectedRoute roles={['super_admin']}>
            <AuditLogs />
          </ProtectedRoute>
        } />

        {/* Profile & Settings */}
        <Route path="profile" element={<Profile />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Development Testing Route (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <Route path="/dev" element={<DevelopmentTester />} />
      )}

      {/* 404 Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationProvider>
          <Router>
            <div className="App">
              <AppRoutes />
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#363636',
                    color: '#fff',
                  },
                  success: {
                    duration: 3000,
                    iconTheme: {
                      primary: '#22c55e',
                      secondary: '#fff',
                    },
                  },
                  error: {
                    duration: 5000,
                    iconTheme: {
                      primary: '#ef4444',
                      secondary: '#fff',
                    },
                  },
                }}
              />
            </div>
          </Router>
        </NotificationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;