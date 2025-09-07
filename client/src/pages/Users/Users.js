import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  Users as UsersIcon, 
  Plus, 
  Search, 
  Filter, 
  Mail,
  Shield,
  Calendar,
  Edit,
  Trash2,
  Eye,
  UserCheck,
  UserX,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import Select from '../../components/UI/Select';
import Modal from '../../components/UI/Modal';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import EditUser from './EditUser';

const ManagerEmployees = ({ managerId, setSelectedUser, setShowDeleteModal }) => {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(
    ['employees', managerId],
    async () => {
      const response = await api.get(`/users?managerId=${managerId}&role=employee&limit=100`);
      const employees = response.data.data.users;
      console.log(`Raw employees for manager ${managerId}:`, employees);
      // Filter employees to ensure managerId._id matches
      const filteredEmployees = employees.filter(emp => emp.managerId?._id === managerId);
      console.log(`Filtered employees for manager ${managerId} (total: ${filteredEmployees.length}):`, filteredEmployees);
      return filteredEmployees;
    },
    { enabled: !!managerId }
  );

  const toggleStatusMutation = useMutation(
    async ({ userId, isActive }) => {
      console.log(`Toggling status for user ${userId}, current isActive: ${isActive}`);
      await api.patch(`/users/${userId}`, { isActive: !isActive });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users');
        queryClient.invalidateQueries(['employees', managerId]);
        toast.success('User status updated');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update user status');
      },
    }
  );

  const handleToggleStatus = (employee) => {
    console.log(`Selected employee for status toggle:`, employee);
    toggleStatusMutation.mutate({ userId: employee._id, isActive: employee.isActive });
  };

  const getRoleBadge = (role) => {
    const roleConfig = {
      super_admin: { label: 'Super Admin', className: 'bg-purple-100 text-purple-800' },
      manager: { label: 'Manager', className: 'bg-blue-100 text-blue-800' },
      employee: { label: 'Employee', className: 'bg-green-100 text-green-800' },
    };
    const config = roleConfig[role] || roleConfig.employee;
    return (
      <span className={clsx('px-2 py-1 text-xs font-medium rounded-full', config.className)}>
        {config.label}
      </span>
    );
  };

  const getStatusBadge = (isActive) => {
    return (
      <span className={clsx(
        'px-2 py-1 text-xs font-medium rounded-full',
        isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      )}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <tr>
        <td colSpan={6} className="px-6 py-4 text-center">
          <LoadingSpinner text="Loading employees..." />
        </td>
      </tr>
    );
  }

  if (!data || data.length === 0) {
    return (
      <tr>
        <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
          No employees found
        </td>
      </tr>
    );
  }
  console.log("data",data)
  return data.map((emp) => (
    <tr key={emp._id} className="hover:bg-gray-50">
      <td className="px-6 py-4 pl-12">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
              <span className="text-sm font-medium text-gray-700">
                {emp.name.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{emp.name}</div>
            <div className="text-sm text-gray-500 flex items-center">
              <Mail className="h-3 w-3 mr-1" />
              {emp.email}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center">
          <Shield className="h-4 w-4 text-gray-400 mr-2" />
          {getRoleBadge(emp.role)}
        </div>
      </td>
      <td className="px-6 py-4">{getStatusBadge(emp.isActive)}</td>
      <td className="px-6 py-4">
        <div className="flex items-center">
          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
          <span className="text-sm text-gray-900">{formatDate(emp.createdAt)}</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className="text-sm text-gray-900">
          {emp.lastLogin ? formatDate(emp.lastLogin) : 'Never'}
        </span>
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end space-x-2">
          <Link to={`/users/${emp._id}`} className="text-gray-400 hover:text-gray-600">
            <Eye className="h-4 w-4" />
          </Link>
          {hasPermission(['super_admin', 'manager']) && emp._id !== user._id && (
            <>
              <button
                onClick={() => handleToggleStatus(emp)}
                className={clsx(
                  'text-gray-400 hover:text-gray-600',
                  emp.isActive ? 'hover:text-red-600' : 'hover:text-green-600'
                )}
                title={emp.isActive ? 'Deactivate user' : 'Activate user'}
              >
                {emp.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
              </button>
              <Link to={`/users/${emp._id}/edit`} className="text-gray-400 hover:text-blue-600">
                <Edit className="h-4 w-4" />
              </Link>
              <button
                onClick={() => {
                  console.log(`Selected user for deletion:`, emp);
                  setSelectedUser(emp);
                  setShowDeleteModal(true);
                }}
                className="text-gray-400 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  ));
};

const Users = () => {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const isSuperAdmin = user.role === 'super_admin';
  
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);
  const [expandedManagers, setExpandedManagers] = useState(new Set());

  // Fetch users with filters
  const { data: usersData, isLoading, error } = useQuery(
    ['users', { 
      page: currentPage, 
      limit, 
      search: searchTerm, 
      role: roleFilter !== 'all' ? roleFilter : undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined
    }],
    async ({ queryKey }) => {
      const [, filters] = queryKey;
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value);
        }
      });
      
      const response = await api.get(`/users?${params.toString()}`);
      console.log(`Fetched users (total: ${response.data.data.users.length}):`, response.data.data.users);
      return response.data.data;
    },
    {
      keepPreviousData: true,
    }
  );

  // Delete user mutation
  const deleteUserMutation = useMutation(
    async (userId) => {
      console.log(`Deleting user with ID: ${userId}`);
      await api.delete(`/users/${userId}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users');
        queryClient.invalidateQueries(['employees']);
        toast.success('User deleted successfully');
        setShowDeleteModal(false);
        setSelectedUser(null);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to delete user');
      },
    }
  );

  // Toggle user status mutation
  const toggleStatusMutation = useMutation(
    async ({ userId, isActive }) => {
      console.log(`Toggling status for user ${userId}, current isActive: ${isActive}`);
      await api.patch(`/users/${userId}`, { isActive: !isActive });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users');
        queryClient.invalidateQueries(['employees']);
        toast.success('User status updated');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update user status');
      },
    }
  );

  const handleDeleteUser = () => {
    if (selectedUser) {
      console.log(`Initiating delete for user:`, selectedUser);
      deleteUserMutation.mutate(selectedUser._id);
    }
  };

  const handleToggleStatus = (userItem) => {
    console.log(`Selected user for status toggle:`, userItem);
    toggleStatusMutation.mutate({ userId: userItem._id, isActive: userItem.isActive });
  };

  const getRoleBadge = (role) => {
    const roleConfig = {
      super_admin: { label: 'Super Admin', className: 'bg-purple-100 text-purple-800' },
      manager: { label: 'Manager', className: 'bg-blue-100 text-blue-800' },
      employee: { label: 'Employee', className: 'bg-green-100 text-green-800' },
    };
    
    const config = roleConfig[role] || roleConfig.employee;
    return (
      <span className={clsx('px-2 py-1 text-xs font-medium rounded-full', config.className)}>
        {config.label}
      </span>
    );
  };

  const getStatusBadge = (isActive) => {
    return (
      <span className={clsx(
        'px-2 py-1 text-xs font-medium rounded-full',
        isActive 
          ? 'bg-green-100 text-green-800' 
          : 'bg-red-100 text-red-800'
      )}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const toggleManager = (managerId) => {
    console.log(`Toggling manager expansion for ID: ${managerId}`);
    const newExpanded = new Set(expandedManagers);
    if (newExpanded.has(managerId)) {
      newExpanded.delete(managerId);
    } else {
      newExpanded.add(managerId);
    }
    setExpandedManagers(newExpanded);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Loading users..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <UsersIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Failed to load users
        </h3>
        <p className="text-gray-600">
          Please try refreshing the page or contact support if the problem persists.
        </p>
      </div>
    );
  }

  const users = usersData?.users || [];
  const totalPages = Math.ceil((usersData?.total || 0) / limit);
  let mainUsers = users;
  if (isSuperAdmin && roleFilter === 'all') {
    mainUsers = users.filter(u => u.role === 'super_admin' || u.role === 'manager' || (u.role === 'employee' && !u.managerId));
    console.log(`Filtered main users for super admin (total: ${mainUsers.length}):`, mainUsers);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-600 mt-1">
            Manage team members and their permissions
          </p>
        </div>
        
        {hasPermission(['super_admin', 'manager']) && (
          <Link to="/users/create">
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </Link>
        )}
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="sm:w-auto"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Role"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Roles' },
                    { value: 'super_admin', label: 'Super Admin' },
                    { value: 'manager', label: 'Manager' },
                    { value: 'employee', label: 'Employee' },
                  ]}
                />
                
                <Select
                  label="Status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Status' },
                    { value: 'true', label: 'Active' },
                    { value: 'false', label: 'Inactive' },
                  ]}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Users List */}
      <div className="card">
        <div className="card-body p-0">
          {mainUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Active
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {mainUsers.map((userItem) => (
                    <React.Fragment key={userItem._id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            {userItem.role === 'manager' && (
                              <button
                                onClick={() => toggleManager(userItem._id)}
                                className="mr-2 focus:outline-none text-gray-600 hover:text-gray-800"
                              >
                                {expandedManagers.has(userItem._id) ? (
                                  <ChevronDown className="h-5 w-5" />
                                ) : (
                                  <ChevronRight className="h-5 w-5" />
                                )}
                              </button>
                            )}
                            {userItem.role !== 'manager' && <div className="w-7" />}
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-700">
                                  {userItem.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {userItem.name}
                              </div>
                              <div className="text-sm text-gray-500 flex items-center">
                                <Mail className="h-3 w-3 mr-1" />
                                {userItem.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <Shield className="h-4 w-4 text-gray-400 mr-2" />
                            {getRoleBadge(userItem.role)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(userItem.isActive)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900">
                              {formatDate(userItem.createdAt)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-900">
                            {userItem.lastLogin ? formatDate(userItem.lastLogin) : 'Never'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Link
                              to={`/users/${userItem._id}`}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                            
                            {hasPermission(['super_admin']) && userItem._id !== user._id && (
                              <>
                                <button
                                  onClick={() => handleToggleStatus(userItem)}
                                  className={clsx(
                                    'text-gray-400 hover:text-gray-600',
                                    userItem.isActive ? 'hover:text-red-600' : 'hover:text-green-600'
                                  )}
                                  title={userItem.isActive ? 'Deactivate user' : 'Activate user'}
                                >
                                  {userItem.isActive ? (
                                    <UserX className="h-4 w-4" />
                                  ) : (
                                    <UserCheck className="h-4 w-4" />
                                  )}
                                </button>
                                
                                <Link
                                  to={`/users/${userItem._id}/edit`}
                                  className="text-gray-400 hover:text-blue-600"
                                >
                                  <Edit className="h-4 w-4" />
                                </Link>
                                
                                <button
                                  onClick={() => {
                                    console.log(`Selected user for deletion:`, userItem);
                                    setSelectedUser(userItem);
                                    setShowDeleteModal(true);
                                  }}
                                  className="text-gray-400 hover:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            )}
                            
                            {hasPermission(['manager']) && userItem._id !== user._id && userItem.role === 'employee' && (
                              <Link
                                to={`/users/${userItem._id}/edit`}
                                className="text-gray-400 hover:text-blue-600"
                              >
                                <Edit className="h-4 w-4" />
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                      {userItem.role === 'manager' && expandedManagers.has(userItem._id) && (
                        <ManagerEmployees 
                          managerId={userItem._id} 
                          setSelectedUser={setSelectedUser}
                          setShowDeleteModal={setShowDeleteModal}
                        />
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <UsersIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No users found
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || roleFilter !== 'all' || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Get started by adding your first team member'
                }
              </p>
              {hasPermission(['super_admin', 'manager']) && (
                <Link to="/users/create">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add User
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, usersData?.total || 0)} of {usersData?.total || 0} results
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          console.log(`Closing delete modal, clearing selected user:`, selectedUser);
          setShowDeleteModal(false);
          setSelectedUser(null);
        }}
        title="Delete User"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete "{selectedUser?.name}"? This action cannot be undone and will remove all associated data.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <p className="text-sm text-yellow-800">
              <strong>Warning:</strong> This will also delete all tasks assigned to this user.
            </p>
          </div>
          <div className="flex space-x-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                console.log(`Cancel delete, clearing selected user:`, selectedUser);
                setShowDeleteModal(false);
                setSelectedUser(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteUser}
              disabled={deleteUserMutation.isLoading}
            >
              {deleteUserMutation.isLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Users; 