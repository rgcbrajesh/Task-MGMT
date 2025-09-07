import React from 'react';
import { useQuery } from 'react-query';
import { 
  CheckSquare, 
  Clock, 
  AlertTriangle, 
  TrendingUp,
  Users,
  Plus,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import axios from 'axios';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { clsx } from 'clsx';
import api from '../../services/api';
const Dashboard = () => {
  const { user, hasPermission } = useAuth();

  // Fetch dashboard data
  const { data: dashboardData, isLoading, error } = useQuery(
    'dashboard',
    async () => {
      const response = await api.get('/reports/dashboard?period=30d');
      return response.data.data;
    },
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  // Fetch recent tasks
  const { data: recentTasks } = useQuery(
    'recent-tasks',
    async () => {
      const response = await api.get('/tasks?limit=5');
      return response.data.data.tasks;
    }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Loading dashboard..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-danger-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Failed to load dashboard
        </h3>
        <p className="text-gray-600">
          Please try refreshing the page or contact support if the problem persists.
        </p>
      </div>
    );
  }

  const stats = dashboardData?.summary || {};
  const tasksByStatus = dashboardData?.tasksByStatus || {};
  const tasksByPriority = dashboardData?.tasksByPriority || {};

  // Calculate completion rate
  const completedTasks = (tasksByStatus.completed || 0) + (tasksByStatus.approved || 0);
  const completionRate = stats.totalTasks > 0 
    ? Math.round((completedTasks / stats.totalTasks) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Welcome back, {user?.name}!
            </h1>
            <p className="text-primary-100 mt-1">
              Here's what's happening with your tasks today.
            </p>
          </div>
          <div className="hidden sm:block">
            <div className="h-16 w-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <CheckSquare className="h-8 w-8" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckSquare className="h-8 w-8 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalTasks || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-8 w-8 text-warning-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">
                  {tasksByStatus.in_progress || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-8 w-8 text-danger-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.overdueCount || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-success-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completion</p>
                <p className="text-2xl font-bold text-gray-900">
                  {completionRate}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Status Overview */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Task Status</h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {Object.entries(tasksByStatus).map(([status, count]) => {
                const percentage = stats.totalTasks > 0 
                  ? Math.round((count / stats.totalTasks) * 100) 
                  : 0;
                
                const statusConfig = {
                  pending: { label: 'Pending', color: 'bg-gray-500' },
                  in_progress: { label: 'In Progress', color: 'bg-primary-500' },
                  completed: { label: 'Completed', color: 'bg-success-500' },
                  approved: { label: 'Approved', color: 'bg-success-600' },
                  rejected: { label: 'Rejected', color: 'bg-danger-500' },
                };

                const config = statusConfig[status] || { label: status, color: 'bg-gray-500' };

                return (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={clsx('w-3 h-3 rounded-full mr-3', config.color)} />
                      <span className="text-sm font-medium text-gray-900">
                        {config.label}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">{count}</span>
                      <span className="text-xs text-gray-400">({percentage}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Priority Distribution</h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {Object.entries(tasksByPriority).map(([priority, count]) => {
                const percentage = stats.totalTasks > 0 
                  ? Math.round((count / stats.totalTasks) * 100) 
                  : 0;
                
                const priorityConfig = {
                  low: { label: 'Low', color: 'bg-gray-500' },
                  medium: { label: 'Medium', color: 'bg-primary-500' },
                  high: { label: 'High', color: 'bg-warning-500' },
                  urgent: { label: 'Urgent', color: 'bg-danger-500' },
                };

                const config = priorityConfig[priority] || { label: priority, color: 'bg-gray-500' };

                return (
                  <div key={priority} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={clsx('w-3 h-3 rounded-full mr-3', config.color)} />
                      <span className="text-sm font-medium text-gray-900">
                        {config.label}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">{count}</span>
                      <span className="text-xs text-gray-400">({percentage}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Tasks */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Recent Tasks</h3>
            <Link
              to="/tasks"
              className="text-sm text-primary-600 hover:text-primary-500 flex items-center"
            >
              View all
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
        </div>
        <div className="card-body">
          {recentTasks && recentTasks.length > 0 ? (
            <div className="space-y-4">
              {recentTasks.map((task) => (
                <div key={task._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <Link
                      to={`/tasks/${task._id}`}
                      className="text-sm font-medium text-gray-900 hover:text-primary-600"
                    >
                      {task.title}
                    </Link>
                    <p className="text-xs text-gray-500 mt-1">
                      Assigned to: {task.assignedTo?.name}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={clsx('badge', `priority-${task.priority}`)}>
                      {task.priority}
                    </span>
                    <span className={clsx('badge', `status-${task.status}`)}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No recent tasks</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {hasPermission(['super_admin', 'manager']) && (
          <Link
            to="/tasks/create"
            className="card hover:shadow-medium transition-shadow duration-200"
          >
            <div className="card-body text-center">
              <Plus className="h-8 w-8 text-primary-600 mx-auto mb-2" />
              <h4 className="text-sm font-medium text-gray-900">Create Task</h4>
              <p className="text-xs text-gray-500 mt-1">
                Assign a new task to team members
              </p>
            </div>
          </Link>
        )}

        <Link
          to="/tasks"
          className="card hover:shadow-medium transition-shadow duration-200"
        >
          <div className="card-body text-center">
            <CheckSquare className="h-8 w-8 text-success-600 mx-auto mb-2" />
            <h4 className="text-sm font-medium text-gray-900">View Tasks</h4>
            <p className="text-xs text-gray-500 mt-1">
              See all your assigned tasks
            </p>
          </div>
        </Link>

        {hasPermission(['super_admin', 'manager']) && (
          <Link
            to="/users"
            className="card hover:shadow-medium transition-shadow duration-200"
          >
            <div className="card-body text-center">
              <Users className="h-8 w-8 text-warning-600 mx-auto mb-2" />
              <h4 className="text-sm font-medium text-gray-900">Manage Users</h4>
              <p className="text-xs text-gray-500 mt-1">
                Add or manage team members
              </p>
            </div>
          </Link>
        )}
      </div>
    </div>
  );
};

export default Dashboard;