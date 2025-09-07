import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, LogIn, Smartphone } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { getFCMToken, isNotificationSupported } = useNotification();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm();

  const onSubmit = async (data) => {
    setIsLoading(true);
    
    try {
      // Get FCM token if notifications are supported (non-blocking)
      let fcmToken = null;
      try {
        if (isNotificationSupported()) {
          // Set a timeout for FCM token to prevent blocking
          fcmToken = await Promise.race([
            getFCMToken(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('FCM timeout')), 3000)
            )
          ]);
        }
      } catch (fcmError) {
        console.warn('FCM token generation failed, proceeding without it:', fcmError.message);
        fcmToken = null;
      }
      
      console.log("Login data:", data, "FCM Token:", fcmToken);

      const result = await login(data.email, data.password, fcmToken);
      
      if (!result.success) {
        setError('root', {
          type: 'manual',
          message: result.error,
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('root', {
        type: 'manual',
        message: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary-600 rounded-full flex items-center justify-center mb-4">
            <Smartphone className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            Task Manager
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to your account to manage tasks efficiently
          </p>
        </div>

        {/* Login Form */}
        <div className="card">
          <div className="card-body">
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="form-label">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className="form-input"
                  placeholder="Enter your email"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address',
                    },
                  })}
                />
                {errors.email && (
                  <p className="form-error">{errors.email.message}</p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className="form-input pr-10"
                    placeholder="Enter your password"
                    {...register('password', {
                      required: 'Password is required',
                      minLength: {
                        value: 6,
                        message: 'Password must be at least 6 characters',
                      },
                    })}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="form-error">{errors.password.message}</p>
                )}
              </div>

              {/* Error Message */}
              {errors.root && (
                <div className="bg-danger-50 border border-danger-200 rounded-lg p-3">
                  <p className="text-sm text-danger-600">{errors.root.message}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full"
              >
                {isLoading ? (
                  <LoadingSpinner size="sm" color="white" />
                ) : (
                  <>
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign in
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Demo Credentials */}
        <div className="card">
          <div className="card-body">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              Demo Credentials
            </h3>
            <div className="space-y-2 text-xs text-gray-600">
              <div className="flex justify-between">
                <span className="font-medium">Super Admin:</span>
                <span>admin@example.com / admin123</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Manager:</span>
                <span>manager@example.com / manager123</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Employee:</span>
                <span>employee@example.com / employee123</span>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="text-center">
          <div className="grid grid-cols-3 gap-4 text-xs text-gray-500">
            <div className="flex flex-col items-center">
              <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center mb-1">
                <span className="text-primary-600 font-semibold">📱</span>
              </div>
              <span>Mobile First</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="h-8 w-8 bg-success-100 rounded-full flex items-center justify-center mb-1">
                <span className="text-success-600 font-semibold">🔔</span>
              </div>
              <span>Push Notifications</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="h-8 w-8 bg-warning-100 rounded-full flex items-center justify-center mb-1">
                <span className="text-warning-600 font-semibold">👥</span>
              </div>
              <span>Team Management</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;