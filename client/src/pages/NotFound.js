import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <div className="mx-auto h-24 w-24 bg-primary-100 rounded-full flex items-center justify-center mb-6">
            <span className="text-4xl font-bold text-primary-600">404</span>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Page Not Found
          </h1>
          
          <p className="text-gray-600 mb-8">
            Sorry, we couldn't find the page you're looking for. It might have been moved, deleted, or you entered the wrong URL.
          </p>
          
          <div className="space-y-4">
            <Link
              to="/dashboard"
              className="btn-primary inline-flex items-center"
            >
              <Home className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Link>
            
            <div>
              <button
                onClick={() => window.history.back()}
                className="btn-outline inline-flex items-center"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;