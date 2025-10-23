import { ChatSession } from '../ChatSession';
import { ChatMessage } from '../ChatMessage';
import { ValidationError } from '@/utils/errors';

describe('ChatSession Model', () => {
  describe('constructor and validation', () => {
    it('should create a valid chat session', () => {
      const sessionData = {
        sessionId: 'session-123',
        userId: 'user-456',
        messages: [],
        isActive: true,
        createdAt: new Date(),
        lastActivity: new Date(),
      };

      const session = new ChatSession(sessionData);

      expect(session.sessionId).toBe('session-123');
      expect(session.userId).toBe('user-456');
      expect(session.messages).toEqual([]);
      expect(session.isActive).toBe(true);
    });

    it('should throw ValidationError for empty session ID', () => {
      expect(() => {
        new ChatSession({ sessionId: '', userId: 'user-1' });
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for empty user ID', () => {
      expect(() => {
        new ChatSession({ sessionId: 'session-1', userId: '' });
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for non-array messages', () => {
      expect(() => {
        new ChatSession({
          sessionId: 'session-1',
          userId: 'user-1',
          messages: 'not-array' as any,
        });
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for non-boolean isActive', () => {
      expect(() => {
        new ChatSession({
          sessionId: 'session-1',
          userId: 'user-1',
          isActive: 'true' as any,
        });
      }).toThrow(ValidationError);
    });

    it('should set default values', () => {
      const session = new ChatSession({
        sessionId: 'session-1',
        userId: 'user-1',
      });

      expect(session.messages).toEqual([]);
      expect(session.isActive).toBe(true);
      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.lastActivity).toBeInstanceOf(Date);
    });
  });

  describe('message management', () => {
    let session: ChatSession;
    let userMessage: ChatMessage;
    let botMessage: ChatMessage;

    beforeEach(() => {
      session = new ChatSession({
        sessionId: 'session-1',
        userId: 'user-1',
      });

      userMessage = new ChatMessage({
        id: 'msg-1',
        userId: 'user-1',
        content: 'Hello',
        type: 'user',
      });

      botMessage = new ChatMessage({
        id: 'msg-2',
        userId: 'user-1',
        content: 'Hi there!',
        type: 'bot',
      });
    });

    it('should add message successfully', () => {
      session.addMessage(userMessage);
      expect(session.messages).toHaveLength(1);
      expect(session.messages[0]).toBe(userMessage);
    });

    it('should throw ValidationError for null message', () => {
      expect(() => {
        session.addMessage(null as any);
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for message with different user ID', () => {
      const wrongUserMessage = new ChatMessage({
        id: 'msg-1',
        userId: 'different-user',
        content: 'Hello',
        type: 'user',
      });

      expect(() => {
        session.addMessage(wrongUserMessage);
      }).toThrow(ValidationError);
    });

    it('should update last activity when adding message', () => {
      const originalActivity = session.lastActivity;
      
      // Wait a bit to ensure different timestamp
      setTimeout(() => {
        session.addMessage(userMessage);
        expect(session.lastActivity.getTime()).toBeGreaterThan(originalActivity.getTime());
      }, 1);
    });

    it('should count messages correctly', () => {
      session.addMessage(userMessage);
      session.addMessage(botMessage);

      expect(session.getMessageCount()).toBe(2);
      expect(session.getUserMessageCount()).toBe(1);
      expect(session.getBotMessageCount()).toBe(1);
    });

    it('should get last message', () => {
      session.addMessage(userMessage);
      session.addMessage(botMessage);

      expect(session.getLastMessage()).toBe(botMessage);
    });

    it('should get last user message', () => {
      session.addMessage(userMessage);
      session.addMessage(botMessage);

      expect(session.getLastUserMessage()).toBe(userMessage);
    });

    it('should return null for last message when no messages', () => {
      expect(session.getLastMessage()).toBeNull();
      expect(session.getLastUserMessage()).toBeNull();
    });

    it('should get recent messages', () => {
      // Add multiple messages
      for (let i = 0; i < 15; i++) {
        const msg = new ChatMessage({
          id: `msg-${i}`,
          userId: 'user-1',
          content: `Message ${i}`,
          type: i % 2 === 0 ? 'user' : 'bot',
        });
        session.addMessage(msg);
      }

      const recent = session.getRecentMessages(5);
      expect(recent).toHaveLength(5);
      expect(recent[0].content).toBe('Message 10');
      expect(recent[4].content).toBe('Message 14');
    });
  });

  describe('session state management', () => {
    let session: ChatSession;

    beforeEach(() => {
      session = new ChatSession({
        sessionId: 'session-1',
        userId: 'user-1',
      });
    });

    it('should deactivate session', () => {
      session.deactivate();
      expect(session.isActive).toBe(false);
    });

    it('should activate session', () => {
      session.deactivate();
      session.activate();
      expect(session.isActive).toBe(true);
    });

    it('should update last activity on state changes', () => {
      const originalActivity = session.lastActivity;
      
      setTimeout(() => {
        session.deactivate();
        expect(session.lastActivity.getTime()).toBeGreaterThan(originalActivity.getTime());
      }, 1);
    });

    it('should check if session is expired', () => {
      // Create session with old last activity
      const oldSession = new ChatSession({
        sessionId: 'session-1',
        userId: 'user-1',
        lastActivity: new Date(Date.now() - 35 * 60 * 1000), // 35 minutes ago
      });

      expect(oldSession.isExpired(30)).toBe(true);
      expect(oldSession.isExpired(40)).toBe(false);
    });

    it('should calculate session duration', () => {
      const session = new ChatSession({
        sessionId: 'session-1',
        userId: 'user-1',
        createdAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        lastActivity: new Date(),
      });

      expect(session.getDurationMinutes()).toBe(15);
    });
  });

  describe('conversation context', () => {
    let session: ChatSession;

    beforeEach(() => {
      session = new ChatSession({
        sessionId: 'session-1',
        userId: 'user-1',
      });

      // Add some messages
      for (let i = 0; i < 10; i++) {
        const msg = new ChatMessage({
          id: `msg-${i}`,
          userId: 'user-1',
          content: `Message ${i}`,
          type: i % 2 === 0 ? 'user' : 'bot',
        });
        session.addMessage(msg);
      }
    });

    it('should get conversation context', () => {
      const context = session.getConversationContext();
      expect(context).toHaveLength(5); // Last 5 messages
      expect(context[0]).toBe('user: Message 5');
      expect(context[4]).toBe('bot: Message 9');
    });

    it('should handle fewer than 5 messages', () => {
      const newSession = new ChatSession({
        sessionId: 'session-2',
        userId: 'user-1',
      });

      const msg = new ChatMessage({
        id: 'msg-1',
        userId: 'user-1',
        content: 'Hello',
        type: 'user',
      });
      newSession.addMessage(msg);

      const context = newSession.getConversationContext();
      expect(context).toHaveLength(1);
      expect(context[0]).toBe('user: Hello');
    });
  });

  describe('serialization', () => {
    it('should convert to JSON correctly', () => {
      const session = new ChatSession({
        sessionId: 'session-1',
        userId: 'user-1',
        isActive: true,
      });

      const message = new ChatMessage({
        id: 'msg-1',
        userId: 'user-1',
        content: 'Hello',
        type: 'user',
      });
      session.addMessage(message);

      const json = session.toJSON();

      expect(json).toEqual({
        sessionId: 'session-1',
        userId: 'user-1',
        messages: [expect.objectContaining({
          id: 'msg-1',
          content: 'Hello',
          type: 'user',
        })],
        isActive: true,
        createdAt: expect.any(Date),
        lastActivity: expect.any(Date),
      });
    });

    it('should create from database row', () => {
      const dbRow = {
        id: 'session-1',
        user_id: 123,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        last_activity: '2024-01-01T01:00:00Z',
      };

      const session = ChatSession.fromDatabase(dbRow);

      expect(session.sessionId).toBe('session-1');
      expect(session.userId).toBe('123');
      expect(session.isActive).toBe(true);
      expect(session.messages).toEqual([]);
      expect(session.createdAt).toEqual(new Date('2024-01-01T00:00:00Z'));
      expect(session.lastActivity).toEqual(new Date('2024-01-01T01:00:00Z'));
    });
  });
});