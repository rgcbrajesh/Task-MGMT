import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Users, 
  BarChart3, 
  Plus
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { clsx } from 'clsx';

const MobileNavigation = () => {
  const { hasPermission } = useAuth();
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
      name: 'Create',
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
  ];

  const filteredNavigation = navigation.filter(item => 
    hasPermission(item.roles)
  );

  return (
    <div className="mobile-nav safe-bottom">
      <div className="flex justify-around">
        {filteredNavigation.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
          
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive: navIsActive }) =>
                clsx(
                  'mobile-nav-item',
                  (isActive || navIsActive) && 'active'
                )
              }
            >
              <item.icon className="h-5 w-5 mb-1" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
};

export default MobileNavigation;