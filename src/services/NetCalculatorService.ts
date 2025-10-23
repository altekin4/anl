import { NetCalculation, CalculationRequest, ScoreData } from '@/types';
import { ValidationError } from '@/utils/errors';

export class NetCalculatorService {
  private readonly DEFAULT_SAFETY_MARGIN = 0.05; // 5%
  private readonly CURRENT_YEAR = new Date().getFullYear();

  /**
   * Calculate required net scores based on target department and score data
   */
  public async calculateRequiredNets(
    request: CalculationRequest,
    scoreData: ScoreData
  ): Promise<NetCalculation> {
    this.validateCalculationRequest(request);
    this.validateScoreData(scoreData);

    const targetScore = this.calculateTargetScore(scoreData.baseScore);
    const confidence = this.determineConfidence(scoreData);
    const requiredNets = this.calculateNetBreakdown(targetScore, scoreData.scoreType);

    return {
      targetScore,
      safetyMargin: this.DEFAULT_SAFETY_MARGIN,
      requiredNets,
      basedOnYear: scoreData.year,
      confidence,
    };
  }

  /**
   * Calculate target score with safety margin
   */
  private calculateTargetScore(baseScore: number): number {
    const targetScore = baseScore * (1 + this.DEFAULT_SAFETY_MARGIN);
    return Math.round(targetScore * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Determine confidence level based on score data characteristics
   */
  private determineConfidence(scoreData: ScoreData): 'high' | 'medium' | 'low' {
    const yearDifference = this.CURRENT_YEAR - scoreData.year;
    const scoreRange = scoreData.ceilingScore - scoreData.baseScore;
    
    // High confidence: Recent data (0-1 years) with stable scores (small range)
    if (yearDifference <= 1 && scoreRange <= 20) {
      return 'high';
    }
    
    // Medium confidence: Moderately recent data (2-3 years) or moderate score range
    if (yearDifference <= 3 && scoreRange <= 50) {
      return 'medium';
    }
    
    // Low confidence: Old data (4+ years) or highly volatile scores
    return 'low';
  }

  /**
   * Calculate net score breakdown by exam type
   */
  private calculateNetBreakdown(
    targetScore: number,
    scoreType: 'TYT' | 'SAY' | 'EA' | 'SOZ' | 'DIL'
  ): { TYT: { min: number; max: number }; AYT?: { min: number; max: number } } {
    const netValues = this.getNetValues(scoreType);
    
    switch (scoreType) {
      case 'TYT':
        return this.calculateTYTNets(targetScore, netValues);
      
      case 'SAY':
        return this.calculateSAYNets(targetScore, netValues);
      
      case 'EA':
        return this.calculateEANets(targetScore, netValues);
      
      case 'SOZ':
        return this.calculateSOZNets(targetScore, netValues);
      
      case 'DIL':
        return this.calculateDILNets(targetScore, netValues);
      
      default:
        throw new ValidationError(`Unsupported score type: ${scoreType}`);
    }
  }

  /**
   * Get net values (coefficients) for different score types
   */
  private getNetValues(scoreType: string): Record<string, number> {
    const netValues: Record<string, Record<string, number>> = {
      TYT: {
        turkce: 3.33,
        matematik: 3.33,
        fen: 3.33,
        sosyal: 3.33,
      },
      SAY: {
        turkce: 3.33,
        matematik: 3.33,
        fen: 3.33,
        sosyal: 3.33,
        matematik_ayt: 3.33,
        fizik: 3.33,
        kimya: 3.33,
        biyoloji: 3.33,
      },
      EA: {
        turkce: 3.33,
        matematik: 3.33,
        fen: 3.33,
        sosyal: 3.33,
        matematik_ayt: 3.33,
        cografya: 3.33,
        tarih: 3.33,
      },
      SOZ: {
        turkce: 3.33,
        matematik: 3.33,
        fen: 3.33,
        sosyal: 3.33,
        edebiyat: 3.33,
        tarih: 3.33,
        cografya: 3.33,
      },
      DIL: {
        turkce: 3.33,
        matematik: 3.33,
        fen: 3.33,
        sosyal: 3.33,
        dil: 5.0,
      },
    };

    return netValues[scoreType] || netValues.TYT;
  }

  /**
   * Calculate TYT-only net requirements
   */
  private calculateTYTNets(
    targetScore: number,
    netValues: Record<string, number>
  ): { TYT: { min: number; max: number } } {
    // For TYT-only programs, all score comes from TYT
    const totalTYTCoeff = Object.values(netValues).reduce((sum, coeff) => sum + coeff, 0);
    const requiredTYTNet = targetScore / totalTYTCoeff;
    
    return {
      TYT: {
        min: Math.max(0, Math.round((requiredTYTNet - 5) * 100) / 100),
        max: Math.round((requiredTYTNet + 5) * 100) / 100,
      },
    };
  }

  /**
   * Calculate SAY (Science) net requirements
   */
  private calculateSAYNets(
    targetScore: number,
    netValues: Record<string, number>
  ): { TYT: { min: number; max: number }; AYT: { min: number; max: number } } {
    // SAY programs typically weight AYT more heavily
    const aytWeight = 0.6;
    const tytWeight = 0.4;
    
    const targetAYTScore = targetScore * aytWeight;
    const targetTYTScore = targetScore * tytWeight;
    
    const aytCoeff = netValues.matematik_ayt + netValues.fizik + netValues.kimya + netValues.biyoloji;
    const tytCoeff = netValues.turkce + netValues.matematik + netValues.fen + netValues.sosyal;
    
    const requiredAYTNet = targetAYTScore / aytCoeff;
    const requiredTYTNet = targetTYTScore / tytCoeff;
    
    return {
      TYT: {
        min: Math.max(0, Math.round((requiredTYTNet - 3) * 100) / 100),
        max: Math.round((requiredTYTNet + 3) * 100) / 100,
      },
      AYT: {
        min: Math.max(0, Math.round((requiredAYTNet - 3) * 100) / 100),
        max: Math.round((requiredAYTNet + 3) * 100) / 100,
      },
    };
  }

  /**
   * Calculate EA (Equal Weight) net requirements
   */
  private calculateEANets(
    targetScore: number,
    netValues: Record<string, number>
  ): { TYT: { min: number; max: number }; AYT: { min: number; max: number } } {
    // EA programs have balanced TYT/AYT weighting
    const aytWeight = 0.5;
    const tytWeight = 0.5;
    
    const targetAYTScore = targetScore * aytWeight;
    const targetTYTScore = targetScore * tytWeight;
    
    const aytCoeff = netValues.matematik_ayt + netValues.cografya + netValues.tarih;
    const tytCoeff = netValues.turkce + netValues.matematik + netValues.fen + netValues.sosyal;
    
    const requiredAYTNet = targetAYTScore / aytCoeff;
    const requiredTYTNet = targetTYTScore / tytCoeff;
    
    return {
      TYT: {
        min: Math.max(0, Math.round((requiredTYTNet - 3) * 100) / 100),
        max: Math.round((requiredTYTNet + 3) * 100) / 100,
      },
      AYT: {
        min: Math.max(0, Math.round((requiredAYTNet - 3) * 100) / 100),
        max: Math.round((requiredAYTNet + 3) * 100) / 100,
      },
    };
  }

  /**
   * Calculate SOZ (Social Sciences) net requirements
   */
  private calculateSOZNets(
    targetScore: number,
    netValues: Record<string, number>
  ): { TYT: { min: number; max: number }; AYT: { min: number; max: number } } {
    // SOZ programs weight AYT social sciences
    const aytWeight = 0.55;
    const tytWeight = 0.45;
    
    const targetAYTScore = targetScore * aytWeight;
    const targetTYTScore = targetScore * tytWeight;
    
    const aytCoeff = netValues.edebiyat + netValues.tarih + netValues.cografya;
    const tytCoeff = netValues.turkce + netValues.matematik + netValues.fen + netValues.sosyal;
    
    const requiredAYTNet = targetAYTScore / aytCoeff;
    const requiredTYTNet = targetTYTScore / tytCoeff;
    
    return {
      TYT: {
        min: Math.max(0, Math.round((requiredTYTNet - 3) * 100) / 100),
        max: Math.round((requiredTYTNet + 3) * 100) / 100,
      },
      AYT: {
        min: Math.max(0, Math.round((requiredAYTNet - 3) * 100) / 100),
        max: Math.round((requiredAYTNet + 3) * 100) / 100,
      },
    };
  }

  /**
   * Calculate DIL (Language) net requirements
   */
  private calculateDILNets(
    targetScore: number,
    netValues: Record<string, number>
  ): { TYT: { min: number; max: number }; AYT: { min: number; max: number } } {
    // DIL programs heavily weight language section
    const aytWeight = 0.7;
    const tytWeight = 0.3;
    
    const targetAYTScore = targetScore * aytWeight;
    const targetTYTScore = targetScore * tytWeight;
    
    const aytCoeff = netValues.dil;
    const tytCoeff = netValues.turkce + netValues.matematik + netValues.fen + netValues.sosyal;
    
    const requiredAYTNet = targetAYTScore / aytCoeff;
    const requiredTYTNet = targetTYTScore / tytCoeff;
    
    return {
      TYT: {
        min: Math.max(0, Math.round((requiredTYTNet - 2) * 100) / 100),
        max: Math.round((requiredTYTNet + 2) * 100) / 100,
      },
      AYT: {
        min: Math.max(0, Math.round((requiredAYTNet - 2) * 100) / 100),
        max: Math.round((requiredAYTNet + 2) * 100) / 100,
      },
    };
  }

  /**
   * Validate calculation request
   */
  private validateCalculationRequest(request: CalculationRequest): void {
    if (!request.university || request.university.trim().length === 0) {
      throw new ValidationError('University name is required');
    }

    if (!request.department || request.department.trim().length === 0) {
      throw new ValidationError('Department name is required');
    }

    if (!request.scoreType || !['TYT', 'SAY', 'EA', 'SOZ', 'DIL'].includes(request.scoreType)) {
      throw new ValidationError('Valid score type is required (TYT, SAY, EA, SOZ, DIL)');
    }
  }

  /**
   * Validate score data
   */
  private validateScoreData(scoreData: ScoreData): void {
    if (!scoreData) {
      throw new ValidationError('Score data is required');
    }

    if (scoreData.baseScore <= 0) {
      throw new ValidationError('Base score must be greater than 0');
    }

    if (scoreData.baseScore > 600) {
      throw new ValidationError('Base score cannot exceed 600');
    }
  }

  /**
   * Calculate multiple scenarios with different safety margins
   */
  public async calculateMultipleScenarios(
    request: CalculationRequest,
    scoreData: ScoreData,
    safetyMargins: number[] = [0.03, 0.05, 0.08]
  ): Promise<NetCalculation[]> {
    const scenarios: NetCalculation[] = [];

    for (const margin of safetyMargins) {
      const targetScore = scoreData.baseScore * (1 + margin);
      const requiredNets = this.calculateNetBreakdown(targetScore, scoreData.scoreType);
      const confidence = this.determineConfidence(scoreData);

      scenarios.push({
        targetScore: Math.round(targetScore * 100) / 100,
        safetyMargin: margin,
        requiredNets,
        basedOnYear: scoreData.year,
        confidence,
      });
    }

    return scenarios;
  }

  /**
   * Get recommended study plan based on net calculations
   */
  public getStudyRecommendations(calculation: NetCalculation): {
    priority: 'high' | 'medium' | 'low';
    subjects: string[];
    tips: string[];
  } {
    const recommendations = {
      priority: 'medium' as 'high' | 'medium' | 'low',
      subjects: [] as string[],
      tips: [] as string[],
    };

    // Determine priority based on required nets
    const tytAvg = (calculation.requiredNets.TYT.min + calculation.requiredNets.TYT.max) / 2;
    const aytAvg = calculation.requiredNets.AYT 
      ? (calculation.requiredNets.AYT.min + calculation.requiredNets.AYT.max) / 2 
      : 0;

    if (tytAvg > 30 || aytAvg > 25) {
      recommendations.priority = 'high';
      recommendations.tips.push('Yoğun çalışma programı gerekli');
      recommendations.tips.push('Günlük en az 6-8 saat çalışma öneriliyor');
    } else if (tytAvg > 20 || aytAvg > 15) {
      recommendations.priority = 'medium';
      recommendations.tips.push('Düzenli çalışma programı yeterli');
      recommendations.tips.push('Günlük 4-6 saat çalışma öneriliyor');
    } else {
      recommendations.priority = 'low';
      recommendations.tips.push('Mevcut seviyenizi koruyun');
      recommendations.tips.push('Günlük 2-4 saat çalışma yeterli');
    }

    // Add subject recommendations
    recommendations.subjects.push('Türkçe', 'Matematik');
    
    if (calculation.requiredNets.AYT) {
      recommendations.subjects.push('AYT konularına odaklanın');
    }

    return recommendations;
  }
}