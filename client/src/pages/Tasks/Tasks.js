import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  CheckSquare, 
  Plus, 
  Search, 
  Filter, 
  Calendar,
  User,
  Clock,
  AlertTriangle,
  Edit,
  Trash2,
  Eye,
  MoreVertical
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

const Tasks = () => {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);

  // Fetch tasks with filters
  const { data: tasksData, isLoading, error } = useQuery(
    ['tasks', { 
      page: currentPage, 
      limit, 
      search: searchTerm, 
      status: statusFilter !== 'all' ? statusFilter : undefined,
      priority: priorityFilter !== 'all' ? priorityFilter : undefined,
      assignedTo: assigneeFilter !== 'all' ? assigneeFilter : undefined
    }],
    async ({ queryKey }) => {
      const [, filters] = queryKey;
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value);
        }
      });
      
      const response = await api.get(`/tasks?${params.toString()}`);
      return response.data.data;
    },
    {
      keepPreviousData: true,
    }
  );

  // Fetch users for assignee filter
  const { data: users } = useQuery(
    'users-list',
    async () => {
      const response = await api.get('/users');
      return response.data.data.users;
    },
    {
      enabled: hasPermission(['super_admin', 'manager']),
    }
  );

  // Delete task mutation
  const deleteTaskMutation = useMutation(
    async (taskId) => {
      await api.delete(`/tasks/${taskId}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('tasks');
        toast.success('Task deleted successfully');
        setShowDeleteModal(false);
        setSelectedTask(null);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to delete task');
      },
    }
  );

  // Update task status mutation
  const updateStatusMutation = useMutation(
    async ({ taskId, status }) => {
      await api.patch(`/tasks/${taskId}`, { status });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('tasks');
        toast.success('Task status updated');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update task');
      },
    }
  );

  const handleDeleteTask = () => {
    if (selectedTask) {
      deleteTaskMutation.mutate(selectedTask._id);
    }
  };

  const handleStatusChange = (task, newStatus) => {
    updateStatusMutation.mutate({ taskId: task._id, status: newStatus });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: 'Pending', className: 'bg-gray-100 text-gray-800' },
      in_progress: { label: 'In Progress', className: 'bg-blue-100 text-blue-800' },
      completed: { label: 'Completed', className: 'bg-green-100 text-green-800' },
      approved: { label: 'Approved', className: 'bg-green-100 text-green-800' },
      rejected: { label: 'Rejected', className: 'bg-red-100 text-red-800' },
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={clsx('px-2 py-1 text-xs font-medium rounded-full', config.className)}>
        {config.label}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const priorityConfig = {
      low: { label: 'Low', className: 'bg-gray-100 text-gray-800' },
      medium: { label: 'Medium', className: 'bg-yellow-100 text-yellow-800' },
      high: { label: 'High', className: 'bg-orange-100 text-orange-800' },
      urgent: { label: 'Urgent', className: 'bg-red-100 text-red-800' },
    };
    
    const config = priorityConfig[priority] || priorityConfig.medium;
    return (
      <span className={clsx('px-2 py-1 text-xs font-medium rounded-full', config.className)}>
        {config.label}
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

  const isOverdue = (deadline) => {
    return new Date(deadline) < new Date() && new Date(deadline).toDateString() !== new Date().toDateString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Loading tasks..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Failed to load tasks
        </h3>
        <p className="text-gray-600">
          Please try refreshing the page or contact support if the problem persists.
        </p>
      </div>
    );
  }

  const tasks = tasksData?.tasks || [];
  const totalPages = Math.ceil((tasksData?.total || 0) / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-600 mt-1">
            Manage and track your tasks
          </p>
        </div>
        
        {hasPermission(['super_admin', 'manager']) && (
          <Link to="/tasks/create">
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Create Task
            </Button>
          </Link>
        )}
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            {/* Filter Toggle */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="sm:w-auto"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Select
                  label="Status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Status' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'in_progress', label: 'In Progress' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'approved', label: 'Approved' },
                    { value: 'rejected', label: 'Rejected' },
                  ]}
                />
                
                <Select
                  label="Priority"
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Priorities' },
                    { value: 'low', label: 'Low' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'high', label: 'High' },
                    { value: 'urgent', label: 'Urgent' },
                  ]}
                />
                
                {hasPermission(['super_admin', 'manager']) && users && (
                  <Select
                    label="Assignee"
                    value={assigneeFilter}
                    onChange={(e) => setAssigneeFilter(e.target.value)}
                    options={[
                      { value: 'all', label: 'All Assignees' },
                      ...users.map(user => ({
                        value: user._id,
                        label: user.name
                      }))
                    ]}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tasks List */}
      <div className="card">
        <div className="card-body p-0">
          {tasks.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Task
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assignee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tasks.map((task) => (
                    <tr key={task._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <Link
                            to={`/tasks/${task._id}`}
                            className="text-sm font-medium text-gray-900 hover:text-blue-600"
                          >
                            {task.title}
                          </Link>
                          {task.description && (
                            <p className="text-sm text-gray-500 mt-1 truncate max-w-xs">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <User className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">
                            {task.assignedTo?.name || 'Unassigned'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getPriorityBadge(task.priority)}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(task.status)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                          <span className={clsx(
                            'text-sm',
                            isOverdue(task.deadline) ? 'text-red-600 font-medium' : 'text-gray-900'
                          )}>
                            {formatDate(task.deadline)}
                          </span>
                          {isOverdue(task.deadline) && (
                            <AlertTriangle className="h-4 w-4 text-red-500 ml-1" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Link
                            to={`/tasks/${task._id}`}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          
                          {hasPermission(['super_admin', 'manager','employee']) && (
                          
                              <Link
                                to={`/tasks/${task._id}/edit`}
                                className="text-gray-400 hover:text-blue-600"
                              >
                                <Edit className="h-4 w-4" />
                              </Link>
                               )}
                                 
                          {hasPermission(['super_admin', 'manager']) && (
                          
                              <button
                                onClick={() => {
                                  setSelectedTask(task);
                                  setShowDeleteModal(true);
                                }}
                                className="text-gray-400 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                          
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <CheckSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No tasks found
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Get started by creating your first task'
                }
              </p>
              {hasPermission(['super_admin', 'manager']) && (
                <Link to="/tasks/create">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Task
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
            Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, tasksData?.total || 0)} of {tasksData?.total || 0} results
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
          setShowDeleteModal(false);
          setSelectedTask(null);
        }}
        title="Delete Task"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete "{selectedTask?.title}"? This action cannot be undone.
          </p>
          <div className="flex space-x-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedTask(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteTask}
              disabled={deleteTaskMutation.isLoading}
            >
              {deleteTaskMutation.isLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Tasks;