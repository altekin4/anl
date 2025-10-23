import { EOSService } from '../EOSService';
import config from '@/config';
import axios from 'axios';

// Mock axios for testing
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('EOSService Integration Tests', () => {
  let eosService: EOSService;

  beforeEach(() => {
    eosService = new EOSService();
    jest.clearAllMocks();
  });

  describe('validateToken', () => {
    it('should successfully validate a valid EOS token', async () => {
      const mockUser = {
        id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        role: 'student',
        permissions: ['tercih_sihirbazi.read'],
        isActive: true
      };

      const mockSession = {
        sessionId: 'session123',
        userId: 'user123',
        username: 'testuser',
        role: 'student',
        permissions: ['tercih_sihirbazi.read'],
        expiresAt: new Date(Date.now() + 3600000),
        isActive: true
      };

      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: {
          success: true,
          user: mockUser,
          session: mockSession
        }
      });

      const result = await eosService.validateToken('valid-token');

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(result.session).toEqual(mockSession);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        `${config.eos.apiBaseUrl}/api/auth/validate`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer valid-token',
            'X-API-Key': config.eos.apiKey
          })
        })
      );
    });

    it('should handle invalid token validation', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          status: 401,
          data: {
            success: false,
            message: 'Invalid token'
          }
        }
      });

      const result = await eosService.validateToken('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid token');
    });

    it('should handle network errors during token validation', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      const result = await eosService.validateToken('token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Token validation failed');
    });
  });

  describe('getUserInfo', () => {
    it('should successfully retrieve user information', async () => {
      const mockUser = {
        id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        role: 'student',
        permissions: ['tercih_sihirbazi.read'],
        isActive: true
      };

      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: {
          success: true,
          user: mockUser
        }
      });

      const result = await eosService.getUserInfo('user123', 'valid-token');

      expect(result).toEqual(mockUser);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        `${config.eos.apiBaseUrl}/api/users/user123`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer valid-token',
            'X-API-Key': config.eos.apiKey
          })
        })
      );
    });

    it('should return null for non-existent user', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          status: 404,
          data: {
            success: false,
            message: 'User not found'
          }
        }
      });

      const result = await eosService.getUserInfo('nonexistent', 'valid-token');

      expect(result).toBeNull();
    });
  });

  describe('checkPermissions', () => {
    it('should return true when user has required permissions', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: {
          success: true,
          hasPermissions: true
        }
      });

      const result = await eosService.checkPermissions(
        'user123',
        ['tercih_sihirbazi.read'],
        'valid-token'
      );

      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${config.eos.apiBaseUrl}/api/auth/check-permissions`,
        {
          userId: 'user123',
          permissions: ['tercih_sihirbazi.read']
        },
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer valid-token',
            'X-API-Key': config.eos.apiKey
          })
        })
      );
    });

    it('should return false when user lacks required permissions', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: {
          success: true,
          hasPermissions: false
        }
      });

      const result = await eosService.checkPermissions(
        'user123',
        ['tercih_sihirbazi.admin'],
        'valid-token'
      );

      expect(result).toBe(false);
    });

    it('should return false on permission check error', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Permission check failed'));

      const result = await eosService.checkPermissions(
        'user123',
        ['tercih_sihirbazi.read'],
        'valid-token'
      );

      expect(result).toBe(false);
    });
  });

  describe('logActivity', () => {
    it('should successfully log user activity', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { success: true }
      });

      await expect(
        eosService.logActivity(
          'user123',
          'tercih_sihirbazi_access',
          { ip: '127.0.0.1' },
          'valid-token'
        )
      ).resolves.not.toThrow();

      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${config.eos.apiBaseUrl}/api/audit/log`,
        expect.objectContaining({
          userId: 'user123',
          service: 'tercih-sihirbazi',
          activity: 'tercih_sihirbazi_access',
          metadata: { ip: '127.0.0.1' }
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer valid-token',
            'X-API-Key': config.eos.apiKey
          })
        })
      );
    });

    it('should handle activity logging errors gracefully', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Logging failed'));

      // Should not throw error even if logging fails
      await expect(
        eosService.logActivity('user123', 'test_activity', {}, 'valid-token')
      ).resolves.not.toThrow();
    });

    it('should skip logging when no token provided', async () => {
      await eosService.logActivity('user123', 'test_activity');

      expect(mockedAxios.post).not.toHaveBeenCalled();
    });
  });

  describe('getSession', () => {
    it('should successfully retrieve session information', async () => {
      const mockSession = {
        sessionId: 'session123',
        userId: 'user123',
        username: 'testuser',
        role: 'student',
        permissions: ['tercih_sihirbazi.read'],
        expiresAt: new Date(Date.now() + 3600000),
        isActive: true
      };

      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: {
          success: true,
          session: mockSession
        }
      });

      const result = await eosService.getSession('session123', 'valid-token');

      expect(result).toEqual(mockSession);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        `${config.eos.apiBaseUrl}/api/sessions/session123`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer valid-token',
            'X-API-Key': config.eos.apiKey
          })
        })
      );
    });

    it('should return null for invalid session', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          status: 404,
          data: {
            success: false,
            message: 'Session not found'
          }
        }
      });

      const result = await eosService.getSession('invalid-session', 'valid-token');

      expect(result).toBeNull();
    });
  });

  describe('healthCheck', () => {
    it('should return true when EOS service is healthy', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: { status: 'healthy' }
      });

      const result = await eosService.healthCheck();

      expect(result).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        `${config.eos.apiBaseUrl}/api/health`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-Key': config.eos.apiKey
          })
        })
      );
    });

    it('should return false when EOS service is unhealthy', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Service unavailable'));

      const result = await eosService.healthCheck();

      expect(result).toBe(false);
    });
  });
});