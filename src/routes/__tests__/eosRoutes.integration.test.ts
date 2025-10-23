import request from 'supertest';
import express from 'express';
import eosRoutes from '../eosRoutes';
import { eosService } from '@/services/EOSService';

// Mock the EOS service
jest.mock('@/services/EOSService');
const mockedEOSService = eosService as jest.Mocked<typeof eosService>;

// Mock the auth middleware
jest.mock('@/middleware/auth', () => ({
  eosAuth: (req: any, res: any, next: any) => {
    // Mock authenticated user
    req.user = {
      id: 'user123',
      username: 'testuser',
      email: 'test@example.com',
      role: 'student',
      permissions: ['tercih_sihirbazi.read']
    };
    next();
  },
  requirePermission: (permissions: string[]) => (req: any, res: any, next: any) => {
    if (req.user && req.user.permissions.some((p: string) => permissions.includes(p))) {
      next();
    } else {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
    }
  }
}));

describe('EOS Routes Integration Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/eos', eosRoutes);
    jest.clearAllMocks();
  });

  describe('GET /api/eos/health', () => {
    it('should return healthy status when EOS service is available', async () => {
      mockedEOSService.healthCheck.mockResolvedValueOnce(true);

      const response = await request(app)
        .get('/api/eos/health')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          eosConnection: true,
          timestamp: expect.any(String),
          service: 'tercih-sihirbazi'
        }
      });
    });

    it('should return unhealthy status when EOS service is unavailable', async () => {
      mockedEOSService.healthCheck.mockResolvedValueOnce(false);

      const response = await request(app)
        .get('/api/eos/health')
        .expect(200);

      expect(response.body.data.eosConnection).toBe(false);
    });

    it('should handle health check errors', async () => {
      mockedEOSService.healthCheck.mockRejectedValueOnce(new Error('Health check failed'));

      const response = await request(app)
        .get('/api/eos/health')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'EOS_HEALTH_CHECK_FAILED',
          message: 'EOS platform health check failed'
        }
      });
    });
  });

  describe('GET /api/eos/config', () => {
    it('should return EOS platform configuration', async () => {
      const response = await request(app)
        .get('/api/eos/config')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('platformName', 'EOS Platform');
      expect(response.body.data).toHaveProperty('theme');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('navigation');
      expect(response.body.data.user).toEqual({
        id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        role: 'student',
        permissions: ['tercih_sihirbazi.read']
      });
    });

    it('should include navigation items with proper structure', async () => {
      const response = await request(app)
        .get('/api/eos/config')
        .expect(200);

      const navigation = response.body.data.navigation;
      expect(Array.isArray(navigation)).toBe(true);
      expect(navigation).toContainEqual(
        expect.objectContaining({
          id: 'tercih-sihirbazi',
          title: 'Tercih Sihirbazı',
          isActive: true,
          permissions: ['tercih_sihirbazi.read']
        })
      );
    });
  });

  describe('POST /api/eos/validate-token', () => {
    it('should validate a valid EOS token', async () => {
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

      mockedEOSService.validateToken.mockResolvedValueOnce({
        success: true,
        user: mockUser,
        session: mockSession
      });

      const response = await request(app)
        .post('/api/eos/validate-token')
        .send({ token: 'valid-token' })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          user: mockUser,
          session: mockSession
        }
      });
    });

    it('should reject invalid token', async () => {
      mockedEOSService.validateToken.mockResolvedValueOnce({
        success: false,
        error: 'Invalid token'
      });

      const response = await request(app)
        .post('/api/eos/validate-token')
        .send({ token: 'invalid-token' })
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid token'
        }
      });
    });

    it('should require token parameter', async () => {
      const response = await request(app)
        .post('/api/eos/validate-token')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Token is required'
        }
      });
    });
  });

  describe('POST /api/eos/log-activity', () => {
    it('should log user activity successfully', async () => {
      mockedEOSService.logActivity.mockResolvedValueOnce();

      const response = await request(app)
        .post('/api/eos/log-activity')
        .set('x-eos-token', 'valid-token')
        .send({
          activity: 'test_activity',
          metadata: { test: 'data' }
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          message: 'Activity logged successfully'
        }
      });

      expect(mockedEOSService.logActivity).toHaveBeenCalledWith(
        'user123',
        'test_activity',
        { test: 'data' },
        'valid-token'
      );
    });

    it('should handle activity logging errors', async () => {
      mockedEOSService.logActivity.mockRejectedValueOnce(new Error('Logging failed'));

      const response = await request(app)
        .post('/api/eos/log-activity')
        .set('x-eos-token', 'valid-token')
        .send({
          activity: 'test_activity',
          metadata: { test: 'data' }
        })
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'ACTIVITY_LOG_ERROR',
          message: 'Failed to log activity'
        }
      });
    });
  });

  describe('GET /api/eos/permissions', () => {
    it('should return user permissions', async () => {
      const mockUser = {
        id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        role: 'student',
        permissions: ['tercih_sihirbazi.read', 'tercih_sihirbazi.write'],
        isActive: true
      };

      mockedEOSService.getUserInfo.mockResolvedValueOnce(mockUser);

      const response = await request(app)
        .get('/api/eos/permissions')
        .set('x-eos-token', 'valid-token')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          permissions: ['tercih_sihirbazi.read', 'tercih_sihirbazi.write'],
          role: 'student'
        }
      });
    });

    it('should fall back to user permissions when EOS service fails', async () => {
      mockedEOSService.getUserInfo.mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/api/eos/permissions')
        .set('x-eos-token', 'valid-token')
        .expect(200);

      expect(response.body.data.permissions).toEqual(['tercih_sihirbazi.read']);
      expect(response.body.data.role).toBe('student');
    });
  });

  describe('GET /api/eos/embed', () => {
    it('should redirect to main interface with EOS parameters', async () => {
      const response = await request(app)
        .get('/api/eos/embed')
        .query({ token: 'test-token', theme: 'dark' })
        .expect(302);

      expect(response.headers.location).toMatch(/\/\?eos=true&token=test-token&theme=dark/);
    });

    it('should handle embed request without parameters', async () => {
      const response = await request(app)
        .get('/api/eos/embed')
        .expect(302);

      expect(response.headers.location).toMatch(/\/\?eos=true&token=&theme=default/);
    });

    it('should handle embed errors', async () => {
      // Mock an error in the route handler
      const originalRedirect = express.response.redirect;
      express.response.redirect = jest.fn().mockImplementation(() => {
        throw new Error('Redirect failed');
      });

      const response = await request(app)
        .get('/api/eos/embed')
        .expect(500);

      expect(response.text).toBe('EOS integration error');

      // Restore original redirect
      express.response.redirect = originalRedirect;
    });
  });

  describe('EOS Integration Error Scenarios', () => {
    it('should handle EOS service unavailability gracefully', async () => {
      mockedEOSService.validateToken.mockRejectedValueOnce(new Error('Service unavailable'));

      const response = await request(app)
        .post('/api/eos/validate-token')
        .send({ token: 'test-token' })
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Token validation failed'
        }
      });
    });

    it('should handle permission check failures', async () => {
      mockedEOSService.getUserInfo.mockRejectedValueOnce(new Error('Permission check failed'));

      const response = await request(app)
        .get('/api/eos/permissions')
        .set('x-eos-token', 'valid-token')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'PERMISSIONS_ERROR',
          message: 'Failed to retrieve permissions'
        }
      });
    });
  });
});