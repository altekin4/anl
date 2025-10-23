"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("@/middleware/auth");
const EOSService_1 = require("@/services/EOSService");
const logger_1 = __importDefault(require("@/utils/logger"));
const router = (0, express_1.Router)();
/**
 * EOS Platform health check endpoint
 */
router.get('/health', async (req, res) => {
    try {
        const isHealthy = await EOSService_1.eosService.healthCheck();
        res.json({
            success: true,
            data: {
                eosConnection: isHealthy,
                timestamp: new Date().toISOString(),
                service: 'tercih-sihirbazi'
            }
        });
    }
    catch (error) {
        logger_1.default.error('EOS health check failed:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'EOS_HEALTH_CHECK_FAILED',
                message: 'EOS platform health check failed'
            }
        });
    }
});
/**
 * Get EOS platform configuration for frontend
 */
router.get('/config', auth_1.eosAuth, async (req, res) => {
    try {
        const config = {
            platformName: 'EOS Platform',
            theme: {
                primaryColor: '#2563eb',
                secondaryColor: '#64748b',
                backgroundColor: '#f8fafc',
                textColor: '#1e293b',
                headerColor: '#1e40af',
                sidebarColor: '#334155',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            },
            user: req.user ? {
                id: req.user.id,
                username: req.user.username,
                email: req.user.email,
                role: req.user.role,
                permissions: req.user.permissions || []
            } : null,
            navigation: [
                {
                    id: 'dashboard',
                    title: 'Dashboard',
                    url: '/eos/dashboard',
                    icon: 'dashboard',
                    order: 1,
                    isActive: false
                },
                {
                    id: 'tercih-sihirbazi',
                    title: 'Tercih Sihirbazı',
                    url: '/eos/tercih-sihirbazi',
                    icon: 'chat',
                    order: 2,
                    isActive: true,
                    permissions: ['tercih_sihirbazi.read']
                }
            ]
        };
        res.json({
            success: true,
            data: config
        });
    }
    catch (error) {
        logger_1.default.error('Failed to get EOS config:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'EOS_CONFIG_ERROR',
                message: 'Failed to retrieve EOS configuration'
            }
        });
    }
});
/**
 * Validate EOS token endpoint
 */
router.post('/validate-token', async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'MISSING_TOKEN',
                    message: 'Token is required'
                }
            });
        }
        const validationResult = await EOSService_1.eosService.validateToken(token);
        if (validationResult.success) {
            res.json({
                success: true,
                data: {
                    user: validationResult.user,
                    session: validationResult.session
                }
            });
        }
        else {
            res.status(401).json({
                success: false,
                error: {
                    code: 'INVALID_TOKEN',
                    message: validationResult.error || 'Token validation failed'
                }
            });
        }
    }
    catch (error) {
        logger_1.default.error('Token validation error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Token validation failed'
            }
        });
    }
});
/**
 * Log user activity to EOS platform
 */
router.post('/log-activity', auth_1.eosAuth, async (req, res) => {
    try {
        const { activity, metadata } = req.body;
        const token = req.headers['x-eos-token'];
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'User authentication required'
                }
            });
        }
        await EOSService_1.eosService.logActivity(req.user.id, activity, metadata, token);
        res.json({
            success: true,
            data: {
                message: 'Activity logged successfully'
            }
        });
    }
    catch (error) {
        logger_1.default.error('Failed to log activity:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'ACTIVITY_LOG_ERROR',
                message: 'Failed to log activity'
            }
        });
    }
});
/**
 * Get user permissions from EOS platform
 */
router.get('/permissions', auth_1.eosAuth, (0, auth_1.requirePermission)(['tercih_sihirbazi.read']), async (req, res) => {
    try {
        const token = req.headers['x-eos-token'];
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'User authentication required'
                }
            });
        }
        // Get fresh permissions from EOS platform
        const userInfo = await EOSService_1.eosService.getUserInfo(req.user.id, token);
        res.json({
            success: true,
            data: {
                permissions: userInfo?.permissions || req.user.permissions || [],
                role: req.user.role
            }
        });
    }
    catch (error) {
        logger_1.default.error('Failed to get permissions:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'PERMISSIONS_ERROR',
                message: 'Failed to retrieve permissions'
            }
        });
    }
});
/**
 * EOS platform iframe endpoint - serves the chat interface for embedding
 */
router.get('/embed', (req, res) => {
    try {
        // Add EOS-specific query parameters
        const eosParams = new URLSearchParams({
            eos: 'true',
            token: req.query.token || '',
            theme: req.query.theme || 'default'
        });
        // Redirect to main interface with EOS parameters
        res.redirect(`/?${eosParams.toString()}`);
    }
    catch (error) {
        logger_1.default.error('EOS embed error:', error);
        res.status(500).send('EOS integration error');
    }
});
exports.default = router;
//# sourceMappingURL=eosRoutes.js.map