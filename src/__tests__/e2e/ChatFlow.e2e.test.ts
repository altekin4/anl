import request from 'supertest';
import { testSetup } from './setup';

describe('End-to-End Chat Flow Tests', () => {
  let sessionId: string;
  const testUserId = 'e2e-test-user';

  beforeEach(async () => {
    // Create a fresh session for each test
    sessionId = await testSetup.createTestChatSession(testUserId);
  });

  describe('Complete User Journey - Net Score Calculation', () => {
    it('should handle complete net score calculation flow', async () => {
      // Step 1: User asks for net calculation
      const step1Response = await testSetup.sendTestMessage(
        sessionId,
        'Test Üniversitesi Bilgisayar Mühendisliği için kaç net gerekir?',
        testUserId
      );

      expect(step1Response).toHaveProperty('message');
      expect(step1Response.message).toContain('puan');
      expect(step1Response.intent).toBe('net_calculation');

      // Step 2: Follow up with specific score question
      const step2Response = await testSetup.sendTestMessage(
        sessionId,
        '450 puan için kaç net gerekir?',
        testUserId
      );

      expect(step2Response).toHaveProperty('message');
      expect(step2Response).toHaveProperty('calculationResult');
      expect(step2Response.calculationResult).toHaveProperty('requiredNets');
      expect(step2Response.calculationResult.requiredNets).toHaveProperty('TYT');
      expect(step2Response.calculationResult.requiredNets).toHaveProperty('AYT');

      // Step 3: Ask for clarification or additional info
      const step3Response = await testSetup.sendTestMessage(
        sessionId,
        'Bu hesaplama ne kadar güvenilir?',
        testUserId
      );

      expect(step3Response).toHaveProperty('message');
      expect(step3Response.message).toContain('güven');
    });

    it('should handle university search with fuzzy matching', async () => {
      // Test with partial university name
      const response1 = await testSetup.sendTestMessage(
        sessionId,
        'test üni bilgisayar mühendisliği',
        testUserId
      );

      expect(response1.intent).toBe('net_calculation');
      expect(response1.entities).toHaveProperty('university');
      expect(response1.entities.university).toContain('Test');

      // Test with abbreviation
      const response2 = await testSetup.sendTestMessage(
        sessionId,
        'TÜ işletme bölümü',
        testUserId
      );

      expect(response2.intent).toBe('net_calculation');
      expect(response2.entities).toHaveProperty('university');
      expect(response2.entities).toHaveProperty('department');
    });

    it('should handle department search with variations', async () => {
      const testCases = [
        'bilgisayar müh',
        'bilgisayar mühendisliği',
        'BM',
        'işletme',
        'işletme bölümü'
      ];

      for (const testCase of testCases) {
        const response = await testSetup.sendTestMessage(
          sessionId,
          `Test Üniversitesi ${testCase}`,
          testUserId
        );

        expect(response.entities).toHaveProperty('department');
        expect(response.entities.department).toBeTruthy();
      }
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle university not found gracefully', async () => {
      const response = await testSetup.sendTestMessage(
        sessionId,
        'Yokolmayan Üniversitesi Bilgisayar Mühendisliği',
        testUserId
      );

      expect(response).toHaveProperty('message');
      expect(response.message).toContain('bulunamadı');
      expect(response).toHaveProperty('suggestions');
      expect(response.suggestions).toBeInstanceOf(Array);
      expect(response.suggestions.length).toBeGreaterThan(0);
    });

    it('should handle department not found gracefully', async () => {
      const response = await testSetup.sendTestMessage(
        sessionId,
        'Test Üniversitesi Yokolmayan Bölüm',
        testUserId
      );

      expect(response).toHaveProperty('message');
      expect(response.message).toContain('bulunamadı');
      expect(response).toHaveProperty('suggestions');
    });

    it('should handle invalid score input gracefully', async () => {
      const response = await testSetup.sendTestMessage(
        sessionId,
        'Test Üniversitesi Bilgisayar Mühendisliği için 600 puan',
        testUserId
      );

      expect(response).toHaveProperty('message');
      expect(response.message).toContain('geçersiz');
      expect(response).toHaveProperty('suggestions');
    });

    it('should provide fallback responses for system errors', async () => {
      // This test would require mocking system failures
      // For now, we'll test the error response structure
      const response = await request(testSetup.app)
        .post(`/api/chat/sessions/${sessionId}/messages`)
        .send({ content: '', userId: testUserId }) // Empty message should trigger validation error
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
    });
  });

  describe('Multi-turn Conversation Context', () => {
    it('should maintain context across multiple messages', async () => {
      // Step 1: Initial query
      await testSetup.sendTestMessage(
        sessionId,
        'Test Üniversitesi Bilgisayar Mühendisliği',
        testUserId
      );

      // Step 2: Follow-up without repeating university/department
      const response2 = await testSetup.sendTestMessage(
        sessionId,
        '450 puan için kaç net?',
        testUserId
      );

      expect(response2).toHaveProperty('calculationResult');
      expect(response2.calculationResult).toHaveProperty('university');
      expect(response2.calculationResult).toHaveProperty('department');

      // Step 3: Another follow-up
      const response3 = await testSetup.sendTestMessage(
        sessionId,
        'Geçen yıl kaç puandı?',
        testUserId
      );

      expect(response3).toHaveProperty('message');
      expect(response3.message).toContain('2023');
    });

    it('should handle context switching', async () => {
      // Initial context
      await testSetup.sendTestMessage(
        sessionId,
        'Test Üniversitesi Bilgisayar Mühendisliği',
        testUserId
      );

      // Switch to different university/department
      const response = await testSetup.sendTestMessage(
        sessionId,
        'Örnek Üniversitesi Hukuk bölümü nasıl?',
        testUserId
      );

      expect(response.entities.university).toContain('Örnek');
      expect(response.entities.department).toContain('Hukuk');
    });
  });

  describe('Different Question Types', () => {
    it('should handle base score queries', async () => {
      const response = await testSetup.sendTestMessage(
        sessionId,
        'Test Üniversitesi Bilgisayar Mühendisliği taban puanı nedir?',
        testUserId
      );

      expect(response.intent).toBe('base_score');
      expect(response).toHaveProperty('scoreData');
      expect(response.scoreData).toHaveProperty('baseScore');
      expect(response.scoreData.baseScore).toBe(450.5);
    });

    it('should handle quota inquiries', async () => {
      const response = await testSetup.sendTestMessage(
        sessionId,
        'Test Üniversitesi İşletme kontenjanı kaç?',
        testUserId
      );

      expect(response.intent).toBe('quota_inquiry');
      expect(response).toHaveProperty('scoreData');
      expect(response.scoreData).toHaveProperty('quota');
      expect(response.scoreData.quota).toBe(200);
    });

    it('should handle department search queries', async () => {
      const response = await testSetup.sendTestMessage(
        sessionId,
        'Test Üniversitesinde hangi bölümler var?',
        testUserId
      );

      expect(response.intent).toBe('department_search');
      expect(response).toHaveProperty('departments');
      expect(response.departments).toBeInstanceOf(Array);
      expect(response.departments.length).toBeGreaterThan(0);
    });

    it('should handle general help queries', async () => {
      const response = await testSetup.sendTestMessage(
        sessionId,
        'yardım',
        testUserId
      );

      expect(response).toHaveProperty('message');
      expect(response.message).toContain('yardım');
      expect(response).toHaveProperty('suggestions');
      expect(response.suggestions).toBeInstanceOf(Array);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      // Send multiple messages quickly to trigger rate limit
      const promises = [];
      for (let i = 0; i < 25; i++) {
        promises.push(
          request(testSetup.app)
            .post(`/api/chat/sessions/${sessionId}/messages`)
            .send({ content: `Test message ${i}`, userId: testUserId })
        );
      }

      const responses = await Promise.all(promises);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);

      // Rate limited responses should have proper error structure
      const rateLimitedResponse = rateLimitedResponses[0];
      expect(rateLimitedResponse.body).toHaveProperty('success', false);
      expect(rateLimitedResponse.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('Session Management', () => {
    it('should create and retrieve sessions', async () => {
      // Create session
      const createResponse = await request(testSetup.app)
        .post('/api/chat/sessions')
        .send({ userId: testUserId })
        .expect(201);

      const newSessionId = createResponse.body.data.sessionId;
      expect(newSessionId).toBeTruthy();

      // Retrieve session
      const getResponse = await request(testSetup.app)
        .get(`/api/chat/sessions/${newSessionId}`)
        .expect(200);

      expect(getResponse.body.data.sessionId).toBe(newSessionId);
      expect(getResponse.body.data.userId).toBe(testUserId);
    });

    it('should retrieve session messages', async () => {
      // Send a message
      await testSetup.sendTestMessage(sessionId, 'Test message', testUserId);

      // Retrieve messages
      const response = await request(testSetup.app)
        .get(`/api/chat/sessions/${sessionId}/messages`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('content');
      expect(response.body.data[0]).toHaveProperty('messageType');
    });
  });
});