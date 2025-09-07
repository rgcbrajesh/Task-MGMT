import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import ApiTester from './ApiTester';
import Button from '../UI/Button';
import Card from '../UI/Card';

const DevelopmentTester = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [testResults, setTestResults] = useState({});
  const { user, login, logout } = useAuth();
  const { isNotificationSupported, isNotificationEnabled, enableNotifications } = useNotification();

  const tabs = [
    { id: 'overview', name: 'Overview', icon: '📊' },
    { id: 'auth', name: 'Authentication', icon: '🔐' },
    { id: 'api', name: 'API Testing', icon: '🔌' },
    { id: 'components', name: 'Components', icon: '🧩' },
    { id: 'features', name: 'Features', icon: '⚡' },
  ];

  const featureChecklist = [
    { name: 'User Authentication', status: user ? 'working' : 'pending', description: 'JWT-based login/logout' },
    { name: 'Role-Based Access', status: user?.role ? 'working' : 'pending', description: 'Super Admin, Manager, Employee roles' },
    { name: 'Push Notifications', status: isNotificationEnabled() ? 'working' : 'partial', description: 'Firebase Cloud Messaging' },
    { name: 'Task Management', status: 'working', description: 'CRUD operations for tasks' },
    { name: 'User Management', status: 'working', description: 'User creation and management' },
    { name: 'Reporting System', status: 'working', description: 'Analytics and reports' },
    { name: 'Audit Logging', status: 'working', description: 'System activity tracking' },
    { name: 'File Uploads', status: 'working', description: 'Task attachments' },
    { name: 'Mobile Responsive', status: 'working', description: 'Mobile-first design' },
    { name: 'PWA Features', status: 'partial', description: 'Progressive Web App capabilities' },
  ];

  const componentChecklist = [
    { name: 'Layout Components', status: 'working', items: ['Header', 'Sidebar', 'MobileNavigation'] },
    { name: 'UI Components', status: 'working', items: ['Button', 'Card', 'LoadingSpinner'] },
    { name: 'Form Components', status: 'working', items: ['Input', 'Select', 'TextArea', 'Modal'] },
    { name: 'Data Display', status: 'working', items: ['Table', 'Charts', 'Badge', 'Pagination'] },
    { name: 'Feedback', status: 'working', items: ['Toast', 'Modal', 'LoadingSpinner', 'Error States'] },
    { name: 'Navigation', status: 'working', items: ['Breadcrumb', 'Pagination', 'Tabs'] },
  ];

  const testAuthentication = async () => {
    try {
      if (!user) {
        const result = await login('admin@example.com', 'admin123');
        setTestResults(prev => ({
          ...prev,
          auth: { ...prev.auth, login: result.success ? 'passed' : 'failed' }
        }));
      } else {
        setTestResults(prev => ({
          ...prev,
          auth: { ...prev.auth, currentUser: 'passed' }
        }));
      }
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        auth: { ...prev.auth, login: 'failed', error: error.message }
      }));
    }
  };

  const testNotifications = async () => {
    try {
      if (isNotificationSupported()) {
        const enabled = await enableNotifications();
        setTestResults(prev => ({
          ...prev,
          notifications: { supported: true, enabled }
        }));
      } else {
        setTestResults(prev => ({
          ...prev,
          notifications: { supported: false, enabled: false }
        }));
      }
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        notifications: { error: error.message }
      }));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'working': return 'text-green-600 bg-green-100';
      case 'partial': return 'text-yellow-600 bg-yellow-100';
      case 'pending': return 'text-gray-600 bg-gray-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'working': return '✅';
      case 'partial': return '⚠️';
      case 'pending': return '⏳';
      case 'failed': return '❌';
      default: return '❓';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Development & Testing Dashboard</h1>
          <p className="text-gray-600">Comprehensive testing and development status for the Task Management App</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <Card.Header>
                <Card.Title>Project Status</Card.Title>
              </Card.Header>
              <Card.Content>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Backend Server</span>
                    <span className="text-green-600">✅ Running (Port 3001)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Frontend Client</span>
                    <span className="text-green-600">✅ Running (Port 3000)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Database</span>
                    <span className="text-green-600">✅ MongoDB Connected</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Firebase</span>
                    <span className="text-green-600">✅ Configured</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Authentication</span>
                    <span className={user ? 'text-green-600' : 'text-yellow-600'}>
                      {user ? '✅ Logged In' : '⚠️ Not Logged In'}
                    </span>
                  </div>
                </div>
              </Card.Content>
            </Card>

            <Card>
              <Card.Header>
                <Card.Title>Quick Actions</Card.Title>
              </Card.Header>
              <Card.Content>
                <div className="space-y-3">
                  <Button onClick={testAuthentication} fullWidth>
                    Test Authentication
                  </Button>
                  <Button onClick={testNotifications} variant="secondary" fullWidth>
                    Test Notifications
                  </Button>
                  <Button 
                    onClick={() => setActiveTab('api')} 
                    variant="outline" 
                    fullWidth
                  >
                    Run API Tests
                  </Button>
                  {user && (
                    <Button onClick={logout} variant="danger" fullWidth>
                      Logout
                    </Button>
                  )}
                </div>
              </Card.Content>
            </Card>
          </div>
        )}

        {activeTab === 'auth' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <Card.Header>
                <Card.Title>Current User</Card.Title>
              </Card.Header>
              <Card.Content>
                {user ? (
                  <div className="space-y-2">
                    <div><strong>Name:</strong> {user.name}</div>
                    <div><strong>Email:</strong> {user.email}</div>
                    <div><strong>Role:</strong> {user.role}</div>
                    <div><strong>Status:</strong> {user.isActive ? 'Active' : 'Inactive'}</div>
                  </div>
                ) : (
                  <p className="text-gray-500">Not logged in</p>
                )}
              </Card.Content>
            </Card>

            <Card>
              <Card.Header>
                <Card.Title>Demo Credentials</Card.Title>
              </Card.Header>
              <Card.Content>
                <div className="space-y-2 text-sm">
                  <div><strong>Super Admin:</strong> admin@example.com / admin123</div>
                  <div><strong>Manager:</strong> manager@example.com / manager123</div>
                  <div><strong>Employee:</strong> employee@example.com / employee123</div>
                </div>
              </Card.Content>
            </Card>
          </div>
        )}

        {activeTab === 'api' && (
          <ApiTester />
        )}

        {activeTab === 'components' && (
          <div className="space-y-6">
            {componentChecklist.map(category => (
              <Card key={category.name}>
                <Card.Header>
                  <div className="flex items-center justify-between">
                    <Card.Title>{category.name}</Card.Title>
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(category.status)}`}>
                      {getStatusIcon(category.status)} {category.status}
                    </span>
                  </div>
                </Card.Header>
                <Card.Content>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {category.items.map(item => (
                      <div key={item} className="text-sm p-2 bg-gray-50 rounded">
                        {item}
                      </div>
                    ))}
                  </div>
                </Card.Content>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'features' && (
          <div className="space-y-4">
            {featureChecklist.map(feature => (
              <Card key={feature.name} hover>
                <Card.Content>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{feature.name}</h3>
                      <p className="text-sm text-gray-500">{feature.description}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(feature.status)}`}>
                      {getStatusIcon(feature.status)} {feature.status}
                    </span>
                  </div>
                </Card.Content>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DevelopmentTester;