import axios, { AxiosResponse } from 'axios';
import config from '@/config';
import logger from '@/utils/logger';
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

export class EOSService {
  private readonly apiBaseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number = 5000;

  constructor() {
    this.apiBaseUrl = config.eos.apiBaseUrl;
    this.apiKey = config.eos.apiKey;
  }

  /**
   * Validates an EOS authentication token
   */
  async validateToken(token: string): Promise<EOSValidationResponse> {
    try {
      if (!this.apiBaseUrl || !this.apiKey) {
        logger.warn('EOS API configuration missing');
        return { success: false, error: 'EOS API not configured' };
      }

      const response: AxiosResponse = await axios.get(
        `${this.apiBaseUrl}/api/auth/validate`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-API-Key': this.apiKey,
            'Content-Type': 'application/json',
          },
          timeout: this.timeout,
        }
      );

      if (response.status === 200 && response.data.success) {
        return {
          success: true,
          user: response.data.user,
          session: response.data.session,
        };
      }

      return { success: false, error: 'Invalid token' };
    } catch (error: any) {
      logger.warn('EOS token validation failed:', {
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
  async getUserInfo(userId: string, token: string): Promise<EOSUser | null> {
    try {
      const response: AxiosResponse = await axios.get(
        `${this.apiBaseUrl}/api/users/${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-API-Key': this.apiKey,
          },
          timeout: this.timeout,
        }
      );

      if (response.status === 200 && response.data.success) {
        return response.data.user;
      }

      return null;
    } catch (error: any) {
      logger.warn('Failed to get EOS user info:', {
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
  async checkPermissions(userId: string, permissions: string[], token: string): Promise<boolean> {
    try {
      const response: AxiosResponse = await axios.post(
        `${this.apiBaseUrl}/api/auth/check-permissions`,
        {
          userId,
          permissions,
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-API-Key': this.apiKey,
            'Content-Type': 'application/json',
          },
          timeout: this.timeout,
        }
      );

      return response.status === 200 && response.data.success && response.data.hasPermissions;
    } catch (error: any) {
      logger.warn('Failed to check EOS permissions:', {
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
  async logActivity(userId: string, activity: string, metadata?: any, token?: string): Promise<void> {
    try {
      if (!token) {
        logger.debug('No token provided for activity logging');
        return;
      }

      await axios.post(
        `${this.apiBaseUrl}/api/audit/log`,
        {
          userId,
          service: 'tercih-sihirbazi',
          activity,
          metadata,
          timestamp: new Date().toISOString(),
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-API-Key': this.apiKey,
            'Content-Type': 'application/json',
          },
          timeout: this.timeout,
        }
      );

      logger.debug(`Activity logged for user ${userId}: ${activity}`);
    } catch (error: any) {
      logger.warn('Failed to log activity to EOS:', {
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
  async getSession(sessionId: string, token: string): Promise<EOSSession | null> {
    try {
      const response: AxiosResponse = await axios.get(
        `${this.apiBaseUrl}/api/sessions/${sessionId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-API-Key': this.apiKey,
          },
          timeout: this.timeout,
        }
      );

      if (response.status === 200 && response.data.success) {
        return response.data.session;
      }

      return null;
    } catch (error: any) {
      logger.warn('Failed to get EOS session:', {
        sessionId,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Checks if EOS service is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response: AxiosResponse = await axios.get(
        `${this.apiBaseUrl}/api/health`,
        {
          headers: {
            'X-API-Key': this.apiKey,
          },
          timeout: 3000,
        }
      );

      return response.status === 200;
    } catch (error) {
      logger.warn('EOS health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const eosService = new EOSService();