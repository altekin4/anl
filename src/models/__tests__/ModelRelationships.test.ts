import { University } from '../University';
import { Department } from '../Department';
import { ScoreData } from '../ScoreData';
import { ChatSession } from '../ChatSession';
import { ChatMessage } from '../ChatMessage';
import { ValidationError } from '@/utils/errors';

describe('Model Relationships and Database Constraints', () => {
  describe('University-Department relationship', () => {
    it('should maintain referential integrity between university and department', () => {
      const university = new University({
        id: 1,
        name: 'Marmara Üniversitesi',
        city: 'İstanbul',
        type: 'Devlet',
      });

      const department = new Department({
        id: 1,
        universityId: university.id,
        name: 'Bilgisayar Mühendisliği',
        faculty: 'Mühendislik Fakültesi',
      });

      expect(department.universityId).toBe(university.id);
    });

    it('should validate department belongs to valid university', () => {
      expect(() => {
        new Department({
          universityId: -1, // Invalid university ID
          name: 'Test Department',
        });
      }).toThrow(ValidationError);
    });
  });

  describe('Department-ScoreData relationship', () => {
    it('should maintain referential integrity between department and score data', () => {
      const department = new Department({
        id: 1,
        universityId: 1,
        name: 'Bilgisayar Mühendisliği',
        faculty: 'Mühendislik Fakültesi',
      });

      const scoreData = new ScoreData({
        id: 1,
        departmentId: department.id,
        year: 2024,
        scoreType: 'SAY',
        baseScore: 450,
        ceilingScore: 520,
        baseRank: 15000,
        ceilingRank: 5000,
        quota: 100,
      });

      expect(scoreData.departmentId).toBe(department.id);
    });

    it('should validate score data belongs to valid department', () => {
      expect(() => {
        new ScoreData({
          departmentId: -1, // Invalid department ID
          year: 2024,
          scoreType: 'SAY',
        });
      }).toThrow(ValidationError);
    });
  });

  describe('ChatSession-ChatMessage relationship', () => {
    it('should maintain referential integrity between session and messages', () => {
      const session = new ChatSession({
        sessionId: 'session-123',
        userId: 'user-456',
      });

      const message = new ChatMessage({
        id: 'msg-1',
        userId: session.userId,
        content: 'Test message',
        type: 'user',
      });

      session.addMessage(message);

      expect(session.messages).toContain(message);
      expect(message.userId).toBe(session.userId);
    });

    it('should prevent adding messages from different users', () => {
      const session = new ChatSession({
        sessionId: 'session-123',
        userId: 'user-456',
      });

      const messageFromDifferentUser = new ChatMessage({
        id: 'msg-1',
        userId: 'different-user',
        content: 'Test message',
        type: 'user',
      });

      expect(() => {
        session.addMessage(messageFromDifferentUser);
      }).toThrow(ValidationError);
    });
  });

  describe('Data consistency validation', () => {
    it('should validate score data consistency', () => {
      // Test that base score cannot be higher than ceiling score
      expect(() => {
        new ScoreData({
          departmentId: 1,
          baseScore: 500,
          ceilingScore: 400, // Lower than base score
        });
      }).toThrow(ValidationError);

      // Test that base rank should be higher than ceiling rank (worse rank)
      expect(() => {
        new ScoreData({
          departmentId: 1,
          baseRank: 5000,
          ceilingRank: 10000, // Higher rank number (worse rank)
        });
      }).toThrow(ValidationError);
    });

    it('should validate university type constraints', () => {
      expect(() => {
        new University({
          name: 'Test University',
          type: 'Private' as any, // Invalid type
        });
      }).toThrow(ValidationError);
    });

    it('should validate score type constraints', () => {
      expect(() => {
        new ScoreData({
          departmentId: 1,
          scoreType: 'INVALID' as any,
        });
      }).toThrow(ValidationError);
    });

    it('should validate message type constraints', () => {
      expect(() => {
        new ChatMessage({
          id: 'msg-1',
          userId: 'user-1',
          content: 'test',
          type: 'system' as any, // Invalid type
        });
      }).toThrow(ValidationError);
    });
  });

  describe('Business logic validation', () => {
    it('should validate year constraints in score data', () => {
      const currentYear = new Date().getFullYear();
      
      // Test past year boundary
      expect(() => {
        new ScoreData({
          departmentId: 1,
          year: 1999, // Too old
        });
      }).toThrow(ValidationError);

      // Test future year boundary
      expect(() => {
        new ScoreData({
          departmentId: 1,
          year: currentYear + 2, // Too far in future
        });
      }).toThrow(ValidationError);

      // Test valid years
      const validScoreData = new ScoreData({
        departmentId: 1,
        year: currentYear,
      });
      expect(validScoreData.year).toBe(currentYear);
    });

    it('should validate session expiration logic', () => {
      const expiredSession = new ChatSession({
        sessionId: 'session-1',
        userId: 'user-1',
        lastActivity: new Date(Date.now() - 35 * 60 * 1000), // 35 minutes ago
      });

      const activeSession = new ChatSession({
        sessionId: 'session-2',
        userId: 'user-1',
        lastActivity: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
      });

      expect(expiredSession.isExpired(30)).toBe(true);
      expect(activeSession.isExpired(30)).toBe(false);
    });

    it('should validate score range calculations', () => {
      const scoreData = new ScoreData({
        departmentId: 1,
        baseScore: 400,
        ceilingScore: 500,
        baseRank: 20000,
        ceilingRank: 10000,
      });

      const scoreRange = scoreData.getScoreRange();
      expect(scoreRange.min).toBe(400);
      expect(scoreRange.max).toBe(500);

      const rankRange = scoreData.getRankRange();
      expect(rankRange.best).toBe(10000); // Lower number is better rank
      expect(rankRange.worst).toBe(20000); // Higher number is worse rank
    });

    it('should validate safety margin calculations', () => {
      const scoreData = new ScoreData({
        departmentId: 1,
        baseScore: 400,
      });

      const defaultSafeScore = scoreData.getSafeTargetScore();
      expect(defaultSafeScore).toBe(420); // 400 * 1.05

      const customSafeScore = scoreData.getSafeTargetScore(0.1);
      expect(customSafeScore).toBe(440); // 400 * 1.1
    });
  });

  describe('Edge cases and boundary conditions', () => {
    it('should handle empty arrays properly', () => {
      const university = new University({
        name: 'Test University',
        aliases: [], // Empty array
      });

      expect(university.aliases).toEqual([]);
      expect(university.hasAlias('test')).toBe(false);
    });

    it('should handle whitespace in validation', () => {
      expect(() => {
        new University({
          name: '   ', // Only whitespace
        });
      }).toThrow(ValidationError);

      expect(() => {
        new ChatMessage({
          id: 'msg-1',
          userId: 'user-1',
          content: '   ', // Only whitespace
        });
      }).toThrow(ValidationError);
    });

    it('should handle maximum length constraints', () => {
      // Test university name length
      const maxLengthName = 'a'.repeat(255);
      const university = new University({
        name: maxLengthName,
      });
      expect(university.name).toBe(maxLengthName);

      // Test message content length
      const maxContentLength = 'a'.repeat(1000);
      const message = new ChatMessage({
        id: 'msg-1',
        userId: 'user-1',
        content: maxContentLength,
      });
      expect(message.content).toBe(maxContentLength);
    });

    it('should handle score boundaries correctly', () => {
      // Test minimum valid scores
      const minScoreData = new ScoreData({
        departmentId: 1,
        baseScore: 0,
        ceilingScore: 0,
      });
      expect(minScoreData.baseScore).toBe(0);

      // Test maximum valid scores
      const maxScoreData = new ScoreData({
        departmentId: 1,
        baseScore: 600,
        ceilingScore: 600,
      });
      expect(maxScoreData.ceilingScore).toBe(600);
    });
  });
});