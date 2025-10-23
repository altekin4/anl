import request from 'supertest';
import { testSetup } from './setup';

describe('API Endpoints End-to-End Tests', () => {
  const testUserId = 'api-test-user';

  describe('Health Check Endpoints', () => {
    it('should return healthy status', async () => {
      const response = await request(testSetup.app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('services');
      expect(response.body.services).toHaveProperty('database');
      expect(response.body.services).toHaveProperty('cache');
    });

    it('should return detailed health information', async () => {
      const response = await request(testSetup.app)
        .get('/health/detailed')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('memory');
      expect(response.body).toHaveProperty('database');
      expect(response.body).toHaveProperty('cache');
    });
  });

  describe('Chat Session Management', () => {
    it('should create a new chat session', async () => {
      const response = await request(testSetup.app)
        .post('/api/chat/sessions')
        .send({ userId: testUserId })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('sessionId');
      expect(response.body.data).toHaveProperty('userId', testUserId);
      expect(response.body.data).toHaveProperty('createdAt');
      expect(response.body.data).toHaveProperty('isActive', true);
    });

    it('should retrieve existing session', async () => {
      // Create session first
      const createResponse = await request(testSetup.app)
        .post('/api/chat/sessions')
        .send({ userId: testUserId })
        .expect(201);

      const sessionId = createResponse.body.data.sessionId;

      // Retrieve session
      const getResponse = await request(testSetup.app)
        .get(`/api/chat/sessions/${sessionId}`)
        .expect(200);

      expect(getResponse.body.data.sessionId).toBe(sessionId);
      expect(getResponse.body.data.userId).toBe(testUserId);
    });

    it('should return 404 for non-existent session', async () => {
      const response = await request(testSetup.app)
        .get('/api/chat/sessions/non-existent-id')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error.code).toBe('SESSION_NOT_FOUND');
    });

    it('should list user sessions', async () => {
      // Create multiple sessions
      await request(testSetup.app)
        .post('/api/chat/sessions')
        .send({ userId: testUserId });

      await request(testSetup.app)
        .post('/api/chat/sessions')
        .send({ userId: testUserId });

      // List sessions
      const response = await request(testSetup.app)
        .get(`/api/chat/sessions?userId=${testUserId}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Chat Message Handling', () => {
    let sessionId: string;

    beforeEach(async () => {
      sessionId = await testSetup.createTestChatSession(testUserId);
    });

    it('should send and receive chat messages', async () => {
      const messageContent = 'Test Üniversitesi Bilgisayar Mühendisliği için kaç net gerekir?';

      const response = await request(testSetup.app)
        .post(`/api/chat/sessions/${sessionId}/messages`)
        .send({
          content: messageContent,
          userId: testUserId
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('message');
      expect(response.body.data).toHaveProperty('intent');
      expect(response.body.data).toHaveProperty('entities');
      expect(response.body.data.entities).toHaveProperty('university');
      expect(response.body.data.entities).toHaveProperty('department');
    });

    it('should retrieve message history', async () => {
      // Send a message first
      await request(testSetup.app)
        .post(`/api/chat/sessions/${sessionId}/messages`)
        .send({
          content: 'Test message',
          userId: testUserId
        });

      // Retrieve messages
      const response = await request(testSetup.app)
        .get(`/api/chat/sessions/${sessionId}/messages`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      const userMessage = response.body.data.find((msg: any) => msg.messageType === 'user');
      const botMessage = response.body.data.find((msg: any) => msg.messageType === 'bot');
      
      expect(userMessage).toBeDefined();
      expect(botMessage).toBeDefined();
    });

    it('should handle message validation errors', async () => {
      const response = await request(testSetup.app)
        .post(`/api/chat/sessions/${sessionId}/messages`)
        .send({
          content: '', // Empty content should fail validation
          userId: testUserId
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle long messages', async () => {
      const longMessage = 'A'.repeat(2000); // Very long message

      const response = await request(testSetup.app)
        .post(`/api/chat/sessions/${sessionId}/messages`)
        .send({
          content: longMessage,
          userId: testUserId
        })
        .expect(400);

      expect(response.body.error.code).toBe('MESSAGE_TOO_LONG');
    });
  });

  describe('Calculator API Endpoints', () => {
    it('should calculate net scores for given target', async () => {
      const response = await request(testSetup.app)
        .post('/api/calculator/net-calculation')
        .send({
          targetScore: 450,
          examType: 'SAY',
          university: 'Test Üniversitesi',
          department: 'Bilgisayar Mühendisliği'
        })
        .expect(200);

      expect(response.body.data).toHaveProperty('requiredNets');
      expect(response.body.data.requiredNets).toHaveProperty('TYT');
      expect(response.body.data.requiredNets).toHaveProperty('AYT');
      expect(response.body.data).toHaveProperty('confidence');
      expect(response.body.data).toHaveProperty('safetyMargin');
    });

    it('should handle invalid calculation parameters', async () => {
      const response = await request(testSetup.app)
        .post('/api/calculator/net-calculation')
        .send({
          targetScore: 600, // Invalid score (too high)
          examType: 'SAY'
        })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_SCORE_INPUT');
    });

    it('should calculate score from net values', async () => {
      const response = await request(testSetup.app)
        .post('/api/calculator/score-calculation')
        .send({
          nets: {
            TYT: 80,
            AYT: 60
          },
          examType: 'SAY'
        })
        .expect(200);

      expect(response.body.data).toHaveProperty('estimatedScore');
      expect(response.body.data).toHaveProperty('scoreRange');
      expect(response.body.data.scoreRange).toHaveProperty('min');
      expect(response.body.data.scoreRange).toHaveProperty('max');
    });
  });

  describe('Data Query Endpoints', () => {
    it('should search universities', async () => {
      const response = await request(testSetup.app)
        .get('/api/data/universities?search=test')
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('name');
      expect(response.body.data[0]).toHaveProperty('city');
      expect(response.body.data[0]).toHaveProperty('type');
    });

    it('should search departments', async () => {
      const response = await request(testSetup.app)
        .get('/api/data/departments?search=bilgisayar&universityId=1')
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('name');
      expect(response.body.data[0]).toHaveProperty('faculty');
    });

    it('should get score data for department', async () => {
      const response = await request(testSetup.app)
        .get('/api/data/score-data/1?year=2024')
        .expect(200);

      expect(response.body.data).toHaveProperty('baseScore');
      expect(response.body.data).toHaveProperty('ceilingScore');
      expect(response.body.data).toHaveProperty('quota');
      expect(response.body.data).toHaveProperty('year');
    });

    it('should handle data not found gracefully', async () => {
      const response = await request(testSetup.app)
        .get('/api/data/score-data/999?year=2024')
        .expect(404);

      expect(response.body.error.code).toBe('SCORE_DATA_NOT_FOUND');
      expect(response.body).toHaveProperty('fallbackData');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should handle missing authentication', async () => {
      const response = await request(testSetup.app)
        .get('/api/admin/stats')
        .expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should handle invalid tokens', async () => {
      const response = await request(testSetup.app)
        .get('/api/admin/stats')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce API rate limits', async () => {
      const sessionId = await testSetup.createTestChatSession(testUserId);
      
      // Send many requests quickly
      const promises = [];
      for (let i = 0; i < 30; i++) {
        promises.push(
          request(testSetup.app)
            .post(`/api/chat/sessions/${sessionId}/messages`)
            .send({
              content: `Rate limit test ${i}`,
              userId: testUserId
            })
        );
      }

      const responses = await Promise.all(promises);
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      expect(rateLimitedResponses[0].body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('Error Response Format Consistency', () => {
    it('should return consistent error format across endpoints', async () => {
      const endpoints = [
        { method: 'get', path: '/api/chat/sessions/invalid-id' },
        { method: 'post', path: '/api/chat/sessions', body: {} }, // Missing userId
        { method: 'get', path: '/api/data/score-data/999' }
      ];

      for (const endpoint of endpoints) {
        const request_method = request(testSetup.app)[endpoint.method as keyof typeof request];
        let req = request_method(endpoint.path);
        
        if (endpoint.body) {
          req = req.send(endpoint.body);
        }

        const response = await req;
        
        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toHaveProperty('code');
        expect(response.body.error).toHaveProperty('message');
        expect(typeof response.body.error.message).toBe('string');
      }
    });
  });

  describe('Performance and Response Times', () => {
    it('should respond to health checks quickly', async () => {
      const startTime = Date.now();
      
      await request(testSetup.app)
        .get('/health')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should handle concurrent requests efficiently', async () => {
      const sessionId = await testSetup.createTestChatSession(testUserId);
      const concurrentRequests = 10;
      
      const startTime = Date.now();
      
      const promises = Array(concurrentRequests).fill(0).map((_, i) =>
        request(testSetup.app)
          .post(`/api/chat/sessions/${sessionId}/messages`)
          .send({
            content: `Concurrent test ${i}`,
            userId: `${testUserId}-${i}`
          })
      );

      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      
      // All requests should succeed (or be rate limited)
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
      });
      
      // Should handle concurrent requests reasonably quickly
      expect(totalTime).toBeLessThan(10000); // Within 10 seconds
    });
  });
});