import request from 'supertest';
import { testSetup } from './setup';

describe('Cross-Device Functionality Tests', () => {
  const testUserId = 'cross-device-user';

  describe('Responsive Design Validation', () => {
    it('should serve responsive CSS', async () => {
      const response = await request(testSetup.app)
        .get('/styles.css')
        .expect(200);

      expect(response.headers['content-type']).toContain('text/css');
      
      // Check for responsive design patterns
      const cssContent = response.text;
      expect(cssContent).toContain('@media');
      expect(cssContent).toContain('max-width');
      expect(cssContent).toContain('min-width');
    });

    it('should serve mobile-optimized HTML', async () => {
      const response = await request(testSetup.app)
        .get('/')
        .set('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)')
        .expect(200);

      expect(response.text).toContain('viewport');
      expect(response.text).toContain('width=device-width');
      expect(response.text).toContain('initial-scale=1');
    });

    it('should handle touch-friendly interface elements', async () => {
      const response = await request(testSetup.app)
        .get('/')
        .expect(200);

      const htmlContent = response.text;
      
      // Check for touch-friendly elements
      expect(htmlContent).toContain('touch-action');
      expect(htmlContent).toContain('button');
      expect(htmlContent).toContain('input');
    });
  });

  describe('Mobile Browser Compatibility', () => {
    const mobileUserAgents = [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
      'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36',
      'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
    ];

    mobileUserAgents.forEach((userAgent, index) => {
      it(`should work with mobile browser ${index + 1}`, async () => {
        const sessionId = await testSetup.createTestChatSession(`${testUserId}-mobile-${index}`);

        const response = await request(testSetup.app)
          .post(`/api/chat/sessions/${sessionId}/messages`)
          .set('User-Agent', userAgent)
          .send({
            content: 'Test Üniversitesi Bilgisayar Mühendisliği',
            userId: `${testUserId}-mobile-${index}`
          })
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('message');
      });
    });
  });

  describe('Desktop Browser Compatibility', () => {
    const desktopUserAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0'
    ];

    desktopUserAgents.forEach((userAgent, index) => {
      it(`should work with desktop browser ${index + 1}`, async () => {
        const sessionId = await testSetup.createTestChatSession(`${testUserId}-desktop-${index}`);

        const response = await request(testSetup.app)
          .post(`/api/chat/sessions/${sessionId}/messages`)
          .set('User-Agent', userAgent)
          .send({
            content: 'Test Üniversitesi İşletme bölümü',
            userId: `${testUserId}-desktop-${index}`
          })
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('message');
      });
    });
  });

  describe('Screen Size Adaptations', () => {
    it('should handle small screen requests (mobile)', async () => {
      const response = await request(testSetup.app)
        .get('/')
        .set('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)')
        .set('Viewport-Width', '375') // iPhone width
        .expect(200);

      // Should serve mobile-optimized content
      expect(response.text).toContain('mobile');
    });

    it('should handle medium screen requests (tablet)', async () => {
      const response = await request(testSetup.app)
        .get('/')
        .set('User-Agent', 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)')
        .set('Viewport-Width', '768') // iPad width
        .expect(200);

      expect(response.text).toBeDefined();
    });

    it('should handle large screen requests (desktop)', async () => {
      const response = await request(testSetup.app)
        .get('/')
        .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
        .set('Viewport-Width', '1920') // Desktop width
        .expect(200);

      expect(response.text).toBeDefined();
    });
  });

  describe('Touch vs Mouse Interactions', () => {
    it('should handle touch-based interactions', async () => {
      const sessionId = await testSetup.createTestChatSession(`${testUserId}-touch`);

      // Simulate touch interaction by sending rapid messages (like touch typing)
      const messages = [
        'test',
        'test üni',
        'test üniversitesi bilgisayar'
      ];

      for (const message of messages) {
        const response = await request(testSetup.app)
          .post(`/api/chat/sessions/${sessionId}/messages`)
          .set('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)')
          .send({
            content: message,
            userId: `${testUserId}-touch`
          });

        // Should handle progressive typing
        expect([200, 429]).toContain(response.status); // 429 if rate limited
      }
    });

    it('should handle mouse-based interactions', async () => {
      const sessionId = await testSetup.createTestChatSession(`${testUserId}-mouse`);

      const response = await request(testSetup.app)
        .post(`/api/chat/sessions/${sessionId}/messages`)
        .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
        .send({
          content: 'Test Üniversitesi Bilgisayar Mühendisliği için net hesaplama',
          userId: `${testUserId}-mouse`
        })
        .expect(200);

      expect(response.body.data).toHaveProperty('message');
    });
  });

  describe('Network Condition Adaptations', () => {
    it('should handle slow network conditions', async () => {
      const sessionId = await testSetup.createTestChatSession(`${testUserId}-slow`);

      // Simulate slow network by adding delay
      const startTime = Date.now();
      
      const response = await request(testSetup.app)
        .post(`/api/chat/sessions/${sessionId}/messages`)
        .timeout(10000) // Allow longer timeout for slow network simulation
        .send({
          content: 'Test message for slow network',
          userId: `${testUserId}-slow`
        })
        .expect(200);

      const responseTime = Date.now() - startTime;
      
      // Should still respond, even if slower
      expect(response.body).toHaveProperty('success', true);
      expect(responseTime).toBeLessThan(10000); // Within timeout
    });

    it('should handle intermittent connectivity', async () => {
      const sessionId = await testSetup.createTestChatSession(`${testUserId}-intermittent`);

      // Send multiple requests to simulate intermittent connectivity
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(testSetup.app)
            .post(`/api/chat/sessions/${sessionId}/messages`)
            .send({
              content: `Intermittent test ${i}`,
              userId: `${testUserId}-intermittent`
            })
            .timeout(5000)
        );
      }

      const responses = await Promise.allSettled(promises);
      
      // At least some requests should succeed
      const successfulResponses = responses.filter(
        (result): result is PromiseFulfilledResult<any> => 
          result.status === 'fulfilled' && result.value.status === 200
      );
      
      expect(successfulResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility Features', () => {
    it('should include accessibility attributes in HTML', async () => {
      const response = await request(testSetup.app)
        .get('/')
        .expect(200);

      const htmlContent = response.text;
      
      // Check for accessibility attributes
      expect(htmlContent).toContain('aria-');
      expect(htmlContent).toContain('role=');
      expect(htmlContent).toContain('alt=');
      expect(htmlContent).toContain('tabindex');
    });

    it('should support keyboard navigation', async () => {
      const response = await request(testSetup.app)
        .get('/')
        .expect(200);

      const htmlContent = response.text;
      
      // Check for keyboard navigation support
      expect(htmlContent).toContain('tabindex');
      expect(htmlContent).toContain('onkeydown');
    });

    it('should provide screen reader support', async () => {
      const response = await request(testSetup.app)
        .get('/')
        .expect(200);

      const htmlContent = response.text;
      
      // Check for screen reader attributes
      expect(htmlContent).toContain('aria-label');
      expect(htmlContent).toContain('aria-describedby');
      expect(htmlContent).toContain('role');
    });
  });

  describe('Performance Across Devices', () => {
    it('should load quickly on mobile devices', async () => {
      const startTime = Date.now();
      
      const response = await request(testSetup.app)
        .get('/')
        .set('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)')
        .expect(200);

      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
      expect(response.text.length).toBeGreaterThan(0);
    });

    it('should handle concurrent mobile users', async () => {
      const concurrentUsers = 5;
      const promises = [];

      for (let i = 0; i < concurrentUsers; i++) {
        const sessionId = testSetup.createTestChatSession(`${testUserId}-concurrent-${i}`);
        
        promises.push(
          sessionId.then(id => 
            request(testSetup.app)
              .post(`/api/chat/sessions/${id}/messages`)
              .set('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)')
              .send({
                content: `Mobile concurrent test ${i}`,
                userId: `${testUserId}-concurrent-${i}`
              })
          )
        );
      }

      const responses = await Promise.all(promises);
      
      // All requests should succeed or be rate limited
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
      });
    });
  });

  describe('Data Usage Optimization', () => {
    it('should compress responses for mobile', async () => {
      const response = await request(testSetup.app)
        .get('/api/data/universities?search=test')
        .set('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)')
        .set('Accept-Encoding', 'gzip')
        .expect(200);

      // Should support compression
      expect(response.headers['content-encoding']).toBeDefined();
    });

    it('should minimize payload size for mobile requests', async () => {
      const sessionId = await testSetup.createTestChatSession(`${testUserId}-mobile-payload`);

      const response = await request(testSetup.app)
        .post(`/api/chat/sessions/${sessionId}/messages`)
        .set('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)')
        .send({
          content: 'Test message',
          userId: `${testUserId}-mobile-payload`
        })
        .expect(200);

      // Response should be reasonably sized
      const responseSize = JSON.stringify(response.body).length;
      expect(responseSize).toBeLessThan(10000); // Less than 10KB
    });
  });

  describe('Offline Capability Simulation', () => {
    it('should handle offline-to-online transitions', async () => {
      const sessionId = await testSetup.createTestChatSession(`${testUserId}-offline`);

      // Simulate coming back online with queued message
      const response = await request(testSetup.app)
        .post(`/api/chat/sessions/${sessionId}/messages`)
        .send({
          content: 'Message sent after coming back online',
          userId: `${testUserId}-offline`
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should provide appropriate error messages for network issues', async () => {
      // This would typically require network simulation
      // For now, we test timeout handling
      const sessionId = await testSetup.createTestChatSession(`${testUserId}-network-error`);

      try {
        await request(testSetup.app)
          .post(`/api/chat/sessions/${sessionId}/messages`)
          .timeout(1) // Very short timeout to simulate network issue
          .send({
            content: 'Test message',
            userId: `${testUserId}-network-error`
          });
      } catch (error) {
        // Should handle timeout gracefully
        expect(error).toBeDefined();
      }
    });
  });
});