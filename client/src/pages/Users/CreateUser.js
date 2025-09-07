import React, { useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import {
  Save,
  X,
  User,
  Mail,
  Lock,
  Shield,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import Select from '../../components/UI/Select';
import Card from '../../components/UI/Card';
import toast from 'react-hot-toast';

const CreateUser = () => {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'employee',
    department: '',
    phone: '',
    isActive: true
  });
const [passwordChecks, setPasswordChecks] = useState({
  length: false,
  uppercase: false,
  lowercase: false,
  number: false,
});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});

  // Create user mutation
  const createUserMutation = useMutation(
    async (userData) => {
      const response = await api.post('/users', userData);
      return response.data;
    },
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries('users');
        toast.success('User created successfully');
        navigate(`/users/${data.data._id}`);
      },
      onError: (error) => {
        const errorMessage = error.response?.data?.message || 'Failed to create user';
        toast.error(errorMessage);

        // Handle validation errors
        if (error.response?.data?.errors) {
          setErrors(error.response.data.errors);
        }
      },
    }
  );
const validatePassword = (password) => {
  setPasswordChecks({
    length: password.length >= 6,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
  });
};
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (name === "password") {
      validatePassword(value); // ✅ run password checks
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Role validation
    if (!formData.role) {
      newErrors.role = 'Role is required';
    }

    // Role permission check
    if (user.role === 'manager' && formData.role !== 'employee') {
      newErrors.role = 'Managers can only create employee accounts';
    }

    // Phone validation (optional)
    if (formData.phone && !/^\+?[\d\s\-\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    const userData = {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
      role: formData.role,
      department: formData.department.trim() || undefined,
      phone: formData.phone.trim() || undefined,
      isActive: formData.isActive
    };

    createUserMutation.mutate(userData);
  };

  const getRoleOptions = () => {
    const baseOptions = [
      { value: 'employee', label: 'Employee' }
    ];

    // Super admin can create any role
    if (hasPermission(['super_admin'])) {
      return [
        { value: 'employee', label: 'Employee' },
        { value: 'manager', label: 'Manager' },
        { value: 'super_admin', label: 'Super Admin' }
      ];
    }

    // Manager can only create employees
    if (hasPermission(['manager'])) {
      return baseOptions;
    }

    return baseOptions;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New User</h1>
          <p className="text-gray-600 mt-1">
            Add a new team member to the system
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => navigate('/users')}
        >
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <Card>
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
          </div>
          <div className="card-body space-y-4">
            <Input
              label="Full Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              error={errors.name}
              placeholder="Enter full name..."
              icon={User}
              required
            />

            <Input
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              error={errors.email}
              placeholder="Enter email address..."
              icon={Mail}
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Phone Number"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                error={errors.phone}
                placeholder="Enter phone number..."
              />

              <Input
                label="Department"
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                error={errors.department}
                placeholder="e.g., Engineering, Marketing..."
              />
            </div>
          </div>
        </Card>

        {/* Account Security */}
        <Card>
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Account Security</h3>
          </div>
          <div className="card-body space-y-4">
            <div className="relative">
              <Input
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleInputChange}
                error={errors.password}
                placeholder="Enter password..."
                icon={Lock}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="relative">
              <Input
                label="Confirm Password"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleInputChange}
                error={errors.confirmPassword}
                placeholder="Confirm password..."
                icon={Lock}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
<div className="bg-gray-50 border border-gray-200 rounded-md p-3">
  <p className="text-sm font-medium text-gray-800 mb-2">Password Requirements:</p>
  <ul className="text-sm space-y-1">
    <li className={passwordChecks.length ? "text-green-600" : "text-red-600"}>
      {passwordChecks.length ? "✅" : "❌"} At least 6 characters long
    </li>
    <li className={passwordChecks.uppercase ? "text-green-600" : "text-red-600"}>
      {passwordChecks.uppercase ? "✅" : "❌"} At least one uppercase letter (A–Z)
    </li>
    <li className={passwordChecks.lowercase ? "text-green-600" : "text-red-600"}>
      {passwordChecks.lowercase ? "✅" : "❌"} At least one lowercase letter (a–z)
    </li>
    <li className={passwordChecks.number ? "text-green-600" : "text-red-600"}>
      {passwordChecks.number ? "✅" : "❌"} At least one number (0–9)
    </li>
  </ul>
</div>


          </div>
        </Card>

        {/* Role & Permissions */}
        <Card>
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Role & Permissions</h3>
          </div>
          <div className="card-body space-y-4">
            <Select
              label="Role"
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              error={errors.role}
              options={getRoleOptions()}
              icon={Shield}
              required
            />

            <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Role Descriptions:</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div>
                  <strong>Employee:</strong> Can view and manage assigned tasks, update profile
                </div>
                <div>
                  <strong>Manager:</strong> Can create tasks, manage team members, view reports
                </div>
                {hasPermission(['super_admin']) && (
                  <div>
                    <strong>Super Admin:</strong> Full system access, user management, system settings
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                name="isActive"
                checked={formData.isActive}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                Account is active (user can log in)
              </label>
            </div>
          </div>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/users')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createUserMutation.isLoading}
          >
            {createUserMutation.isLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Creating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Create User
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateUser;