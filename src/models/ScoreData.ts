import { ScoreData as IScoreData } from '@/types';
import { ValidationError } from '@/utils/errors';

export class ScoreData implements IScoreData {
  public id: number;
  public departmentId: number;
  public year: number;
  public scoreType: 'TYT' | 'SAY' | 'EA' | 'SOZ' | 'DIL';
  public baseScore: number;
  public ceilingScore: number;
  public baseRank: number;
  public ceilingRank: number;
  public quota: number;
  public createdAt: Date;

  constructor(data: Partial<IScoreData>) {
    this.id = data.id || 0;
    this.departmentId = data.departmentId || 0;
    this.year = data.year || new Date().getFullYear();
    this.scoreType = data.scoreType || 'TYT';
    this.baseScore = data.baseScore || 0;
    this.ceilingScore = data.ceilingScore || 0;
    this.baseRank = data.baseRank || 0;
    this.ceilingRank = data.ceilingRank || 0;
    this.quota = data.quota || 0;
    this.createdAt = data.createdAt || new Date();

    this.validate();
  }

  private validate(): void {
    if (this.departmentId <= 0) {
      throw new ValidationError('Valid department ID is required');
    }

    if (this.year < 2000 || this.year > new Date().getFullYear() + 1) {
      throw new ValidationError('Year must be between 2000 and next year');
    }

    if (!['TYT', 'SAY', 'EA', 'SOZ', 'DIL'].includes(this.scoreType)) {
      throw new ValidationError('Score type must be one of: TYT, SAY, EA, SOZ, DIL');
    }

    if (this.baseScore < 0 || this.baseScore > 600) {
      throw new ValidationError('Base score must be between 0 and 600');
    }

    if (this.ceilingScore < 0 || this.ceilingScore > 600) {
      throw new ValidationError('Ceiling score must be between 0 and 600');
    }

    if (this.baseScore > this.ceilingScore) {
      throw new ValidationError('Base score cannot be higher than ceiling score');
    }

    if (this.baseRank < 0) {
      throw new ValidationError('Base rank cannot be negative');
    }

    if (this.ceilingRank < 0) {
      throw new ValidationError('Ceiling rank cannot be negative');
    }

    if (this.baseRank < this.ceilingRank && this.ceilingRank > 0) {
      throw new ValidationError('Base rank should be higher than ceiling rank (lower rank number means better rank)');
    }

    if (this.quota < 0) {
      throw new ValidationError('Quota cannot be negative');
    }
  }

  public getScoreRange(): { min: number; max: number } {
    return {
      min: this.baseScore,
      max: this.ceilingScore,
    };
  }

  public getRankRange(): { best: number; worst: number } {
    return {
      best: this.ceilingRank,
      worst: this.baseRank,
    };
  }

  public isCompetitive(): boolean {
    // Consider competitive if base score is above 400
    return this.baseScore > 400;
  }

  public getCompetitivityLevel(): 'low' | 'medium' | 'high' | 'very_high' {
    if (this.baseScore < 300) return 'low';
    if (this.baseScore < 400) return 'medium';
    if (this.baseScore < 500) return 'high';
    return 'very_high';
  }

  public getSafeTargetScore(safetyMargin: number = 0.05): number {
    return Math.round(this.baseScore * (1 + safetyMargin) * 100) / 100;
  }

  public isCurrentYear(): boolean {
    return this.year === new Date().getFullYear();
  }

  public toJSON(): IScoreData {
    return {
      id: this.id,
      departmentId: this.departmentId,
      year: this.year,
      scoreType: this.scoreType,
      baseScore: this.baseScore,
      ceilingScore: this.ceilingScore,
      baseRank: this.baseRank,
      ceilingRank: this.ceilingRank,
      quota: this.quota,
      createdAt: this.createdAt,
    };
  }

  public static fromDatabase(row: any): ScoreData {
    return new ScoreData({
      id: row.id,
      departmentId: row.department_id,
      year: row.year,
      scoreType: row.score_type,
      baseScore: parseFloat(row.base_score),
      ceilingScore: parseFloat(row.ceiling_score),
      baseRank: row.base_rank,
      ceilingRank: row.ceiling_rank,
      quota: row.quota,
      createdAt: new Date(row.created_at),
    });
  }
}