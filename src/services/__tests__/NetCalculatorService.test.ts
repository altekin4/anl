import { NetCalculatorService } from '../NetCalculatorService';
import { CalculationRequest, ScoreData } from '@/types';
import { ValidationError } from '@/utils/errors';

describe('NetCalculatorService', () => {
  let calculatorService: NetCalculatorService;

  beforeEach(() => {
    calculatorService = new NetCalculatorService();
  });

  describe('calculateRequiredNets', () => {
    const mockRequest: CalculationRequest = {
      university: 'Test University',
      department: 'Test Department',
      scoreType: 'SAY',
    };

    const mockScoreData: ScoreData = {
      id: 1,
      departmentId: 101,
      year: 2024,
      scoreType: 'SAY',
      baseScore: 400,
      ceilingScore: 450,
      baseRank: 10000,
      ceilingRank: 5000,
      quota: 100,
      createdAt: new Date(),
    };

    it('should calculate required nets with default safety margin', async () => {
      const result = await calculatorService.calculateRequiredNets(mockRequest, mockScoreData);

      expect(result).toBeDefined();
      expect(result.targetScore).toBe(420); // 400 * 1.05
      expect(result.safetyMargin).toBe(0.05);
      expect(result.basedOnYear).toBe(2024);
      expect(result.confidence).toBeDefined();
      expect(result.requiredNets.TYT).toBeDefined();
      expect(result.requiredNets.AYT).toBeDefined();
    });

    it('should determine high confidence for recent data with stable scores', async () => {
      const recentScoreData = {
        ...mockScoreData,
        year: new Date().getFullYear(),
        baseScore: 400,
        ceilingScore: 410, // Small range = stable
      };

      const result = await calculatorService.calculateRequiredNets(mockRequest, recentScoreData);
      expect(result.confidence).toBe('high');
    });

    it('should determine medium confidence for moderately recent data', async () => {
      const moderateScoreData = {
        ...mockScoreData,
        year: new Date().getFullYear() - 2,
        baseScore: 400,
        ceilingScore: 430, // Moderate range
      };

      const result = await calculatorService.calculateRequiredNets(mockRequest, moderateScoreData);
      expect(result.confidence).toBe('medium');
    });

    it('should determine low confidence for old data', async () => {
      const oldScoreData = {
        ...mockScoreData,
        year: new Date().getFullYear() - 5,
        baseScore: 400,
        ceilingScore: 500, // Large range = volatile
      };

      const result = await calculatorService.calculateRequiredNets(mockRequest, oldScoreData);
      expect(result.confidence).toBe('low');
    });

    it('should throw ValidationError for invalid request', async () => {
      const invalidRequest = {
        ...mockRequest,
        university: '',
      };

      await expect(
        calculatorService.calculateRequiredNets(invalidRequest, mockScoreData)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid score data', async () => {
      const invalidScoreData = {
        ...mockScoreData,
        baseScore: 0,
      };

      await expect(
        calculatorService.calculateRequiredNets(mockRequest, invalidScoreData)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('calculateMultipleScenarios', () => {
    const mockRequest: CalculationRequest = {
      university: 'Test University',
      department: 'Test Department',
      scoreType: 'EA',
    };

    const mockScoreData: ScoreData = {
      id: 1,
      departmentId: 101,
      year: 2024,
      scoreType: 'EA',
      baseScore: 350,
      ceilingScore: 380,
      baseRank: 15000,
      ceilingRank: 8000,
      quota: 80,
      createdAt: new Date(),
    };

    it('should calculate multiple scenarios with different safety margins', async () => {
      const safetyMargins = [0.03, 0.05, 0.08];
      const results = await calculatorService.calculateMultipleScenarios(
        mockRequest,
        mockScoreData,
        safetyMargins
      );

      expect(results).toHaveLength(3);
      expect(results[0].safetyMargin).toBe(0.03);
      expect(results[1].safetyMargin).toBe(0.05);
      expect(results[2].safetyMargin).toBe(0.08);

      // Target scores should increase with safety margin
      expect(results[0].targetScore).toBeLessThan(results[1].targetScore);
      expect(results[1].targetScore).toBeLessThan(results[2].targetScore);
    });

    it('should use default safety margins when none provided', async () => {
      const results = await calculatorService.calculateMultipleScenarios(
        mockRequest,
        mockScoreData
      );

      expect(results).toHaveLength(3);
      expect(results.map(r => r.safetyMargin)).toEqual([0.03, 0.05, 0.08]);
    });
  });

  describe('Score type specific calculations', () => {
    const baseRequest: CalculationRequest = {
      university: 'Test University',
      department: 'Test Department',
      scoreType: 'TYT',
    };

    const baseScoreData: ScoreData = {
      id: 1,
      departmentId: 101,
      year: 2024,
      scoreType: 'TYT',
      baseScore: 300,
      ceilingScore: 320,
      baseRank: 20000,
      ceilingRank: 15000,
      quota: 50,
      createdAt: new Date(),
    };

    it('should calculate TYT-only requirements correctly', async () => {
      const result = await calculatorService.calculateRequiredNets(baseRequest, baseScoreData);

      expect(result.requiredNets.TYT).toBeDefined();
      expect(result.requiredNets.AYT).toBeUndefined();
      expect(result.requiredNets.TYT.min).toBeGreaterThanOrEqual(0);
      expect(result.requiredNets.TYT.max).toBeGreaterThan(result.requiredNets.TYT.min);
    });

    it('should calculate SAY requirements with both TYT and AYT', async () => {
      const sayRequest = { ...baseRequest, scoreType: 'SAY' as const };
      const sayScoreData = { ...baseScoreData, scoreType: 'SAY' as const };

      const result = await calculatorService.calculateRequiredNets(sayRequest, sayScoreData);

      expect(result.requiredNets.TYT).toBeDefined();
      expect(result.requiredNets.AYT).toBeDefined();
      expect(result.requiredNets.TYT.min).toBeGreaterThanOrEqual(0);
      expect(result.requiredNets.AYT!.min).toBeGreaterThanOrEqual(0);
    });

    it('should calculate EA requirements with balanced TYT/AYT', async () => {
      const eaRequest = { ...baseRequest, scoreType: 'EA' as const };
      const eaScoreData = { ...baseScoreData, scoreType: 'EA' as const };

      const result = await calculatorService.calculateRequiredNets(eaRequest, eaScoreData);

      expect(result.requiredNets.TYT).toBeDefined();
      expect(result.requiredNets.AYT).toBeDefined();
    });

    it('should calculate SOZ requirements correctly', async () => {
      const sozRequest = { ...baseRequest, scoreType: 'SOZ' as const };
      const sozScoreData = { ...baseScoreData, scoreType: 'SOZ' as const };

      const result = await calculatorService.calculateRequiredNets(sozRequest, sozScoreData);

      expect(result.requiredNets.TYT).toBeDefined();
      expect(result.requiredNets.AYT).toBeDefined();
    });

    it('should calculate DIL requirements with heavy language weighting', async () => {
      const dilRequest = { ...baseRequest, scoreType: 'DIL' as const };
      const dilScoreData = { ...baseScoreData, scoreType: 'DIL' as const };

      const result = await calculatorService.calculateRequiredNets(dilRequest, dilScoreData);

      expect(result.requiredNets.TYT).toBeDefined();
      expect(result.requiredNets.AYT).toBeDefined();
    });

    it('should throw error for unsupported score type', async () => {
      const invalidRequest = { ...baseRequest, scoreType: 'INVALID' as any };

      await expect(
        calculatorService.calculateRequiredNets(invalidRequest, baseScoreData)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getStudyRecommendations', () => {
    it('should provide high priority recommendations for high net requirements', () => {
      const highNetCalculation = {
        targetScore: 450,
        safetyMargin: 0.05,
        requiredNets: {
          TYT: { min: 35, max: 40 },
          AYT: { min: 30, max: 35 },
        },
        basedOnYear: 2024,
        confidence: 'high' as const,
      };

      const recommendations = calculatorService.getStudyRecommendations(highNetCalculation);

      expect(recommendations.priority).toBe('high');
      expect(recommendations.subjects).toContain('Türkçe');
      expect(recommendations.subjects).toContain('Matematik');
      expect(recommendations.tips).toContain('Yoğun çalışma programı gerekli');
    });

    it('should provide medium priority recommendations for moderate net requirements', () => {
      const mediumNetCalculation = {
        targetScore: 350,
        safetyMargin: 0.05,
        requiredNets: {
          TYT: { min: 22, max: 28 },
          AYT: { min: 18, max: 22 },
        },
        basedOnYear: 2024,
        confidence: 'medium' as const,
      };

      const recommendations = calculatorService.getStudyRecommendations(mediumNetCalculation);

      expect(recommendations.priority).toBe('medium');
      expect(recommendations.tips).toContain('Düzenli çalışma programı yeterli');
    });

    it('should provide low priority recommendations for low net requirements', () => {
      const lowNetCalculation = {
        targetScore: 250,
        safetyMargin: 0.05,
        requiredNets: {
          TYT: { min: 15, max: 20 },
        },
        basedOnYear: 2024,
        confidence: 'high' as const,
      };

      const recommendations = calculatorService.getStudyRecommendations(lowNetCalculation);

      expect(recommendations.priority).toBe('low');
      expect(recommendations.tips).toContain('Mevcut seviyenizi koruyun');
    });

    it('should include AYT focus for calculations with AYT requirements', () => {
      const aytCalculation = {
        targetScore: 400,
        safetyMargin: 0.05,
        requiredNets: {
          TYT: { min: 25, max: 30 },
          AYT: { min: 20, max: 25 },
        },
        basedOnYear: 2024,
        confidence: 'high' as const,
      };

      const recommendations = calculatorService.getStudyRecommendations(aytCalculation);

      expect(recommendations.subjects).toContain('AYT konularına odaklanın');
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle very high base scores', async () => {
      const highScoreData: ScoreData = {
        id: 1,
        departmentId: 101,
        year: 2024,
        scoreType: 'SAY',
        baseScore: 580,
        ceilingScore: 590,
        baseRank: 100,
        ceilingRank: 50,
        quota: 10,
        createdAt: new Date(),
      };

      const request: CalculationRequest = {
        university: 'Test University',
        department: 'Test Department',
        scoreType: 'SAY',
      };

      const result = await calculatorService.calculateRequiredNets(request, highScoreData);
      expect(result.targetScore).toBeLessThanOrEqual(600);
    });

    it('should handle minimum valid base scores', async () => {
      const lowScoreData: ScoreData = {
        id: 1,
        departmentId: 101,
        year: 2024,
        scoreType: 'TYT',
        baseScore: 150,
        ceilingScore: 160,
        baseRank: 50000,
        ceilingRank: 45000,
        quota: 200,
        createdAt: new Date(),
      };

      const request: CalculationRequest = {
        university: 'Test University',
        department: 'Test Department',
        scoreType: 'TYT',
      };

      const result = await calculatorService.calculateRequiredNets(request, lowScoreData);
      expect(result.requiredNets.TYT.min).toBeGreaterThanOrEqual(0);
    });

    it('should round target scores to 2 decimal places', async () => {
      const scoreData: ScoreData = {
        id: 1,
        departmentId: 101,
        year: 2024,
        scoreType: 'EA',
        baseScore: 333.33,
        ceilingScore: 340,
        baseRank: 12000,
        ceilingRank: 10000,
        quota: 75,
        createdAt: new Date(),
      };

      const request: CalculationRequest = {
        university: 'Test University',
        department: 'Test Department',
        scoreType: 'EA',
      };

      const result = await calculatorService.calculateRequiredNets(request, scoreData);
      
      // Check that target score is properly rounded
      expect(result.targetScore.toString()).toMatch(/^\d+\.\d{1,2}$/);
    });
  });
});