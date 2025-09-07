import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { 
  Shield, 
  Search, 
  Filter, 
  Calendar,
  User,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Download,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import Select from '../../components/UI/Select';
import Card from '../../components/UI/Card';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

const AuditLogs = () => {
  const { user } = useAuth();
  
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [dateRange, setDateRange] = useState('7d');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(20);

  // Fetch audit logs with filters
  const { data: logsData, isLoading, error, refetch } = useQuery(
    ['audit-logs', { 
      page: currentPage, 
      limit, 
      search: searchTerm, 
      action: actionFilter !== 'all' ? actionFilter : undefined,
      userId: userFilter !== 'all' ? userFilter : undefined,
      dateRange
    }],
    async ({ queryKey }) => {
      const [, filters] = queryKey;
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value);
        }
      });
      
      const response = await api.get(`/audit/logs`);
      return response.data.data;
    },
    {
      keepPreviousData: true,
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  // Fetch users for filter
  const { data: users } = useQuery(
    'users-list-audit',
    async () => {
      const response = await api.get('/users');
      return response.data.data.users;
    }
  );

  // Export audit logs
  const handleExportLogs = async (format = 'csv') => {
    try {
      const params = new URLSearchParams({
        action: actionFilter !== 'all' ? actionFilter : '',
        userId: userFilter !== 'all' ? userFilter : '',
        dateRange,
        search: searchTerm,
        format
      });
      
      const response = await api.get(`/audit/export?${params.toString()}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit-logs-${dateRange}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Audit logs exported successfully');
    } catch (error) {
      toast.error('Failed to export audit logs');
    }
  };

  const getActionIcon = (action) => {
    const iconMap = {
      'user.login': CheckCircle,
      'user.logout': XCircle,
      'user.create': User,
      'user.update': User,
      'user.delete': XCircle,
      'task.create': CheckCircle,
      'task.update': Info,
      'task.delete': XCircle,
      'task.assign': User,
      'system.error': AlertTriangle,
      'system.warning': AlertTriangle,
      'system.info': Info,
    };
    
    const IconComponent = iconMap[action] || Activity;
    return <IconComponent className="h-4 w-4" />;
  };

  const getActionColor = (action) => {
    const colorMap = {
      'user.login': 'text-green-600',
      'user.logout': 'text-gray-600',
      'user.create': 'text-blue-600',
      'user.update': 'text-yellow-600',
      'user.delete': 'text-red-600',
      'task.create': 'text-green-600',
      'task.update': 'text-blue-600',
      'task.delete': 'text-red-600',
      'task.assign': 'text-purple-600',
      'system.error': 'text-red-600',
      'system.warning': 'text-yellow-600',
      'system.info': 'text-blue-600',
    };
    
    return colorMap[action] || 'text-gray-600';
  };

  const getActionLabel = (action) => {
    const labelMap = {
      'user.login': 'User Login',
      'user.logout': 'User Logout',
      'user.create': 'User Created',
      'user.update': 'User Updated',
      'user.delete': 'User Deleted',
      'task.create': 'Task Created',
      'task.update': 'Task Updated',
      'task.delete': 'Task Deleted',
      'task.assign': 'Task Assigned',
      'system.error': 'System Error',
      'system.warning': 'System Warning',
      'system.info': 'System Info',
    };
    
    return labelMap[action] || action;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDetails = (details) => {
    if (typeof details === 'string') return details;
    if (typeof details === 'object') {
      return Object.entries(details)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
    }
    return JSON.stringify(details);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Loading audit logs..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Failed to load audit logs
        </h3>
        <p className="text-gray-600">
          Please try refreshing the page or contact support if the problem persists.
        </p>
      </div>
    );
  }

  const logs = logsData?.logs || [];
  const totalPages = Math.ceil((logsData?.total || 0) / limit);
  console.log("logs",logs);
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-600 mt-1">
            Monitor system activity and security events
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => {
              refetch();
              toast.success('Audit logs refreshed');
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
            onClick={() => handleExportLogs('csv')}
            className="w-full sm:w-auto"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <div className="card-body">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Select
                  label="Action Type"
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Actions' },
                    { value: 'user.login', label: 'User Login' },
                    { value: 'user.logout', label: 'User Logout' },
                    { value: 'user.create', label: 'User Created' },
                    { value: 'user.update', label: 'User Updated' },
                    { value: 'user.delete', label: 'User Deleted' },
                    { value: 'task.create', label: 'Task Created' },
                    { value: 'task.update', label: 'Task Updated' },
                    { value: 'task.delete', label: 'Task Deleted' },
                    { value: 'system.error', label: 'System Error' },
                  ]}
                />
                
                <Select
                  label="User"
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Users' },
                    ...(users || []).map(user => ({
                      value: user._id,
                      label: user.name
                    }))
                  ]}
                />
                
                <Select
                  label="Date Range"
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  options={[
                    { value: '1d', label: 'Last 24 hours' },
                    { value: '7d', label: 'Last 7 days' },
                    { value: '30d', label: 'Last 30 days' },
                    { value: '90d', label: 'Last 3 months' },
                  ]}
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Audit Logs List */}
      <Card>
        <div className="card-body p-0">
          {logs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IP Address
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">
                            {formatDate(log.createdAt)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className={clsx('mr-2', getActionColor(log.action))}>
                            {getActionIcon(log.action)}
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {getActionLabel(log.action)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">
                            {log.user?.name || 'System'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600 max-w-xs truncate block">
                          {log.details ? formatDetails(log.details) : 'No details'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-500 font-mono">
                          {log.ipAddress || 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No audit logs found
              </h3>
              <p className="text-gray-600">
                {searchTerm || actionFilter !== 'all' || userFilter !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'System activity will appear here'
                }
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, logsData?.total || 0)} of {logsData?.total || 0} results
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

      {/* Security Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="card-body">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Successful Logins</p>
                <p className="text-xl font-bold text-gray-900">
                  {logs.filter(log => log.action === 'login').length}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="card-body">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Failed Login</p>
                <p className="text-xl font-bold text-gray-900">
                  {logs.filter(log => log.action === 'failed_login').length}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="card-body">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Activities</p>
                <p className="text-xl font-bold text-gray-900">
                  {logs.length}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AuditLogs;