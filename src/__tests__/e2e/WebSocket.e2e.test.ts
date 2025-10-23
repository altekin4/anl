import { testSetup } from './setup';

describe('WebSocket End-to-End Tests', () => {
  let client: any;
  let sessionId: string;
  const testUserId = 'websocket-test-user';

  beforeEach(async () => {
    sessionId = await testSetup.createTestChatSession(testUserId);
    client = testSetup.createWebSocketClient();
    
    // Wait for connection
    await new Promise((resolve) => {
      client.on('connect', resolve);
    });
  });

  afterEach((done) => {
    if (client) {
      client.disconnect();
    }
    done();
  });

  describe('Real-time Chat Communication', () => {
    it('should establish WebSocket connection', (done) => {
      expect(client.connected).toBe(true);
      done();
    });

    it('should handle real-time message exchange', (done) => {
      const testMessage = 'Test Üniversitesi Bilgisayar Mühendisliği';
      
      // Listen for bot response
      client.on('bot_message', (data: any) => {
        expect(data).toHaveProperty('message');
        expect(data).toHaveProperty('sessionId');
        expect(data.sessionId).toBe(sessionId);
        done();
      });

      // Send message
      client.emit('user_message', {
        sessionId,
        userId: testUserId,
        content: testMessage
      });
    });

    it('should handle typing indicators', (done) => {
      let typingStartReceived = false;
      let typingStopReceived = false;

      // Listen for typing indicators
      client.on('typing_start', (data: any) => {
        expect(data.sessionId).toBe(sessionId);
        typingStartReceived = true;
      });

      client.on('typing_stop', (data: any) => {
        expect(data.sessionId).toBe(sessionId);
        typingStopReceived = true;
        
        if (typingStartReceived && typingStopReceived) {
          done();
        }
      });

      // Send message to trigger typing indicators
      client.emit('user_message', {
        sessionId,
        userId: testUserId,
        content: 'Test message for typing'
      });
    });

    it('should handle connection errors gracefully', (done) => {
      // Listen for error events
      client.on('error', (error: any) => {
        expect(error).toBeDefined();
        done();
      });

      // Send invalid message to trigger error
      client.emit('user_message', {
        sessionId: 'invalid-session-id',
        userId: testUserId,
        content: 'Test message'
      });
    });

    it('should handle multiple concurrent connections', async () => {
      const client2 = testSetup.createWebSocketClient();
      const client3 = testSetup.createWebSocketClient();

      // Wait for all connections
      await Promise.all([
        new Promise(resolve => client2.on('connect', resolve)),
        new Promise(resolve => client3.on('connect', resolve))
      ]);

      expect(client.connected).toBe(true);
      expect(client2.connected).toBe(true);
      expect(client3.connected).toBe(true);

      // Clean up
      client2.disconnect();
      client3.disconnect();
    });
  });

  describe('Session-based Communication', () => {
    it('should maintain session context in WebSocket', (done) => {
      let messageCount = 0;
      const expectedMessages = 2;

      client.on('bot_message', (data: any) => {
        messageCount++;
        expect(data.sessionId).toBe(sessionId);
        
        if (messageCount === expectedMessages) {
          done();
        }
      });

      // Send first message
      client.emit('user_message', {
        sessionId,
        userId: testUserId,
        content: 'Test Üniversitesi Bilgisayar Mühendisliği'
      });

      // Send follow-up message after a short delay
      setTimeout(() => {
        client.emit('user_message', {
          sessionId,
          userId: testUserId,
          content: '450 puan için kaç net?'
        });
      }, 1000);
    });

    it('should handle session switching', (done) => {
      const sessionId2 = testSetup.createTestChatSession(`${testUserId}-2`);
      let responsesReceived = 0;

      client.on('bot_message', (data: any) => {
        responsesReceived++;
        
        if (responsesReceived === 1) {
          expect(data.sessionId).toBe(sessionId);
        } else if (responsesReceived === 2) {
          expect(data.sessionId).toBe(sessionId2);
          done();
        }
      });

      // Send message to first session
      client.emit('user_message', {
        sessionId,
        userId: testUserId,
        content: 'First session message'
      });

      // Send message to second session
      setTimeout(async () => {
        const actualSessionId2 = await sessionId2;
        client.emit('user_message', {
          sessionId: actualSessionId2,
          userId: `${testUserId}-2`,
          content: 'Second session message'
        });
      }, 500);
    });
  });

  describe('Error Handling via WebSocket', () => {
    it('should receive error messages via WebSocket', (done) => {
      client.on('error_message', (data: any) => {
        expect(data).toHaveProperty('error');
        expect(data.error).toHaveProperty('code');
        expect(data.error).toHaveProperty('message');
        expect(data.sessionId).toBe(sessionId);
        done();
      });

      // Send invalid message to trigger error
      client.emit('user_message', {
        sessionId,
        userId: testUserId,
        content: '' // Empty message should trigger validation error
      });
    });

    it('should handle rate limiting via WebSocket', (done) => {
      let errorReceived = false;

      client.on('error_message', (data: any) => {
        if (data.error.code === 'RATE_LIMIT_EXCEEDED') {
          errorReceived = true;
          expect(data.error.message).toContain('fazla');
          done();
        }
      });

      // Send many messages quickly to trigger rate limit
      for (let i = 0; i < 25; i++) {
        client.emit('user_message', {
          sessionId,
          userId: testUserId,
          content: `Rapid message ${i}`
        });
      }
    });

    it('should handle invalid session ID', (done) => {
      client.on('error_message', (data: any) => {
        expect(data.error.code).toBe('SESSION_NOT_FOUND');
        done();
      });

      client.emit('user_message', {
        sessionId: 'invalid-session-id',
        userId: testUserId,
        content: 'Test message'
      });
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle message bursts without losing messages', (done) => {
      const messageCount = 10;
      let responsesReceived = 0;
      const sentMessages = new Set();
      const receivedMessages = new Set();

      client.on('bot_message', (data: any) => {
        responsesReceived++;
        receivedMessages.add(data.originalMessage);
        
        if (responsesReceived === messageCount) {
          expect(receivedMessages.size).toBe(sentMessages.size);
          done();
        }
      });

      // Send burst of messages
      for (let i = 0; i < messageCount; i++) {
        const message = `Burst message ${i}`;
        sentMessages.add(message);
        
        setTimeout(() => {
          client.emit('user_message', {
            sessionId,
            userId: testUserId,
            content: message
          });
        }, i * 100); // Stagger messages slightly
      }
    });

    it('should maintain connection stability', (done) => {
      let pingCount = 0;
      const maxPings = 5;

      const pingInterval = setInterval(() => {
        if (pingCount >= maxPings) {
          clearInterval(pingInterval);
          expect(client.connected).toBe(true);
          done();
          return;
        }

        client.emit('ping');
        pingCount++;
      }, 200);

      client.on('pong', () => {
        // Connection is stable if we receive pong responses
      });
    });
  });

  describe('Cross-device Functionality', () => {
    it('should handle mobile-like connection patterns', async () => {
      // Simulate mobile connection patterns (disconnect/reconnect)
      client.disconnect();
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      client.connect();
      
      await new Promise(resolve => {
        client.on('connect', resolve);
      });

      expect(client.connected).toBe(true);
    });

    it('should handle network interruption simulation', (done) => {
      let reconnected = false;

      client.on('disconnect', () => {
        // Simulate network coming back
        setTimeout(() => {
          client.connect();
        }, 100);
      });

      client.on('connect', () => {
        if (reconnected) {
          done();
        } else {
          reconnected = true;
        }
      });

      // Simulate network interruption
      client.disconnect();
    });
  });
});