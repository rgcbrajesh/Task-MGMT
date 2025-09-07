import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { 
  BarChart3, 
  TrendingUp, 
  Download, 
  Calendar,
  Users,
  CheckSquare,
  Clock,
  AlertTriangle,
  Filter,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import Button from '../../components/UI/Button';
import Select from '../../components/UI/Select';
import Card from '../../components/UI/Card';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

const Reports = () => {
  const { user, hasPermission } = useAuth();
  
  // State management
  const [period, setPeriod] = useState('30d');
  const [reportType, setReportType] = useState('overview');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch dashboard/overview data
  const { data: overviewData, isLoading: overviewLoading, refetch: refetchOverview } = useQuery(
    ['reports-overview', period],
    async () => {
      const response = await api.get(`/reports/dashboard?period=${period}`);
      return response.data.data;
    },
    {
      refetchInterval: 60000, // Refetch every minute
    }
  );

  // Fetch task analytics
  const { data: taskAnalytics, isLoading: taskLoading } = useQuery(
    ['reports-tasks', period],
    async () => {
      const response = await api.get(`/reports/tasks?period=${period}`);
      return response.data.data;
    }
  );

  // Fetch user performance data
  const { data: userPerformance, isLoading: userLoading } = useQuery(
    ['reports-users', period],
    async () => {
      const response = await api.get(`/reports/users?period=${period}`);
      return response.data.data;
    },
    {
      enabled: hasPermission(['super_admin', 'manager']),
    }
  );

  // Export report function
  const handleExportReport = async (format = 'csv') => {
    try {
      const response = await api.get(`/reports/export?period=${period}&format=${format}&type=${reportType}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report-${reportType}-${period}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Report exported successfully');
    } catch (error) {
      toast.error('Failed to export report');
    }
  };

  const isLoading = overviewLoading || taskLoading || userLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Loading reports..." />
      </div>
    );
  }

  const summary = overviewData?.summary || {};
  const tasksByStatus = overviewData?.tasksByStatus || {};
  const tasksByPriority = overviewData?.tasksByPriority || {};
  const completionTrend = taskAnalytics?.completionTrend || [];
  const topPerformers = userPerformance?.topPerformers || [];

  // Calculate completion rate
  const completedTasks = (tasksByStatus.completed || 0) + (tasksByStatus.approved || 0);
  const completionRate = summary.totalTasks > 0 
    ? Math.round((completedTasks / summary.totalTasks) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">
            Track performance and analyze team productivity
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => {
              refetchOverview();
              toast.success('Reports refreshed');
            }}
            className="w-full sm:w-auto"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="w-full sm:w-auto"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          
          <Button
            onClick={() => handleExportReport('csv')}
            className="w-full sm:w-auto"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card">
          <div className="card-body">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Time Period"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                options={[
                  { value: '7d', label: 'Last 7 days' },
                  { value: '30d', label: 'Last 30 days' },
                  { value: '90d', label: 'Last 3 months' },
                  { value: '1y', label: 'Last year' },
                ]}
              />
              
              <Select
                label="Report Type"
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                options={[
                  { value: 'overview', label: 'Overview' },
                  { value: 'tasks', label: 'Task Analytics' },
                  { value: 'users', label: 'User Performance' },
                  { value: 'productivity', label: 'Productivity' },
                ]}
              />
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckSquare className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                <p className="text-2xl font-bold text-gray-900">
                  {summary.totalTasks || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {period === '7d' ? 'This week' : period === '30d' ? 'This month' : 'This period'}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {completionRate}%
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {completedTasks} completed
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">
                  {tasksByStatus.in_progress || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Active tasks
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-gray-900">
                  {summary.overdueCount || 0}
                </p>
                <p className="text-xs text-red-600 mt-1">
                  Need attention
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Status Distribution */}
        <Card>
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Task Status Distribution</h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {Object.entries(tasksByStatus).map(([status, count]) => {
                const percentage = summary.totalTasks > 0 
                  ? Math.round((count / summary.totalTasks) * 100) 
                  : 0;
                
                const statusConfig = {
                  pending: { label: 'Pending', color: 'bg-gray-500' },
                  in_progress: { label: 'In Progress', color: 'bg-blue-500' },
                  completed: { label: 'Completed', color: 'bg-green-500' },
                  approved: { label: 'Approved', color: 'bg-green-600' },
                  rejected: { label: 'Rejected', color: 'bg-red-500' },
                };

                const config = statusConfig[status] || { label: status, color: 'bg-gray-500' };

                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-2">
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
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={clsx('h-2 rounded-full', config.color)}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Priority Distribution */}
        <Card>
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Priority Distribution</h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {Object.entries(tasksByPriority).map(([priority, count]) => {
                const percentage = summary.totalTasks > 0 
                  ? Math.round((count / summary.totalTasks) * 100) 
                  : 0;
                
                const priorityConfig = {
                  low: { label: 'Low', color: 'bg-gray-500' },
                  medium: { label: 'Medium', color: 'bg-blue-500' },
                  high: { label: 'High', color: 'bg-yellow-500' },
                  urgent: { label: 'Urgent', color: 'bg-red-500' },
                };

                const config = priorityConfig[priority] || { label: priority, color: 'bg-gray-500' };

                return (
                  <div key={priority}>
                    <div className="flex items-center justify-between mb-2">
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
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={clsx('h-2 rounded-full', config.color)}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>

      {/* Completion Trend */}
      {completionTrend.length > 0 && (
        <Card>
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Completion Trend</h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {completionTrend.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-900">
                      {new Date(item.date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-600">
                      {item.completed} completed
                    </span>
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full"
                        style={{ 
                          width: `${item.total > 0 ? (item.completed / item.total) * 100 : 0}%` 
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Top Performers */}
      {hasPermission(['super_admin', 'manager']) && topPerformers.length > 0 && (
        <Card>
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Top Performers</h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {topPerformers.map((performer, index) => (
                <div key={performer.userId} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-8">
                      <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-700">
                          {performer.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        {performer.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {performer.completedTasks} tasks completed
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-green-600">
                      {Math.round(performer.completionRate)}%
                    </span>
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${performer.completionRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Export Options */}
      <Card>
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Export Reports</h3>
        </div>
        <div className="card-body">
          <p className="text-gray-600 mb-4">
            Download detailed reports in various formats for further analysis.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => handleExportReport('csv')}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExportReport('pdf')}
            >
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExportReport('xlsx')}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Reports;