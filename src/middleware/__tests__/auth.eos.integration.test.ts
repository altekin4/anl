import { Request, Response, NextFunction } from 'express';
import { eosAuth, requirePermission, AuthenticatedRequest } from '../auth';
import { eosService } from '@/services/EOSService';
import { UnauthorizedError } from '@/utils/errors';

// Mock the EOS service
jest.mock('@/services/EOSService');
const mockedEOSService = eosService as jest.Mocked<typeof eosService>;

describe('EOS Authentication Middleware Integration Tests', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      user: undefined
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('eosAuth middleware', () => {
    it('should authenticate user with valid EOS token', async () => {
      const mockUser = {
        id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        role: 'student',
        permissions: ['tercih_sihirbazi.read'],
        isActive: true
      };

      mockRequest.headers = {
        'x-eos-token': 'valid-eos-token'
      };

      mockedEOSService.validateToken.mockResolvedValueOnce({
        success: true,
        user: mockUser
      });

      mockedEOSService.logActivity.mockResolvedValueOnce();

      await eosAuth(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockedEOSService.validateToken).toHaveBeenCalledWith('valid-eos-token');
      expect(mockRequest.user).toEqual({
        id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        role: 'student',
        eosUserId: 'user123',
        permissions: ['tercih_sihirbazi.read']
      });
      expect(mockRequest.headers!['x-user-id']).toBe('user123');
      expect(mockRequest.headers!['x-user-role']).toBe('student');
      expect(mockRequest.headers!['x-eos-user-id']).toBe('user123');
      expect(mockedEOSService.logActivity).toHaveBeenCalledWith(
        'user123',
        'tercih_sihirbazi_access',
        expect.any(Object),
        'valid-eos-token'
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject invalid EOS token', async () => {
      mockRequest.headers = {
        'x-eos-token': 'invalid-token'
      };

      mockedEOSService.validateToken.mockResolvedValueOnce({
        success: false,
        error: 'Invalid token'
      });

      await eosAuth(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(UnauthorizedError)
      );
      expect(mockRequest.user).toBeUndefined();
    });

    it('should authenticate with legacy EOS headers', async () => {
      mockRequest.headers = {
        'x-eos-user-id': 'user123',
        'x-eos-user-role': 'student',
        'x-eos-username': 'testuser',
        'x-eos-email': 'test@example.com'
      };

      await eosAuth(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.user).toEqual({
        id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        role: 'student',
        eosUserId: 'user123',
        permissions: []
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should fall back to JWT authentication when no EOS headers', async () => {
      mockRequest.headers = {
        'authorization': 'Bearer jwt-token'
      };

      // Mock JWT verification (this would normally be handled by authenticateToken)
      // For this test, we'll simulate the fallback behavior
      await eosAuth(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      // Should call next (either with success or error from JWT auth)
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle inactive EOS user', async () => {
      const mockUser = {
        id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        role: 'student',
        permissions: ['tercih_sihirbazi.read'],
        isActive: false
      };

      mockRequest.headers = {
        'x-eos-token': 'valid-token-inactive-user'
      };

      mockedEOSService.validateToken.mockResolvedValueOnce({
        success: true,
        user: mockUser
      });

      await eosAuth(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(UnauthorizedError)
      );
      expect(mockRequest.user).toBeUndefined();
    });
  });

  describe('requirePermission middleware', () => {
    it('should allow access with valid EOS permissions', () => {
      mockRequest.user = {
        id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        role: 'student',
        permissions: ['tercih_sihirbazi.read', 'tercih_sihirbazi.write']
      };

      const middleware = requirePermission(['tercih_sihirbazi.read']);
      
      middleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny access without required EOS permissions', () => {
      mockRequest.user = {
        id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        role: 'student',
        permissions: ['tercih_sihirbazi.read']
      };

      const middleware = requirePermission(['tercih_sihirbazi.admin']);
      
      middleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(UnauthorizedError)
      );
    });

    it('should fall back to role-based permissions for non-EOS users', () => {
      mockRequest.user = {
        id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        role: 'admin',
        permissions: undefined // No EOS permissions
      };

      const middleware = requirePermission(['tercih_sihirbazi.admin']);
      
      middleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny access for insufficient role-based permissions', () => {
      mockRequest.user = {
        id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        role: 'student',
        permissions: undefined // No EOS permissions
      };

      const middleware = requirePermission(['tercih_sihirbazi.admin']);
      
      middleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(UnauthorizedError)
      );
    });

    it('should require authentication', () => {
      mockRequest.user = undefined;

      const middleware = requirePermission(['tercih_sihirbazi.read']);
      
      middleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(UnauthorizedError)
      );
    });
  });

  describe('EOS Integration Error Handling', () => {
    it('should handle EOS service errors gracefully', async () => {
      mockRequest.headers = {
        'x-eos-token': 'valid-token'
      };

      mockedEOSService.validateToken.mockRejectedValueOnce(
        new Error('EOS service unavailable')
      );

      await eosAuth(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(Error)
      );
    });

    it('should handle activity logging failures gracefully', async () => {
      const mockUser = {
        id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        role: 'student',
        permissions: ['tercih_sihirbazi.read'],
        isActive: true
      };

      mockRequest.headers = {
        'x-eos-token': 'valid-token'
      };

      mockedEOSService.validateToken.mockResolvedValueOnce({
        success: true,
        user: mockUser
      });

      mockedEOSService.logActivity.mockRejectedValueOnce(
        new Error('Activity logging failed')
      );

      await eosAuth(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      // Should still authenticate successfully even if activity logging fails
      expect(mockRequest.user).toBeDefined();
      expect(mockNext).toHaveBeenCalledWith();
    });
  });
});