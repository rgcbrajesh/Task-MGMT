import React, { useState } from 'react';
import api from '../../services/api';

const ApiTest = () => {
  const [testResult, setTestResult] = useState('');
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    setTestResult('Testing connection...');
    
    try {
      // Test basic connection
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@test.com',
          password: 'test123'
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setTestResult('✅ API Connection Working! Response: ' + JSON.stringify(data, null, 2));
      } else {
        setTestResult('✅ API Connection Working! (Expected error for invalid credentials): ' + JSON.stringify(data, null, 2));
      }
    } catch (error) {
      setTestResult('❌ API Connection Failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const testWithApi = async () => {
    setLoading(true);
    setTestResult('Testing with API service...');
    
    try {
      const response = await api.post('/auth/login', {
        email: 'admin@example.com',
        password: 'admin123'
      });
      
      setTestResult('✅ API Service Working! Response: ' + JSON.stringify(response.data, null, 2));
    } catch (error) {
      if (error.response) {
        setTestResult('✅ API Service Working! (Server responded): ' + JSON.stringify(error.response.data, null, 2));
      } else {
        setTestResult('❌ API Service Failed: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-2xl mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-4">API Connection Test</h2>
      
      <div className="space-y-4">
        <button
          onClick={testConnection}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Direct Connection'}
        </button>
        
        <button
          onClick={testWithApi}
          disabled={loading}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50 ml-2"
        >
          {loading ? 'Testing...' : 'Test API Service'}
        </button>
      </div>
      
      {testResult && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h3 className="font-semibold mb-2">Test Result:</h3>
          <pre className="whitespace-pre-wrap text-sm">{testResult}</pre>
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-600">
        <p><strong>Backend URL:</strong> http://localhost:3001</p>
        <p><strong>Frontend URL:</strong> http://localhost:3000</p>
        <p><strong>Proxy:</strong> {process.env.NODE_ENV === 'development' ? 'Enabled' : 'Disabled'}</p>
      </div>
    </div>
  );
};

export default ApiTest;