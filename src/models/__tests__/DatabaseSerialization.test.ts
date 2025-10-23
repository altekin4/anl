import { University } from '../University';
import { Department } from '../Department';
import { ScoreData } from '../ScoreData';
import { ChatSession } from '../ChatSession';
import { ChatMessage } from '../ChatMessage';

describe('Database Serialization and Deserialization', () => {
  describe('University database operations', () => {
    it('should handle null/undefined values from database', () => {
      const dbRow = {
        id: 1,
        name: 'Test University',
        city: null, // Null city
        type: 'Devlet',
        aliases: null, // Null aliases
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const university = University.fromDatabase(dbRow);

      expect(university.id).toBe(1);
      expect(university.name).toBe('Test University');
      expect(university.city).toBe('');
      expect(university.aliases).toEqual([]);
    });

    it('should preserve data integrity during JSON conversion', () => {
      const originalData = {
        id: 1,
        name: 'Marmara Üniversitesi',
        city: 'İstanbul',
        type: 'Devlet' as const,
        aliases: ['M.Ü.', 'Marmara'],
      };

      const university = new University(originalData);
      const json = university.toJSON();

      expect(json.id).toBe(originalData.id);
      expect(json.name).toBe(originalData.name);
      expect(json.city).toBe(originalData.city);
      expect(json.type).toBe(originalData.type);
      expect(json.aliases).toEqual(originalData.aliases);
      expect(json.aliases).not.toBe(originalData.aliases); // Should be a copy
    });
  });

  describe('Department database operations', () => {
    it('should handle database row with missing optional fields', () => {
      const dbRow = {
        id: 1,
        university_id: 1,
        name: 'Test Department',
        faculty: null, // Null faculty
        language: null, // Null language
        aliases: null, // Null aliases
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const department = Department.fromDatabase(dbRow);

      expect(department.id).toBe(1);
      expect(department.universityId).toBe(1);
      expect(department.name).toBe('Test Department');
      expect(department.faculty).toBe('');
      expect(department.language).toBe('Türkçe'); // Default value
      expect(department.aliases).toEqual([]);
    });

    it('should maintain language detection after database roundtrip', () => {
      const department = new Department({
        id: 1,
        universityId: 1,
        name: 'Computer Engineering',
        language: '%30 İngilizce',
      });

      const json = department.toJSON();
      const recreated = new Department(json);

      expect(recreated.isPartialEnglish()).toBe(true);
      expect(recreated.getLanguageType()).toBe('partial_english');
    });
  });

  describe('ScoreData database operations', () => {
    it('should handle string numbers from database', () => {
      const dbRow = {
        id: 1,
        department_id: 1,
        year: 2024,
        score_type: 'SAY',
        base_score: '450.75', // String number
        ceiling_score: '520.25', // String number
        base_rank: 15000,
        ceiling_rank: 5000,
        quota: 100,
        created_at: '2024-01-01T00:00:00Z',
      };

      const scoreData = ScoreData.fromDatabase(dbRow);

      expect(scoreData.baseScore).toBe(450.75);
      expect(scoreData.ceilingScore).toBe(520.25);
      expect(typeof scoreData.baseScore).toBe('number');
      expect(typeof scoreData.ceilingScore).toBe('number');
    });

    it('should preserve calculation methods after database roundtrip', () => {
      const originalScore = new ScoreData({
        id: 1,
        departmentId: 1,
        year: 2024,
        scoreType: 'SAY',
        baseScore: 450,
        ceilingScore: 520,
        baseRank: 15000,
        ceilingRank: 5000,
        quota: 100,
      });

      const json = originalScore.toJSON();
      const recreated = new ScoreData(json);

      expect(recreated.isCompetitive()).toBe(originalScore.isCompetitive());
      expect(recreated.getCompetitivityLevel()).toBe(originalScore.getCompetitivityLevel());
      expect(recreated.getSafeTargetScore()).toBe(originalScore.getSafeTargetScore());
    });
  });

  describe('ChatSession database operations', () => {
    it('should handle numeric user ID from database', () => {
      const dbRow = {
        id: 'session-123',
        user_id: 456, // Numeric user ID
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        last_activity: '2024-01-01T01:00:00Z',
      };

      const session = ChatSession.fromDatabase(dbRow);

      expect(session.sessionId).toBe('session-123');
      expect(session.userId).toBe('456'); // Should be converted to string
      expect(typeof session.userId).toBe('string');
    });

    it('should maintain session state after database roundtrip', () => {
      const originalSession = new ChatSession({
        sessionId: 'session-123',
        userId: 'user-456',
        isActive: true,
      });

      // Simulate some operations
      originalSession.deactivate();
      originalSession.activate();

      const json = originalSession.toJSON();
      const recreated = new ChatSession(json);

      expect(recreated.isActive).toBe(originalSession.isActive);
      expect(recreated.getDurationMinutes()).toBeGreaterThanOrEqual(0);
    });
  });

  describe('ChatMessage database operations', () => {
    it('should handle database row with metadata', () => {
      const dbRow = {
        id: 'msg-123',
        user_id: 456, // Numeric user ID
        content: 'Marmara Üniversitesi kaç net?',
        message_type: 'user',
        created_at: '2024-01-01T00:00:00Z',
        intent: 'net_calculation',
        entities: { university: 'Marmara', department: null },
      };

      const message = ChatMessage.fromDatabase(dbRow);

      expect(message.id).toBe('msg-123');
      expect(message.userId).toBe('456'); // Should be converted to string
      expect(message.content).toBe('Marmara Üniversitesi kaç net?');
      expect(message.type).toBe('user');
      expect(message.getIntent()).toBe('net_calculation');
      expect(message.getEntity('university')).toBe('Marmara');
      expect(message.getEntity('department')).toBeNull();
    });

    it('should preserve message analysis after database roundtrip', () => {
      const originalMessage = new ChatMessage({
        id: 'msg-1',
        userId: 'user-1',
        content: 'Marmara Üniversitesi İşletme kaç net gerekir?',
        type: 'user',
      });

      // Add some metadata
      originalMessage.setIntent('net_calculation');
      originalMessage.setEntity('university', 'Marmara');
      originalMessage.setEntity('department', 'İşletme');

      const json = originalMessage.toJSON();
      const recreated = new ChatMessage(json);

      expect(recreated.isQuestion()).toBe(originalMessage.isQuestion());
      expect(recreated.getWordCount()).toBe(originalMessage.getWordCount());
      expect(recreated.containsKeywords(['Marmara', 'İşletme'])).toBe(true);
      expect(recreated.getIntent()).toBe('net_calculation');
      expect(recreated.getEntity('university')).toBe('Marmara');
    });
  });

  describe('Date handling', () => {
    it('should handle various date formats from database', () => {
      const formats = [
        '2024-01-01T00:00:00Z',
        '2024-01-01T00:00:00.000Z',
        '2024-01-01 00:00:00',
      ];

      formats.forEach(dateString => {
        const university = University.fromDatabase({
          id: 1,
          name: 'Test',
          city: 'Test',
          type: 'Devlet',
          aliases: [],
          created_at: dateString,
          updated_at: dateString,
        });

        expect(university.createdAt).toBeInstanceOf(Date);
        expect(university.updatedAt).toBeInstanceOf(Date);
      });
    });

    it('should handle timestamp precision', () => {
      const message = new ChatMessage({
        id: 'msg-1',
        userId: 'user-1',
        content: 'test',
        type: 'user',
      });

      const timestamp1 = message.timestamp.getTime();
      
      // Create another message immediately
      const message2 = new ChatMessage({
        id: 'msg-2',
        userId: 'user-1',
        content: 'test2',
        type: 'user',
      });

      const timestamp2 = message2.timestamp.getTime();

      expect(timestamp2).toBeGreaterThanOrEqual(timestamp1);
    });
  });

  describe('Array and object cloning', () => {
    it('should create deep copies of arrays in toJSON', () => {
      const university = new University({
        name: 'Test University',
        aliases: ['Alias1', 'Alias2'],
      });

      const json = university.toJSON();
      
      // Modify original aliases
      university.addAlias('Alias3');
      
      // JSON should not be affected
      expect(json.aliases).toEqual(['Alias1', 'Alias2']);
      expect(json.aliases).not.toContain('Alias3');
    });

    it('should create deep copies of metadata in toJSON', () => {
      const message = new ChatMessage({
        id: 'msg-1',
        userId: 'user-1',
        content: 'test',
        type: 'user',
        metadata: {
          entities: { university: 'Test' },
        },
      });

      const json = message.toJSON();
      
      // Modify original metadata
      message.setEntity('department', 'New Department');
      
      // JSON should not be affected
      expect(json.metadata?.entities).toEqual({ university: 'Test' });
      expect(json.metadata?.entities).not.toHaveProperty('department');
    });
  });
});