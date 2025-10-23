import { ConversationContextManager } from '../ConversationContextManager';

describe('ConversationContextManager', () => {
  let contextManager: ConversationContextManager;
  const sessionId = 'test-session-123';
  const userId = 'user-456';

  beforeEach(() => {
    contextManager = new ConversationContextManager();
  });

  describe('getOrCreateContext', () => {
    it('should create new context for new session', () => {
      const context = contextManager.getOrCreateContext(sessionId, userId);

      expect(context.sessionId).toBe(sessionId);
      expect(context.userId).toBe(userId);
      expect(context.entries).toHaveLength(0);
      expect(context.currentEntities).toEqual({});
      expect(context.conversationState).toBe('initial');
    });

    it('should return existing context for existing session', () => {
      const context1 = contextManager.getOrCreateContext(sessionId, userId);
      const context2 = contextManager.getOrCreateContext(sessionId, userId);

      expect(context1).toBe(context2);
    });

    it('should update last activity when accessing existing context', () => {
      const context1 = contextManager.getOrCreateContext(sessionId, userId);
      const firstActivity = context1.lastActivity;

      // Wait a bit and access again
      setTimeout(() => {
        const context2 = contextManager.getOrCreateContext(sessionId, userId);
        expect(context2.lastActivity.getTime()).toBeGreaterThan(firstActivity.getTime());
      }, 10);
    });
  });

  describe('addEntry', () => {
    it('should add entry to conversation context', () => {
      contextManager.getOrCreateContext(sessionId, userId);
      
      const entities = { university: 'Test University' };
      contextManager.addEntry(sessionId, 'net_calculation', entities, 'test message');

      const context = contextManager.getOrCreateContext(sessionId, userId);
      expect(context.entries).toHaveLength(1);
      expect(context.entries[0].intent).toBe('net_calculation');
      expect(context.entries[0].entities).toEqual(entities);
      expect(context.entries[0].userMessage).toBe('test message');
    });

    it('should merge entities into current context', () => {
      contextManager.getOrCreateContext(sessionId, userId);
      
      contextManager.addEntry(sessionId, 'net_calculation', { university: 'Test Uni' }, 'message 1');
      contextManager.addEntry(sessionId, 'net_calculation', { department: 'Test Dept' }, 'message 2');

      const context = contextManager.getOrCreateContext(sessionId, userId);
      expect(context.currentEntities).toEqual({
        university: 'Test Uni',
        department: 'Test Dept'
      });
    });

    it('should update conversation state based on entities', () => {
      contextManager.getOrCreateContext(sessionId, userId);
      
      contextManager.addEntry(sessionId, 'net_calculation', { university: 'Test Uni' }, 'message 1');
      let context = contextManager.getOrCreateContext(sessionId, userId);
      expect(context.conversationState).toBe('gathering_info');

      contextManager.addEntry(sessionId, 'net_calculation', { 
        department: 'Test Dept', 
        scoreType: 'SAY' 
      }, 'message 2');
      context = contextManager.getOrCreateContext(sessionId, userId);
      expect(context.conversationState).toBe('processing');
    });

    it('should limit entries to maximum count', () => {
      contextManager.getOrCreateContext(sessionId, userId);
      
      // Add more than max entries
      for (let i = 0; i < 15; i++) {
        contextManager.addEntry(sessionId, 'test_intent', {}, `message ${i}`);
      }

      const context = contextManager.getOrCreateContext(sessionId, userId);
      expect(context.entries.length).toBeLessThanOrEqual(10);
    });
  });

  describe('getAccumulatedEntities', () => {
    it('should return accumulated entities from conversation', () => {
      contextManager.getOrCreateContext(sessionId, userId);
      
      contextManager.addEntry(sessionId, 'intent1', { university: 'Test Uni' }, 'msg1');
      contextManager.addEntry(sessionId, 'intent2', { department: 'Test Dept' }, 'msg2');

      const entities = contextManager.getAccumulatedEntities(sessionId);
      expect(entities).toEqual({
        university: 'Test Uni',
        department: 'Test Dept'
      });
    });

    it('should return empty object for non-existent session', () => {
      const entities = contextManager.getAccumulatedEntities('non-existent');
      expect(entities).toEqual({});
    });
  });

  describe('hasRequiredEntities', () => {
    beforeEach(() => {
      contextManager.getOrCreateContext(sessionId, userId);
    });

    it('should return true when all required entities are present', () => {
      contextManager.addEntry(sessionId, 'net_calculation', {
        university: 'Test Uni',
        department: 'Test Dept',
        scoreType: 'SAY'
      }, 'message');

      const hasRequired = contextManager.hasRequiredEntities(sessionId, 'net_calculation');
      expect(hasRequired).toBe(true);
    });

    it('should return false when required entities are missing', () => {
      contextManager.addEntry(sessionId, 'net_calculation', {
        university: 'Test Uni'
      }, 'message');

      const hasRequired = contextManager.hasRequiredEntities(sessionId, 'net_calculation');
      expect(hasRequired).toBe(false);
    });

    it('should handle different intents correctly', () => {
      contextManager.addEntry(sessionId, 'base_score', {
        university: 'Test Uni',
        department: 'Test Dept'
      }, 'message');

      const hasRequired = contextManager.hasRequiredEntities(sessionId, 'base_score');
      expect(hasRequired).toBe(true);
    });
  });

  describe('getMissingEntities', () => {
    beforeEach(() => {
      contextManager.getOrCreateContext(sessionId, userId);
    });

    it('should return missing entities for intent', () => {
      contextManager.addEntry(sessionId, 'net_calculation', {
        university: 'Test Uni'
      }, 'message');

      const missing = contextManager.getMissingEntities(sessionId, 'net_calculation');
      expect(missing).toContain('department');
      expect(missing).toContain('scoreType');
      expect(missing).not.toContain('university');
    });

    it('should return all required entities for new session', () => {
      const missing = contextManager.getMissingEntities('new-session', 'net_calculation');
      expect(missing).toEqual(['university', 'department', 'scoreType']);
    });
  });

  describe('generateClarificationQuestions', () => {
    beforeEach(() => {
      contextManager.getOrCreateContext(sessionId, userId);
    });

    it('should generate questions for missing entities', () => {
      contextManager.addEntry(sessionId, 'net_calculation', {
        university: 'Test Uni'
      }, 'message');

      const questions = contextManager.generateClarificationQuestions(sessionId, 'net_calculation');
      expect(questions.length).toBeGreaterThan(0);
      expect(questions.some(q => q.includes('bölüm'))).toBe(true);
      expect(questions.some(q => q.includes('puan türü'))).toBe(true);
    });

    it('should return empty array when all entities are present', () => {
      contextManager.addEntry(sessionId, 'net_calculation', {
        university: 'Test Uni',
        department: 'Test Dept',
        scoreType: 'SAY'
      }, 'message');

      const questions = contextManager.generateClarificationQuestions(sessionId, 'net_calculation');
      expect(questions).toHaveLength(0);
    });
  });

  describe('isRepeatingQuestion', () => {
    beforeEach(() => {
      contextManager.getOrCreateContext(sessionId, userId);
    });

    it('should detect repeated questions', () => {
      contextManager.addEntry(sessionId, 'intent1', {}, 'kaç net gerekli');
      contextManager.addEntry(sessionId, 'intent2', {}, 'başka soru');
      
      const isRepeating = contextManager.isRepeatingQuestion(sessionId, 'kaç net gerekli');
      expect(isRepeating).toBe(true);
    });

    it('should handle normalized text comparison', () => {
      contextManager.addEntry(sessionId, 'intent1', {}, 'Kaç Net Gerekli?');
      
      const isRepeating = contextManager.isRepeatingQuestion(sessionId, 'kaç net gerekli');
      expect(isRepeating).toBe(true);
    });

    it('should return false for new questions', () => {
      contextManager.addEntry(sessionId, 'intent1', {}, 'ilk soru');
      
      const isRepeating = contextManager.isRepeatingQuestion(sessionId, 'farklı soru');
      expect(isRepeating).toBe(false);
    });
  });

  describe('getConversationSummary', () => {
    it('should return default message for new conversation', () => {
      const summary = contextManager.getConversationSummary('new-session');
      expect(summary).toBe('Yeni konuşma başlatıldı.');
    });

    it('should generate summary from recent entries', () => {
      contextManager.getOrCreateContext(sessionId, userId);
      contextManager.addEntry(sessionId, 'net_calculation', { university: 'Test' }, 'msg1');
      contextManager.addEntry(sessionId, 'base_score', { department: 'Test' }, 'msg2');

      const summary = contextManager.getConversationSummary(sessionId);
      expect(summary).toContain('net_calculation');
      expect(summary).toContain('base_score');
    });
  });

  describe('clearContext', () => {
    it('should remove context for session', () => {
      contextManager.getOrCreateContext(sessionId, userId);
      contextManager.clearContext(sessionId);

      const entities = contextManager.getAccumulatedEntities(sessionId);
      expect(entities).toEqual({});
    });
  });

  describe('cleanupExpiredContexts', () => {
    it('should remove expired contexts', () => {
      // Create context and manually set old timestamp
      const context = contextManager.getOrCreateContext(sessionId, userId);
      context.lastActivity = new Date(Date.now() - 35 * 60 * 1000); // 35 minutes ago

      contextManager.cleanupExpiredContexts();

      const entities = contextManager.getAccumulatedEntities(sessionId);
      expect(entities).toEqual({});
    });
  });

  describe('getContextStats', () => {
    it('should return correct statistics', () => {
      contextManager.getOrCreateContext(sessionId, userId);
      contextManager.addEntry(sessionId, 'intent1', {}, 'msg1');
      contextManager.addEntry(sessionId, 'intent2', {}, 'msg2');

      const stats = contextManager.getContextStats();
      expect(stats.totalSessions).toBe(1);
      expect(stats.averageEntries).toBe(2);
      expect(stats.oldestSession).toBeInstanceOf(Date);
    });

    it('should handle empty contexts', () => {
      const stats = contextManager.getContextStats();
      expect(stats.totalSessions).toBe(0);
      expect(stats.averageEntries).toBe(0);
      expect(stats.oldestSession).toBeNull();
    });
  });
});