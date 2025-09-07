import React, { useState } from 'react';
import api from '../../services/api';

const ApiTester = () => {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const apiEndpoints = {
    auth: [
      { method: 'POST', endpoint: '/auth/login', name: 'Login', body: { email: 'admin@example.com', password: 'admin123' } },
      { method: 'GET', endpoint: '/auth/me', name: 'Get Current User', requiresAuth: true },
      { method: 'POST', endpoint: '/auth/logout', name: 'Logout', requiresAuth: true },
      { method: 'PUT', endpoint: '/auth/change-password', name: 'Change Password', requiresAuth: true, body: { currentPassword: 'admin123', newPassword: 'newpass123' } },
    ],
    users: [
      { method: 'GET', endpoint: '/users', name: 'List Users', requiresAuth: true },
      { method: 'POST', endpoint: '/users', name: 'Create User', requiresAuth: true, body: { name: 'Test User', email: 'test@example.com', password: 'test123', role: 'employee' } },
      { method: 'GET', endpoint: '/users/me', name: 'Get User Profile', requiresAuth: true },
    ],
    tasks: [
      { method: 'GET', endpoint: '/tasks', name: 'List Tasks', requiresAuth: true },
      { method: 'POST', endpoint: '/tasks', name: 'Create Task', requiresAuth: true, body: { title: 'Test Task', description: 'Test Description', priority: 'medium', dueDate: new Date().toISOString() } },
    ],
    notifications: [
      { method: 'POST', endpoint: '/notifications/send', name: 'Send Notification', requiresAuth: true, body: { userId: 'test', title: 'Test', body: 'Test notification' } },
      { method: 'PUT', endpoint: '/notifications/settings', name: 'Update Notification Settings', requiresAuth: true, body: { taskAssigned: true, taskCompleted: true } },
    ],
    reports: [
      { method: 'GET', endpoint: '/reports/dashboard', name: 'Dashboard Stats', requiresAuth: true },
      { method: 'GET', endpoint: '/reports/tasks', name: 'Task Reports', requiresAuth: true },
      { method: 'GET', endpoint: '/reports/users', name: 'User Reports', requiresAuth: true },
      { method: 'GET', endpoint: '/reports/analytics', name: 'Analytics', requiresAuth: true },
    ],
    audit: [
      { method: 'GET', endpoint: '/audit/logs', name: 'Audit Logs', requiresAuth: true },
      { method: 'GET', endpoint: '/audit/security', name: 'Security Logs', requiresAuth: true },
    ]
  };

  const testEndpoint = async (endpoint) => {
    try {
      let response;
      const config = {};
      
      if (endpoint.body) {
        config.data = endpoint.body;
      }

      switch (endpoint.method) {
        case 'GET':
          response = await api.get(endpoint.endpoint);
          break;
        case 'POST':
          response = await api.post(endpoint.endpoint, endpoint.body);
          break;
        case 'PUT':
          response = await api.put(endpoint.endpoint, endpoint.body);
          break;
        case 'DELETE':
          response = await api.delete(endpoint.endpoint);
          break;
        default:
          throw new Error(`Unsupported method: ${endpoint.method}`);
      }

      return {
        success: true,
        status: response.status,
        data: response.data,
        message: 'Success'
      };
    } catch (error) {
      return {
        success: false,
        status: error.response?.status || 0,
        data: error.response?.data || null,
        message: error.response?.data?.message || error.message
      };
    }
  };

  const testCategory = async (category) => {
    setLoading(true);
    const endpoints = apiEndpoints[category] || [];
    const categoryResults = {};

    for (const endpoint of endpoints) {
      const result = await testEndpoint(endpoint);
      categoryResults[endpoint.name] = result;
    }

    setResults(prev => ({
      ...prev,
      [category]: categoryResults
    }));
    setLoading(false);
  };

  const testAllEndpoints = async () => {
    setLoading(true);
    setResults({});
    
    for (const category of Object.keys(apiEndpoints)) {
      await testCategory(category);
    }
    setLoading(false);
  };

  const getStatusColor = (result) => {
    if (!result) return 'bg-gray-100';
    if (result.success) return 'bg-green-100 text-green-800';
    if (result.status === 401) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getStatusIcon = (result) => {
    if (!result) return '⏳';
    if (result.success) return '✅';
    if (result.status === 401) return '🔒';
    return '❌';
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-6xl mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-6">API Endpoint Tester</h2>
      
      {/* Controls */}
      <div className="mb-6 flex flex-wrap gap-4">
        <button
          onClick={testAllEndpoints}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test All Endpoints'}
        </button>
        
        {Object.keys(apiEndpoints).map(category => (
          <button
            key={category}
            onClick={() => testCategory(category)}
            disabled={loading}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50 capitalize"
          >
            Test {category}
          </button>
        ))}
      </div>

      {/* Filter */}
      <div className="mb-6">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="all">All Categories</option>
          {Object.keys(apiEndpoints).map(category => (
            <option key={category} value={category} className="capitalize">
              {category}
            </option>
          ))}
        </select>
      </div>

      {/* Results */}
      <div className="space-y-6">
        {Object.entries(apiEndpoints).map(([category, endpoints]) => {
          if (selectedCategory !== 'all' && selectedCategory !== category) return null;
          
          return (
            <div key={category} className="border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4 capitalize">{category} Endpoints</h3>
              
              <div className="grid gap-3">
                {endpoints.map(endpoint => {
                  const result = results[category]?.[endpoint.name];
                  
                  return (
                    <div
                      key={endpoint.name}
                      className={`p-3 rounded border ${getStatusColor(result)}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-lg">{getStatusIcon(result)}</span>
                          <span className="font-medium">{endpoint.method}</span>
                          <span className="font-mono text-sm">{endpoint.endpoint}</span>
                          <span>{endpoint.name}</span>
                          {endpoint.requiresAuth && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              Auth Required
                            </span>
                          )}
                        </div>
                        
                        {result && (
                          <div className="text-sm">
                            Status: {result.status}
                          </div>
                        )}
                      </div>
                      
                      {result && (
                        <div className="mt-2 text-sm">
                          <div className="font-medium">Message: {result.message}</div>
                          {result.data && (
                            <details className="mt-2">
                              <summary className="cursor-pointer text-blue-600">
                                View Response Data
                              </summary>
                              <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                                {JSON.stringify(result.data, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      {Object.keys(results).length > 0 && (
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Test Summary</h3>
          {Object.entries(results).map(([category, categoryResults]) => {
            const total = Object.keys(categoryResults).length;
            const successful = Object.values(categoryResults).filter(r => r.success).length;
            const failed = total - successful;
            
            return (
              <div key={category} className="flex justify-between items-center py-1">
                <span className="capitalize font-medium">{category}:</span>
                <span>
                  <span className="text-green-600">{successful} passed</span>
                  {failed > 0 && <span className="text-red-600 ml-2">{failed} failed</span>}
                  <span className="text-gray-500 ml-2">({total} total)</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ApiTester;