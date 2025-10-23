import { EOSUser } from '@/middleware/auth';
export interface EOSSession {
    sessionId: string;
    userId: string;
    username: string;
    role: string;
    permissions: string[];
    expiresAt: Date;
    isActive: boolean;
}
export interface EOSValidationResponse {
    success: boolean;
    user?: EOSUser;
    session?: EOSSession;
    error?: string;
}
export declare class EOSService {
    private readonly apiBaseUrl;
    private readonly apiKey;
    private readonly timeout;
    constructor();
    /**
     * Validates an EOS authentication token
     */
    validateToken(token: string): Promise<EOSValidationResponse>;
    /**
     * Gets user information from EOS platform
     */
    getUserInfo(userId: string, token: string): Promise<EOSUser | null>;
    /**
     * Checks if user has specific permissions in EOS platform
     */
    checkPermissions(userId: string, permissions: string[], token: string): Promise<boolean>;
    /**
     * Logs user activity to EOS platform for audit purposes
     */
    logActivity(userId: string, activity: string, metadata?: any, token?: string): Promise<void>;
    /**
     * Gets user's session information from EOS platform
     */
    getSession(sessionId: string, token: string): Promise<EOSSession | null>;
    /**
     * Checks if EOS service is available
     */
    healthCheck(): Promise<boolean>;
}
export declare const eosService: EOSService;
//# sourceMappingURL=EOSService.d.ts.map