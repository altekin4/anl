import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '@/utils/errors';
import config from '@/config';
import logger from '@/utils/logger';
import { eosService } from '@/services/EOSService';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    email: string;
    role: string;
    eosUserId?: string;
    permissions: string[];
  };
}

export interface EOSUser {
  id: string;
  username: string;
  email: string;
  role: string;
  permissions: string[];
  isActive: boolean;
}

/**
 * JWT Authentication middleware
 */
export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      // Check for token in headers (for EOS integration)
      const headerToken = req.headers['x-auth-token'] as string;
      if (!headerToken) {
        throw new UnauthorizedError('Access token required');
      }
    }

    const tokenToVerify = token || req.headers['x-auth-token'] as string;

    jwt.verify(tokenToVerify, config.jwt.secret, (err: any, decoded: any) => {
      if (err) {
        logger.warn('JWT verification failed:', err.message);
        throw new UnauthorizedError('Invalid or expired token');
      }

      // Extract user information from token
      req.user = {
        id: decoded.userId || decoded.id || decoded.sub,
        username: decoded.username || decoded.name,
        email: decoded.email,
        role: decoded.role || 'student',
        permissions: decoded.permissions || [],
      };

      // Also set user ID in headers for consistency
      req.headers['x-user-id'] = req.user!.id;
      req.headers['x-user-role'] = req.user!.role;

      next();
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token provided
 */
export const optionalAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    const headerToken = req.headers['x-auth-token'] as string;

    if (!token && !headerToken) {
      // No token provided, continue without authentication
      return next();
    }

    const tokenToVerify = token || headerToken;

    jwt.verify(tokenToVerify, config.jwt.secret, (err: any, decoded: any) => {
      if (err) {
        logger.warn('Optional JWT verification failed:', err.message);
        // Continue without authentication
        return next();
      }

      // Set user information if token is valid
      req.user = {
        id: decoded.userId || decoded.id || decoded.sub,
        username: decoded.username || decoded.name,
        email: decoded.email,
        role: decoded.role || 'student',
        permissions: decoded.permissions || [],
      };

      req.headers['x-user-id'] = req.user!.id;
      req.headers['x-user-role'] = req.user!.role;

      next();
    });
  } catch (error) {
    // Continue without authentication on any error
    next();
  }
};

/**
 * Role-based authorization middleware
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      if (!allowedRoles.includes(req.user.role)) {
        throw new UnauthorizedError(`Access denied. Required roles: ${allowedRoles.join(', ')}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Permission-based authorization middleware for EOS platform
 */
export const requirePermission = (requiredPermissions: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      // Check if user has EOS permissions
      if (req.user.permissions && req.user.permissions.length > 0) {
        const hasPermission = requiredPermissions.some(permission => 
          req.user!.permissions!.includes(permission)
        );

        if (!hasPermission) {
          throw new UnauthorizedError(`Access denied. Required permissions: ${requiredPermissions.join(', ')}`);
        }
      } else {
        // Fall back to role-based check for non-EOS users
        const rolePermissionMap: Record<string, string[]> = {
          'admin': ['tercih_sihirbazi.admin', 'tercih_sihirbazi.read', 'tercih_sihirbazi.write'],
          'teacher': ['tercih_sihirbazi.read', 'tercih_sihirbazi.write'],
          'student': ['tercih_sihirbazi.read'],
          'parent': ['tercih_sihirbazi.read'],
        };

        const userPermissions = rolePermissionMap[req.user.role] || [];
        const hasPermission = requiredPermissions.some(permission => 
          userPermissions.includes(permission)
        );

        if (!hasPermission) {
          throw new UnauthorizedError(`Access denied. Required permissions: ${requiredPermissions.join(', ')}`);
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Duplicate import removed

/**
 * EOS platform integration middleware
 * Handles authentication tokens from EOS platform
 */
export const eosAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check for EOS-specific headers
    const eosToken = req.headers['x-eos-token'] as string;
    const eosUserId = req.headers['x-eos-user-id'] as string;

    if (eosToken) {
      // Validate EOS token with EOS service
      const validationResult = await eosService.validateToken(eosToken);
      
      if (validationResult.success && validationResult.user && validationResult.user.isActive) {
        const eosUser = validationResult.user;
        req.user = {
          id: eosUser.id,
          username: eosUser.username,
          email: eosUser.email,
          role: eosUser.role,
          eosUserId: eosUser.id,
          permissions: eosUser.permissions,
        };

        // Set headers for downstream services
        req.headers['x-user-id'] = req.user.id;
        req.headers['x-user-role'] = req.user.role;
        req.headers['x-eos-user-id'] = eosUser.id;

        // Log user activity
        await eosService.logActivity(
          eosUser.id,
          'tercih_sihirbazi_access',
          { userAgent: req.headers['user-agent'], ip: req.ip },
          eosToken
        );

        logger.debug(`EOS user authenticated: ${eosUser.id} (${eosUser.username})`);
        return next();
      } else {
        logger.warn(`EOS token validation failed: ${validationResult.error}`);
        throw new UnauthorizedError(validationResult.error || 'Invalid EOS token or inactive user');
      }
    }

    // Check for legacy EOS headers (for backward compatibility)
    if (eosUserId) {
      const eosRole = req.headers['x-eos-user-role'] as string;
      const eosUsername = req.headers['x-eos-username'] as string;
      const eosEmail = req.headers['x-eos-email'] as string;

      if (eosRole && eosUsername) {
        req.user = {
          id: eosUserId,
          username: eosUsername,
          email: eosEmail || '',
          role: eosRole,
          eosUserId: eosUserId,
          permissions: [],
        };

        req.headers['x-user-id'] = req.user.id;
        req.headers['x-user-role'] = req.user.role;

        logger.debug(`EOS user authenticated via legacy headers: ${eosUserId}`);
        return next();
      }
    }

    // Fall back to regular JWT authentication
    authenticateToken(req, res, next);
  } catch (error) {
    next(error);
  }
};

/**
 * Development-only middleware that bypasses authentication
 */
export const devAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (config.nodeEnv === 'development') {
    // Set a default user for development
    req.user = {
      id: req.headers['x-user-id'] as string || 'dev-user-1',
      username: 'dev-user',
      email: 'dev@example.com',
      role: req.headers['x-user-role'] as string || 'student',
      permissions: [],
    };

    req.headers['x-user-id'] = req.user!.id;
    req.headers['x-user-role'] = req.user!.role;

    logger.debug('Development authentication bypassed');
    return next();
  }

  // In production, use regular authentication
  authenticateToken(req, res, next);
};