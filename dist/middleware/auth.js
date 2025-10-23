"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.devAuth = exports.eosAuth = exports.requirePermission = exports.requireRole = exports.optionalAuth = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const errors_1 = require("@/utils/errors");
const config_1 = __importDefault(require("@/config"));
const logger_1 = __importDefault(require("@/utils/logger"));
const EOSService_1 = require("@/services/EOSService");
/**
 * JWT Authentication middleware
 */
const authenticateToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
        if (!token) {
            // Check for token in headers (for EOS integration)
            const headerToken = req.headers['x-auth-token'];
            if (!headerToken) {
                throw new errors_1.UnauthorizedError('Access token required');
            }
        }
        const tokenToVerify = token || req.headers['x-auth-token'];
        jsonwebtoken_1.default.verify(tokenToVerify, config_1.default.jwt.secret, (err, decoded) => {
            if (err) {
                logger_1.default.warn('JWT verification failed:', err.message);
                throw new errors_1.UnauthorizedError('Invalid or expired token');
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
            req.headers['x-user-id'] = req.user.id;
            req.headers['x-user-role'] = req.user.role;
            next();
        });
    }
    catch (error) {
        next(error);
    }
};
exports.authenticateToken = authenticateToken;
/**
 * Optional authentication middleware - doesn't fail if no token provided
 */
const optionalAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        const headerToken = req.headers['x-auth-token'];
        if (!token && !headerToken) {
            // No token provided, continue without authentication
            return next();
        }
        const tokenToVerify = token || headerToken;
        jsonwebtoken_1.default.verify(tokenToVerify, config_1.default.jwt.secret, (err, decoded) => {
            if (err) {
                logger_1.default.warn('Optional JWT verification failed:', err.message);
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
            req.headers['x-user-id'] = req.user.id;
            req.headers['x-user-role'] = req.user.role;
            next();
        });
    }
    catch (error) {
        // Continue without authentication on any error
        next();
    }
};
exports.optionalAuth = optionalAuth;
/**
 * Role-based authorization middleware
 */
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                throw new errors_1.UnauthorizedError('Authentication required');
            }
            if (!allowedRoles.includes(req.user.role)) {
                throw new errors_1.UnauthorizedError(`Access denied. Required roles: ${allowedRoles.join(', ')}`);
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.requireRole = requireRole;
/**
 * Permission-based authorization middleware for EOS platform
 */
const requirePermission = (requiredPermissions) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                throw new errors_1.UnauthorizedError('Authentication required');
            }
            // Check if user has EOS permissions
            if (req.user.permissions && req.user.permissions.length > 0) {
                const hasPermission = requiredPermissions.some(permission => req.user.permissions.includes(permission));
                if (!hasPermission) {
                    throw new errors_1.UnauthorizedError(`Access denied. Required permissions: ${requiredPermissions.join(', ')}`);
                }
            }
            else {
                // Fall back to role-based check for non-EOS users
                const rolePermissionMap = {
                    'admin': ['tercih_sihirbazi.admin', 'tercih_sihirbazi.read', 'tercih_sihirbazi.write'],
                    'teacher': ['tercih_sihirbazi.read', 'tercih_sihirbazi.write'],
                    'student': ['tercih_sihirbazi.read'],
                    'parent': ['tercih_sihirbazi.read'],
                };
                const userPermissions = rolePermissionMap[req.user.role] || [];
                const hasPermission = requiredPermissions.some(permission => userPermissions.includes(permission));
                if (!hasPermission) {
                    throw new errors_1.UnauthorizedError(`Access denied. Required permissions: ${requiredPermissions.join(', ')}`);
                }
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.requirePermission = requirePermission;
// Duplicate import removed
/**
 * EOS platform integration middleware
 * Handles authentication tokens from EOS platform
 */
const eosAuth = async (req, res, next) => {
    try {
        // Check for EOS-specific headers
        const eosToken = req.headers['x-eos-token'];
        const eosUserId = req.headers['x-eos-user-id'];
        if (eosToken) {
            // Validate EOS token with EOS service
            const validationResult = await EOSService_1.eosService.validateToken(eosToken);
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
                await EOSService_1.eosService.logActivity(eosUser.id, 'tercih_sihirbazi_access', { userAgent: req.headers['user-agent'], ip: req.ip }, eosToken);
                logger_1.default.debug(`EOS user authenticated: ${eosUser.id} (${eosUser.username})`);
                return next();
            }
            else {
                logger_1.default.warn(`EOS token validation failed: ${validationResult.error}`);
                throw new errors_1.UnauthorizedError(validationResult.error || 'Invalid EOS token or inactive user');
            }
        }
        // Check for legacy EOS headers (for backward compatibility)
        if (eosUserId) {
            const eosRole = req.headers['x-eos-user-role'];
            const eosUsername = req.headers['x-eos-username'];
            const eosEmail = req.headers['x-eos-email'];
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
                logger_1.default.debug(`EOS user authenticated via legacy headers: ${eosUserId}`);
                return next();
            }
        }
        // Fall back to regular JWT authentication
        (0, exports.authenticateToken)(req, res, next);
    }
    catch (error) {
        next(error);
    }
};
exports.eosAuth = eosAuth;
/**
 * Development-only middleware that bypasses authentication
 */
const devAuth = (req, res, next) => {
    if (config_1.default.nodeEnv === 'development') {
        // Set a default user for development
        req.user = {
            id: req.headers['x-user-id'] || 'dev-user-1',
            username: 'dev-user',
            email: 'dev@example.com',
            role: req.headers['x-user-role'] || 'student',
            permissions: [],
        };
        req.headers['x-user-id'] = req.user.id;
        req.headers['x-user-role'] = req.user.role;
        logger_1.default.debug('Development authentication bypassed');
        return next();
    }
    // In production, use regular authentication
    (0, exports.authenticateToken)(req, res, next);
};
exports.devAuth = devAuth;
//# sourceMappingURL=auth.js.map