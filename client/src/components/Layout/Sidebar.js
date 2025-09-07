import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Users, 
  BarChart3, 
  Shield, 
  X,
  Smartphone,
  Plus
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { clsx } from 'clsx';

const Sidebar = ({ onClose }) => {
  const { user, hasPermission } = useAuth();
  const location = useLocation();

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      roles: ['super_admin', 'manager', 'employee'],
    },
    {
      name: 'Tasks',
      href: '/tasks',
      icon: CheckSquare,
      roles: ['super_admin', 'manager', 'employee'],
    },
    {
      name: 'Create Task',
      href: '/tasks/create',
      icon: Plus,
      roles: ['super_admin', 'manager'],
    },
    {
      name: 'Users',
      href: '/users',
      icon: Users,
      roles: ['super_admin', 'manager'],
    },
    {
      name: 'Reports',
      href: '/reports',
      icon: BarChart3,
      roles: ['super_admin', 'manager'],
    },
    {
      name: 'Audit Logs',
      href: '/audit',
      icon: Shield,
      roles: ['super_admin'],
    },
  ];

  const filteredNavigation = navigation.filter(item => 
    hasPermission(item.roles)
  );

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
        <div className="flex items-center">
          <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <Smartphone className="h-5 w-5 text-white" />
          </div>
          <span className="ml-2 text-lg font-semibold text-gray-900">
            Task Manager
          </span>
        </div>
        {onClose && (
          <button
            type="button"
            className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            onClick={onClose}
          >
            <X className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* User Info */}
      <div className="px-4 py-4 border-b border-gray-200">
        <div className="flex items-center">
          <div className="h-10 w-10 rounded-full bg-primary-600 flex items-center justify-center">
            <span className="text-sm font-medium text-white">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">{user?.name}</p>
            <p className="text-xs text-gray-500 capitalize">
              {user?.role?.replace('_', ' ')}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {filteredNavigation.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
          
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive: navIsActive }) =>
                clsx(
                  'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-200',
                  isActive || navIsActive
                    ? 'bg-primary-100 text-primary-900 border-r-2 border-primary-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )
              }
              onClick={onClose}
            >
              <item.icon
                className={clsx(
                  'mr-3 flex-shrink-0 h-5 w-5',
                  isActive
                    ? 'text-primary-600'
                    : 'text-gray-400 group-hover:text-gray-500'
                )}
              />
              {item.name}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          <p>Task Management System</p>
          <p className="mt-1">v1.0.0</p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;