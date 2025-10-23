import { ChatService } from '../ChatService';
import { ValidationError, NotFoundError, BusinessLogicError } from '@/utils/errors';

// Mock dependencies
const mockDb = {
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn(),
} as any;

describe('ChatService Integration Tests', () => {
  let chatService: ChatService;

  const mockUserId = 'user123';
  const mockSessionId = 'session123';

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create chat service instance
    chatService = new ChatService(mockDb);

    // Setup default mock implementations
    setupDefaultMocks();
  });

  function setupDefaultMocks() {
    // Mock successful session creation
    mockDb.query.mockImplementation((query: string) => {
      if (query.includes('INSERT INTO chat_sessions')) {
        return Promise.resolve({
          rows: [{
            session_id: mockSessionId,
            user_id: mockUserId,
            is_active: true,
            created_at: new Date(),
            last_activity: new Date(),
          }],
        });
      }
      if (query.includes('SELECT COUNT(*) FROM chat_sessions')) {
        return Promise.resolve({ rows: [{ count: '1' }] });
      }
      if (query.includes('SELECT * FROM chat_sessions WHERE session_id')) {
        return Promise.resolve({
          rows: [{
            session_id: mockSessionId,
            user_id: mockUserId,
            is_active: true,
            created_at: new Date(),
            last_activity: new Date(),
          }],
        });
      }
      if (query.includes('INSERT INTO chat_messages')) {
        return Promise.resolve({
          rows: [{
            id: 'msg123',
            user_id: mockUserId,
            content: 'Test message',
            type: 'user',
            timestamp: new Date(),
            metadata: null,
          }],
        });
      }
      if (query.includes('SELECT * FROM chat_messages')) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });
  }

  describe('Complete Chat Flow Integration', () => {
    it('should handle complete chat session lifecycle', async () => {
      // Create session
      const session = await chatService.createSession(mockUserId);
      expect(session.sessionId).toBe(mockSessionId);
      expect(session.userId).toBe(mockUserId);
      expect(session.isActive).toBe(true);

      // Send user message
      const userMessage = await chatService.sendMessage(
        mockSessionId,
        'Marmara Üniversitesi Bilgisayar Mühendisliği için kaç net yapmam gerekiyor?'
      );

      expect(userMessage.content).toBe('Marmara Üniversitesi Bilgisayar Mühendisliği için kaç net yapmam gerekiyor?');
      expect(userMessage.type).toBe('user');
      expect(userMessage.userId).toBe(mockUserId);

      // Add bot response
      const botResponse = await chatService.addBotResponse(
        mockSessionId,
        'Marmara Üniversitesi Bilgisayar Mühendisliği (SAY) için 2023 yılı verilerine göre: TYT Net: 25-30, AYT Net: 20-25',
        {
          intent: 'net_calculation',
          entities: { university: 'Marmara Üniversitesi', department: 'Bilgisayar Mühendisliği' },
        }
      );

      expect(botResponse.type).toBe('bot');
      expect(botResponse.content).toContain('Marmara Üniversitesi Bilgisayar Mühendisliği');
      expect(botResponse.metadata?.intent).toBe('net_calculation');

      // Verify session is still active
      const isActive = await chatService.isSessionActive(mockSessionId);
      expect(isActive).toBe(true);
    });

    it('should handle clarification flow', async () => {
      const session = await chatService.createSession(mockUserId);
      
      // Send incomplete message
      await chatService.sendMessage(mockSessionId, 'Marmara Üniversitesi için net hesaplama');

      // Bot should ask for clarification
      const clarificationResponse = await chatService.addBotResponse(
        mockSessionId,
        'Marmara Üniversitesi için net hesaplama yapmak istediğinizi anlıyorum. Hangi bölümü soruyorsunuz?',
        {
          intent: 'clarification_needed',
          entities: { university: 'Marmara Üniversitesi' },
        }
      );

      expect(clarificationResponse.content).toContain('Hangi bölümü soruyorsunuz?');
      expect(clarificationResponse.metadata?.intent).toBe('clarification_needed');
    });

    it('should handle department search flow', async () => {
      const session = await chatService.createSession(mockUserId);
      
      // Send department search message
      await chatService.sendMessage(mockSessionId, 'Marmara Üniversitesi\'nde hangi bölümler var?');

      // Bot should list departments
      const botResponse = await chatService.addBotResponse(
        mockSessionId,
        `Marmara Üniversitesi'nde bulunan bölümler:

• Bilgisayar Mühendisliği (Mühendislik Fakültesi)
• İşletme (İktisadi ve İdari Bilimler Fakültesi)

Hangi bölüm hakkında daha detaylı bilgi almak istiyorsunuz?`,
        {
          intent: 'department_search',
          entities: { university: 'Marmara Üniversitesi' },
        }
      );

      expect(botResponse.content).toContain('Bilgisayar Mühendisliği');
      expect(botResponse.content).toContain('İşletme');
    });

    it('should handle base score inquiry flow', async () => {
      const session = await chatService.createSession(mockUserId);
      
      // Send base score inquiry
      await chatService.sendMessage(
        mockSessionId, 
        'Marmara Üniversitesi Bilgisayar Mühendisliği taban puanı nedir?'
      );

      // Bot should provide score information
      const botResponse = await chatService.addBotResponse(
        mockSessionId,
        `Marmara Üniversitesi Bilgisayar Mühendisliği (SAY) 2023 yılı verileri:

Taban Puan: 450.5
Tavan Puan: 520.3
Kontenjan: 120
Taban Sıralama: 15000`,
        {
          intent: 'base_score',
          entities: { university: 'Marmara Üniversitesi', department: 'Bilgisayar Mühendisliği' },
        }
      );

      expect(botResponse.content).toContain('450.5');
      expect(botResponse.content).toContain('520.3');
      expect(botResponse.content).toContain('120');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle service errors gracefully', async () => {
      const session = await chatService.createSession(mockUserId);
      
      // Send message
      await chatService.sendMessage(mockSessionId, 'Test message');

      // Bot should provide fallback response for errors
      const fallbackResponse = await chatService.addBotResponse(
        mockSessionId,
        'Üzgünüm, şu anda sorunuzu işleyemiyorum. Lütfen daha sonra tekrar deneyin veya sorunuzu farklı şekilde ifade edin.',
        { intent: 'error_fallback' }
      );

      expect(fallbackResponse.content).toContain('Üzgünüm');
      expect(fallbackResponse.metadata?.intent).toBe('error_fallback');
    });

    it('should handle data access errors gracefully', async () => {
      const session = await chatService.createSession(mockUserId);
      
      await chatService.sendMessage(mockSessionId, 'Net hesaplama sorusu');

      // Bot should provide error response for data access issues
      const errorResponse = await chatService.addBotResponse(
        mockSessionId,
        'Şu anda üniversite verilerine erişimde sorun yaşıyoruz. Lütfen birkaç dakika sonra tekrar deneyin.',
        { intent: 'data_error' }
      );

      expect(errorResponse.content).toContain('üniversite verilerine erişimde sorun');
      expect(errorResponse.metadata?.intent).toBe('data_error');
    });

    it('should handle calculation errors gracefully', async () => {
      const session = await chatService.createSession(mockUserId);
      
      await chatService.sendMessage(mockSessionId, 'Net hesaplama sorusu');

      // Bot should provide error response for calculation issues
      const errorResponse = await chatService.addBotResponse(
        mockSessionId,
        'Net hesaplama yaparken bir sorun oluştu. Lütfen bölüm ve üniversite bilgilerini kontrol edip tekrar deneyin.',
        { intent: 'calculation_error' }
      );

      expect(errorResponse.content).toContain('Net hesaplama yaparken bir sorun oluştu');
      expect(errorResponse.metadata?.intent).toBe('calculation_error');
    });

    it('should handle session limits and business logic errors', async () => {
      // Mock database to return max sessions reached
      mockDb.query.mockImplementation((query: string) => {
        if (query.includes('SELECT COUNT(*) FROM chat_sessions')) {
          return Promise.resolve({ rows: [{ count: '3' }] }); // Max sessions reached
        }
        return Promise.resolve({ rows: [] });
      });

      // Should throw business logic error
      await expect(chatService.createSession(mockUserId)).rejects.toThrow(BusinessLogicError);
      await expect(chatService.createSession(mockUserId)).rejects.toThrow(
        'Maximum number of active sessions reached'
      );
    });

    it('should handle invalid session operations', async () => {
      // Mock session not found
      mockDb.query.mockImplementation((query: string) => {
        if (query.includes('SELECT * FROM chat_sessions WHERE session_id')) {
          return Promise.resolve({ rows: [] }); // Session not found
        }
        return Promise.resolve({ rows: [] });
      });

      // Should throw not found error
      await expect(chatService.getSession('invalid-session')).rejects.toThrow(NotFoundError);
      await expect(chatService.sendMessage('invalid-session', 'test')).rejects.toThrow(NotFoundError);
    });

    it('should handle validation errors for invalid inputs', async () => {
      // Test empty user ID
      await expect(chatService.createSession('')).rejects.toThrow(ValidationError);
      await expect(chatService.createSession('   ')).rejects.toThrow(ValidationError);

      // Test empty session ID
      await expect(chatService.getSession('')).rejects.toThrow(ValidationError);
      await expect(chatService.sendMessage('', 'test')).rejects.toThrow(ValidationError);

      // Test empty message content
      await expect(chatService.sendMessage(mockSessionId, '')).rejects.toThrow(ValidationError);
      await expect(chatService.sendMessage(mockSessionId, '   ')).rejects.toThrow(ValidationError);
    });
  });

  describe('Service Integration Scenarios', () => {
    it('should handle multi-turn conversation with context', async () => {
      const session = await chatService.createSession(mockUserId);

      // First message - incomplete information
      await chatService.sendMessage(mockSessionId, 'Net hesaplama yapmak istiyorum');
      
      // Bot asks for clarification
      await chatService.addBotResponse(
        mockSessionId,
        'Net hesaplama yapmak için hangi üniversiteyi soruyorsunuz?',
        { intent: 'clarification_needed' }
      );

      // Second message - provides university
      await chatService.sendMessage(mockSessionId, 'Marmara Üniversitesi');
      
      // Bot asks for department
      await chatService.addBotResponse(
        mockSessionId,
        'Marmara Üniversitesi\'nde hangi bölümü soruyorsunuz?',
        { intent: 'clarification_needed' }
      );

      // Third message - provides complete information
      await chatService.sendMessage(mockSessionId, 'Bilgisayar Mühendisliği');
      
      // Now bot can provide calculation
      await chatService.addBotResponse(
        mockSessionId,
        'Marmara Üniversitesi Bilgisayar Mühendisliği için net hesaplama tamamlandı. TYT: 25-30, AYT: 20-25',
        { intent: 'net_calculation', entities: { university: 'Marmara Üniversitesi', department: 'Bilgisayar Mühendisliği' } }
      );

      // Verify session is still active
      const isActive = await chatService.isSessionActive(mockSessionId);
      expect(isActive).toBe(true);
    });

    it('should handle multiple messages in session', async () => {
      const session = await chatService.createSession(mockUserId);

      // Send multiple messages
      const messages = [];
      for (let i = 0; i < 3; i++) {
        messages.push(chatService.sendMessage(mockSessionId, `Message ${i + 1}`));
      }

      // All messages should be processed successfully
      const results = await Promise.all(messages);
      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.content).toBe(`Message ${index + 1}`);
        expect(result.type).toBe('user');
      });

      // Verify session is still active
      const isActive = await chatService.isSessionActive(mockSessionId);
      expect(isActive).toBe(true);
    });

    it('should handle session creation for same user', async () => {
      // Create session for user
      const session1 = await chatService.createSession(mockUserId);
      expect(session1.sessionId).toBe(mockSessionId);

      // Send message to session
      await chatService.sendMessage(session1.sessionId, 'Test message');

      // Verify session history
      const history = await chatService.getSessionHistory(session1.sessionId);
      expect(history).toBeDefined();
    });
  });

  describe('Performance and Cleanup', () => {
    it('should handle session cleanup operations', async () => {
      const session = await chatService.createSession(mockUserId);

      // Add some messages
      await chatService.sendMessage(mockSessionId, 'Test message 1');
      await chatService.addBotResponse(mockSessionId, 'Bot response 1');

      // End session
      await chatService.endSession(mockSessionId);

      // Verify session is no longer active
      const isActive = await chatService.isSessionActive(mockSessionId);
      expect(isActive).toBe(false);
    });

    it('should handle message search and pagination', async () => {
      const session = await chatService.createSession(mockUserId);

      // Mock message search results
      mockDb.query.mockImplementation((query: string) => {
        if (query.includes('WHERE content ILIKE')) {
          return Promise.resolve({
            rows: [
              {
                id: 'msg1',
                user_id: mockUserId,
                content: 'Test message with search term',
                type: 'user',
                timestamp: new Date(),
                metadata: null,
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      // Search messages
      const searchResults = await chatService.searchMessages(mockSessionId, 'search term');
      expect(searchResults).toHaveLength(1);

      // Get paginated history
      const paginatedHistory = await chatService.getSessionHistory(mockSessionId, 10, 0);
      expect(paginatedHistory).toBeDefined();
    });

    it('should handle message count and statistics', async () => {
      const session = await chatService.createSession(mockUserId);

      // Mock message count queries
      mockDb.query.mockImplementation((query: string) => {
        if (query.includes('COUNT(*)') && query.includes('type = $2')) {
          return Promise.resolve({ rows: [{ count: '5' }] });
        }
        if (query.includes('COUNT(*)')) {
          return Promise.resolve({ rows: [{ count: '10' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      // Get message counts
      const totalMessages = await chatService.getMessageCount(mockSessionId);
      const userMessages = await chatService.getMessageCount(mockSessionId, 'user');
      const botMessages = await chatService.getMessageCount(mockSessionId, 'bot');

      expect(totalMessages).toBe(10);
      expect(userMessages).toBe(5);
      expect(botMessages).toBe(5);
    });
  });
});