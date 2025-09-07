import React from 'react';
import { Settings as SettingsIcon } from 'lucide-react';

const Settings = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      <div className="card">
        <div className="card-body text-center py-12">
          <SettingsIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Settings Component</h3>
          <p className="text-gray-600">Application settings and notification preferences.</p>
        </div>
      </div>
    </div>
  );
};

export default Settings;