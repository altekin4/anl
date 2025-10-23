import { ChatMessage } from '../ChatMessage';
import { ValidationError } from '@/utils/errors';

describe('ChatMessage Model', () => {
  describe('constructor and validation', () => {
    it('should create a valid chat message', () => {
      const messageData = {
        id: 'msg-123',
        userId: 'user-456',
        content: 'Marmara Üniversitesi İşletme kaç net gerekir?',
        type: 'user' as const,
        timestamp: new Date(),
      };

      const message = new ChatMessage(messageData);

      expect(message.id).toBe('msg-123');
      expect(message.userId).toBe('user-456');
      expect(message.content).toBe('Marmara Üniversitesi İşletme kaç net gerekir?');
      expect(message.type).toBe('user');
    });

    it('should throw ValidationError for empty ID', () => {
      expect(() => {
        new ChatMessage({ userId: 'user-1', content: 'test', id: '' });
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for empty user ID', () => {
      expect(() => {
        new ChatMessage({ id: 'msg-1', content: 'test', userId: '' });
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for empty content', () => {
      expect(() => {
        new ChatMessage({ id: 'msg-1', userId: 'user-1', content: '' });
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for content exceeding 1000 characters', () => {
      const longContent = 'a'.repeat(1001);
      expect(() => {
        new ChatMessage({
          id: 'msg-1',
          userId: 'user-1',
          content: longContent,
        });
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid message type', () => {
      expect(() => {
        new ChatMessage({
          id: 'msg-1',
          userId: 'user-1',
          content: 'test',
          type: 'invalid' as any,
        });
      }).toThrow(ValidationError);
    });
  });

  describe('message type checking', () => {
    it('should correctly identify user messages', () => {
      const userMessage = new ChatMessage({
        id: 'msg-1',
        userId: 'user-1',
        content: 'test',
        type: 'user',
      });

      expect(userMessage.isFromUser()).toBe(true);
      expect(userMessage.isFromBot()).toBe(false);
    });

    it('should correctly identify bot messages', () => {
      const botMessage = new ChatMessage({
        id: 'msg-1',
        userId: 'user-1',
        content: 'test',
        type: 'bot',
      });

      expect(userMessage.isFromUser()).toBe(false);
      expect(botMessage.isFromBot()).toBe(true);
    });
  });

  describe('metadata management', () => {
    let message: ChatMessage;

    beforeEach(() => {
      message = new ChatMessage({
        id: 'msg-1',
        userId: 'user-1',
        content: 'test',
        type: 'user',
      });
    });

    it('should handle intent metadata', () => {
      expect(message.hasIntent()).toBe(false);
      expect(message.getIntent()).toBeUndefined();

      message.setIntent('net_calculation');
      expect(message.hasIntent()).toBe(true);
      expect(message.getIntent()).toBe('net_calculation');
    });

    it('should handle entities metadata', () => {
      expect(message.hasEntities()).toBe(false);
      expect(message.getEntities()).toEqual({});

      const entities = { university: 'Marmara', department: 'İşletme' };
      message.setEntities(entities);

      expect(message.hasEntities()).toBe(true);
      expect(message.getEntities()).toEqual(entities);
    });

    it('should handle individual entity operations', () => {
      message.setEntity('university', 'Marmara');
      expect(message.getEntity('university')).toBe('Marmara');
      expect(message.getEntity('department')).toBeUndefined();

      message.setEntity('department', 'İşletme');
      expect(message.getEntity('department')).toBe('İşletme');
    });
  });

  describe('content analysis', () => {
    it('should count words correctly', () => {
      const message = new ChatMessage({
        id: 'msg-1',
        userId: 'user-1',
        content: 'Marmara Üniversitesi İşletme kaç net gerekir?',
        type: 'user',
      });

      expect(message.getWordCount()).toBe(5);
    });

    it('should count characters correctly', () => {
      const message = new ChatMessage({
        id: 'msg-1',
        userId: 'user-1',
        content: 'test',
        type: 'user',
      });

      expect(message.getCharacterCount()).toBe(4);
    });

    it('should detect keywords', () => {
      const message = new ChatMessage({
        id: 'msg-1',
        userId: 'user-1',
        content: 'Marmara Üniversitesi İşletme kaç net gerekir?',
        type: 'user',
      });

      expect(message.containsKeywords(['Marmara', 'İşletme'])).toBe(true);
      expect(message.containsKeywords(['Boğaziçi', 'Hukuk'])).toBe(false);
      expect(message.containsKeywords(['marmara'])).toBe(true); // case insensitive
    });

    it('should detect questions', () => {
      const questionMessage = new ChatMessage({
        id: 'msg-1',
        userId: 'user-1',
        content: 'Kaç net gerekir?',
        type: 'user',
      });

      const statementMessage = new ChatMessage({
        id: 'msg-2',
        userId: 'user-1',
        content: 'Bu bir açıklama.',
        type: 'user',
      });

      expect(questionMessage.isQuestion()).toBe(true);
      expect(statementMessage.isQuestion()).toBe(false);
    });
  });

  describe('static factory methods', () => {
    it('should create user message', () => {
      const message = ChatMessage.createUserMessage('user-1', 'test content');

      expect(message.userId).toBe('user-1');
      expect(message.content).toBe('test content');
      expect(message.type).toBe('user');
      expect(message.id).toBeDefined();
    });

    it('should create bot message', () => {
      const message = ChatMessage.createBotMessage('user-1', 'bot response');

      expect(message.userId).toBe('user-1');
      expect(message.content).toBe('bot response');
      expect(message.type).toBe('bot');
      expect(message.id).toBeDefined();
    });
  });

  describe('serialization', () => {
    it('should convert to JSON correctly', () => {
      const message = new ChatMessage({
        id: 'msg-1',
        userId: 'user-1',
        content: 'test',
        type: 'user',
        metadata: {
          intent: 'net_calculation',
          entities: { university: 'Marmara' },
        },
      });

      const json = message.toJSON();

      expect(json).toEqual({
        id: 'msg-1',
        userId: 'user-1',
        content: 'test',
        type: 'user',
        timestamp: expect.any(Date),
        metadata: {
          intent: 'net_calculation',
          entities: { university: 'Marmara' },
        },
      });
    });

    it('should create from database row', () => {
      const dbRow = {
        id: 'msg-1',
        user_id: 123,
        content: 'test',
        message_type: 'user',
        created_at: '2024-01-01T00:00:00Z',
        intent: 'net_calculation',
        entities: { university: 'Marmara' },
      };

      const message = ChatMessage.fromDatabase(dbRow);

      expect(message.id).toBe('msg-1');
      expect(message.userId).toBe('123');
      expect(message.content).toBe('test');
      expect(message.type).toBe('user');
      expect(message.getIntent()).toBe('net_calculation');
      expect(message.getEntity('university')).toBe('Marmara');
    });
  });
});