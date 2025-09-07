const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Verify JWT token middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated.'
      });
    }

    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to multiple failed login attempts.'
      });
    }

    // Check session timeout
    const sessionTimeout = parseInt(process.env.SESSION_TIMEOUT) || 900000; // 15 minutes
    if (user.lastLogin && (Date.now() - user.lastLogin.getTime()) > sessionTimeout) {
      // Log session timeout
      await AuditLog.logAction({
        user: user._id,
        action: 'logout',
        resource: 'auth',
        details: { reason: 'session_timeout' },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        category: 'security'
      });

      return res.status(401).json({
        success: false,
        message: 'Session expired. Please login again.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please login again.'
      });
    }

    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed.'
    });
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (!roles.includes(req.user.role)) {
      // Log unauthorized access attempt
      AuditLog.logAction({
        user: req.user._id,
        action: 'system_access',
        resource: 'system',
        details: { 
          attempted_role: roles,
          user_role: req.user.role,
          endpoint: req.originalUrl,
          method: req.method
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        success: false,
        severity: 'medium',
        category: 'security'
      });

      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
};

// Team-based authorization (for managers to access their team data)
const authorizeTeamAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    // Super admin has access to everything
    if (req.user.role === 'super_admin') {
      return next();
    }

    // For managers, check if they're accessing their team member's data
    if (req.user.role === 'manager') {
      const targetUserId = req.params.userId || req.body.assignedTo || req.query.userId;
      
      if (targetUserId) {
        const targetUser = await User.findById(targetUserId);
        
        if (!targetUser) {
          return res.status(404).json({
            success: false,
            message: 'User not found.'
          });
        }

        // Check if target user is in manager's team or is the manager themselves
        if (targetUser.managerId?.toString() !== req.user._id.toString() && 
            targetUserId !== req.user._id.toString()) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. You can only access your team members data.'
          });
        }
      }
    }

    // For employees, they can only access their own data
    if (req.user.role === 'employee') {
      const targetUserId = req.params.userId || req.body.assignedTo || req.query.userId;
      
      if (targetUserId && targetUserId !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only access your own data.'
        });
      }
    }

    next();
  } catch (error) {
    console.error('Team authorization error:', error);
    res.status(500).json({
      success: false,
      message: 'Authorization failed.'
    });
  }
};

// Optional authentication (for public endpoints that can benefit from user context)
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (user && user.isActive && !user.isLocked) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication for optional auth
    next();
  }
};

// Rate limiting for sensitive operations
const sensitiveOperationLimit = (req, res, next) => {
  // This would typically integrate with Redis for distributed rate limiting
  // For now, we'll use a simple in-memory approach
  const key = `${req.ip}-${req.user?._id || 'anonymous'}`;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;

  if (!global.rateLimitStore) {
    global.rateLimitStore = new Map();
  }

  const userAttempts = global.rateLimitStore.get(key) || [];
  const recentAttempts = userAttempts.filter(time => now - time < windowMs);

  if (recentAttempts.length >= maxAttempts) {
    return res.status(429).json({
      success: false,
      message: 'Too many attempts. Please try again later.'
    });
  }

  recentAttempts.push(now);
  global.rateLimitStore.set(key, recentAttempts);

  next();
};

module.exports = {
  generateToken,
  authenticate,
  authorize,
  authorizeTeamAccess,
  optionalAuth,
  sensitiveOperationLimit
};