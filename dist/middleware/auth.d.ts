import { Request, Response, NextFunction } from 'express';
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
export declare const authenticateToken: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
/**
 * Optional authentication middleware - doesn't fail if no token provided
 */
export declare const optionalAuth: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
/**
 * Role-based authorization middleware
 */
export declare const requireRole: (allowedRoles: string[]) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
/**
 * Permission-based authorization middleware for EOS platform
 */
export declare const requirePermission: (requiredPermissions: string[]) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
/**
 * EOS platform integration middleware
 * Handles authentication tokens from EOS platform
 */
export declare const eosAuth: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Development-only middleware that bypasses authentication
 */
export declare const devAuth: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map