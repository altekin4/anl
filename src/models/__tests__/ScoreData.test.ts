import { ScoreData } from '../ScoreData';
import { ValidationError } from '@/utils/errors';

describe('ScoreData Model', () => {
  describe('constructor and validation', () => {
    it('should create valid score data', () => {
      const scoreData = new ScoreData({
        id: 1,
        departmentId: 1,
        year: 2024,
        scoreType: 'SAY',
        baseScore: 450.5,
        ceilingScore: 520.75,
        baseRank: 15000,
        ceilingRank: 5000,
        quota: 100,
      });

      expect(scoreData.id).toBe(1);
      expect(scoreData.departmentId).toBe(1);
      expect(scoreData.year).toBe(2024);
      expect(scoreData.scoreType).toBe('SAY');
      expect(scoreData.baseScore).toBe(450.5);
      expect(scoreData.ceilingScore).toBe(520.75);
      expect(scoreData.baseRank).toBe(15000);
      expect(scoreData.ceilingRank).toBe(5000);
      expect(scoreData.quota).toBe(100);
    });

    it('should throw ValidationError for invalid department ID', () => {
      expect(() => {
        new ScoreData({ departmentId: 0 });
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid year', () => {
      expect(() => {
        new ScoreData({ departmentId: 1, year: 1999 });
      }).toThrow(ValidationError);

      expect(() => {
        new ScoreData({ departmentId: 1, year: 2030 });
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid score type', () => {
      expect(() => {
        new ScoreData({ departmentId: 1, scoreType: 'INVALID' as any });
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for base score higher than ceiling score', () => {
      expect(() => {
        new ScoreData({
          departmentId: 1,
          baseScore: 500,
          ceilingScore: 400,
        });
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for negative scores', () => {
      expect(() => {
        new ScoreData({ departmentId: 1, baseScore: -10 });
      }).toThrow(ValidationError);

      expect(() => {
        new ScoreData({ departmentId: 1, ceilingScore: -10 });
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for scores above 600', () => {
      expect(() => {
        new ScoreData({ departmentId: 1, baseScore: 700 });
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid ranks', () => {
      expect(() => {
        new ScoreData({
          departmentId: 1,
          baseRank: 5000,
          ceilingRank: 10000,
        });
      }).toThrow(ValidationError);
    });
  });

  describe('score and rank analysis', () => {
    let scoreData: ScoreData;

    beforeEach(() => {
      scoreData = new ScoreData({
        departmentId: 1,
        year: 2024,
        scoreType: 'SAY',
        baseScore: 450,
        ceilingScore: 520,
        baseRank: 15000,
        ceilingRank: 5000,
        quota: 100,
      });
    });

    it('should return correct score range', () => {
      const range = scoreData.getScoreRange();
      expect(range.min).toBe(450);
      expect(range.max).toBe(520);
    });

    it('should return correct rank range', () => {
      const range = scoreData.getRankRange();
      expect(range.best).toBe(5000);
      expect(range.worst).toBe(15000);
    });

    it('should determine competitiveness correctly', () => {
      expect(scoreData.isCompetitive()).toBe(true);

      const lowScore = new ScoreData({
        departmentId: 1,
        baseScore: 300,
      });
      expect(lowScore.isCompetitive()).toBe(false);
    });

    it('should return correct competitivity level', () => {
      expect(scoreData.getCompetitivityLevel()).toBe('high');

      const veryHighScore = new ScoreData({
        departmentId: 1,
        baseScore: 550,
      });
      expect(veryHighScore.getCompetitivityLevel()).toBe('very_high');

      const mediumScore = new ScoreData({
        departmentId: 1,
        baseScore: 350,
      });
      expect(mediumScore.getCompetitivityLevel()).toBe('medium');

      const lowScore = new ScoreData({
        departmentId: 1,
        baseScore: 250,
      });
      expect(lowScore.getCompetitivityLevel()).toBe('low');
    });

    it('should calculate safe target score', () => {
      const safeScore = scoreData.getSafeTargetScore();
      expect(safeScore).toBe(472.5); // 450 * 1.05

      const customMargin = scoreData.getSafeTargetScore(0.1);
      expect(customMargin).toBe(495); // 450 * 1.1
    });

    it('should check if current year', () => {
      const currentYear = new Date().getFullYear();
      const currentYearData = new ScoreData({
        departmentId: 1,
        year: currentYear,
      });
      expect(currentYearData.isCurrentYear()).toBe(true);

      const oldData = new ScoreData({
        departmentId: 1,
        year: currentYear - 1,
      });
      expect(oldData.isCurrentYear()).toBe(false);
    });
  });

  describe('serialization', () => {
    it('should convert to JSON correctly', () => {
      const scoreData = new ScoreData({
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

      const json = scoreData.toJSON();

      expect(json).toEqual({
        id: 1,
        departmentId: 1,
        year: 2024,
        scoreType: 'SAY',
        baseScore: 450,
        ceilingScore: 520,
        baseRank: 15000,
        ceilingRank: 5000,
        quota: 100,
        createdAt: expect.any(Date),
      });
    });

    it('should create from database row', () => {
      const dbRow = {
        id: 1,
        department_id: 1,
        year: 2024,
        score_type: 'SAY',
        base_score: '450.50',
        ceiling_score: '520.75',
        base_rank: 15000,
        ceiling_rank: 5000,
        quota: 100,
        created_at: '2024-01-01T00:00:00Z',
      };

      const scoreData = ScoreData.fromDatabase(dbRow);

      expect(scoreData.id).toBe(1);
      expect(scoreData.departmentId).toBe(1);
      expect(scoreData.baseScore).toBe(450.5);
      expect(scoreData.ceilingScore).toBe(520.75);
    });
  });
});