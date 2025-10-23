"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.eosService = exports.EOSService = void 0;
const axios_1 = __importDefault(require("axios"));
const config_1 = __importDefault(require("@/config"));
const logger_1 = __importDefault(require("@/utils/logger"));
class EOSService {
    constructor() {
        this.timeout = 5000;
        this.apiBaseUrl = config_1.default.eos.apiBaseUrl;
        this.apiKey = config_1.default.eos.apiKey;
    }
    /**
     * Validates an EOS authentication token
     */
    async validateToken(token) {
        try {
            if (!this.apiBaseUrl || !this.apiKey) {
                logger_1.default.warn('EOS API configuration missing');
                return { success: false, error: 'EOS API not configured' };
            }
            const response = await axios_1.default.get(`${this.apiBaseUrl}/api/auth/validate`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-API-Key': this.apiKey,
                    'Content-Type': 'application/json',
                },
                timeout: this.timeout,
            });
            if (response.status === 200 && response.data.success) {
                return {
                    success: true,
                    user: response.data.user,
                    session: response.data.session,
                };
            }
            return { success: false, error: 'Invalid token' };
        }
        catch (error) {
            logger_1.default.warn('EOS token validation failed:', {
                error: error.message,
                status: error.response?.status,
                data: error.response?.data,
            });
            return {
                success: false,
                error: error.response?.data?.message || 'Token validation failed'
            };
        }
    }
    /**
     * Gets user information from EOS platform
     */
    async getUserInfo(userId, token) {
        try {
            const response = await axios_1.default.get(`${this.apiBaseUrl}/api/users/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-API-Key': this.apiKey,
                },
                timeout: this.timeout,
            });
            if (response.status === 200 && response.data.success) {
                return response.data.user;
            }
            return null;
        }
        catch (error) {
            logger_1.default.warn('Failed to get EOS user info:', {
                userId,
                error: error.message,
                status: error.response?.status,
            });
            return null;
        }
    }
    /**
     * Checks if user has specific permissions in EOS platform
     */
    async checkPermissions(userId, permissions, token) {
        try {
            const response = await axios_1.default.post(`${this.apiBaseUrl}/api/auth/check-permissions`, {
                userId,
                permissions,
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-API-Key': this.apiKey,
                    'Content-Type': 'application/json',
                },
                timeout: this.timeout,
            });
            return response.status === 200 && response.data.success && response.data.hasPermissions;
        }
        catch (error) {
            logger_1.default.warn('Failed to check EOS permissions:', {
                userId,
                permissions,
                error: error.message,
            });
            return false;
        }
    }
    /**
     * Logs user activity to EOS platform for audit purposes
     */
    async logActivity(userId, activity, metadata, token) {
        try {
            if (!token) {
                logger_1.default.debug('No token provided for activity logging');
                return;
            }
            await axios_1.default.post(`${this.apiBaseUrl}/api/audit/log`, {
                userId,
                service: 'tercih-sihirbazi',
                activity,
                metadata,
                timestamp: new Date().toISOString(),
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-API-Key': this.apiKey,
                    'Content-Type': 'application/json',
                },
                timeout: this.timeout,
            });
            logger_1.default.debug(`Activity logged for user ${userId}: ${activity}`);
        }
        catch (error) {
            logger_1.default.warn('Failed to log activity to EOS:', {
                userId,
                activity,
                error: error.message,
            });
            // Don't throw error as activity logging is not critical
        }
    }
    /**
     * Gets user's session information from EOS platform
     */
    async getSession(sessionId, token) {
        try {
            const response = await axios_1.default.get(`${this.apiBaseUrl}/api/sessions/${sessionId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-API-Key': this.apiKey,
                },
                timeout: this.timeout,
            });
            if (response.status === 200 && response.data.success) {
                return response.data.session;
            }
            return null;
        }
        catch (error) {
            logger_1.default.warn('Failed to get EOS session:', {
                sessionId,
                error: error.message,
            });
            return null;
        }
    }
    /**
     * Checks if EOS service is available
     */
    async healthCheck() {
        try {
            const response = await axios_1.default.get(`${this.apiBaseUrl}/api/health`, {
                headers: {
                    'X-API-Key': this.apiKey,
                },
                timeout: 3000,
            });
            return response.status === 200;
        }
        catch (error) {
            logger_1.default.warn('EOS health check failed:', error);
            return false;
        }
    }
}
exports.EOSService = EOSService;
// Export singleton instance
exports.eosService = new EOSService();
//# sourceMappingURL=EOSService.js.map