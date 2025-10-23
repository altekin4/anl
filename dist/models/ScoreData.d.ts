import { ScoreData as IScoreData } from '@/types';
export declare class ScoreData implements IScoreData {
    id: number;
    departmentId: number;
    year: number;
    scoreType: 'TYT' | 'SAY' | 'EA' | 'SOZ' | 'DIL';
    baseScore: number;
    ceilingScore: number;
    baseRank: number;
    ceilingRank: number;
    quota: number;
    createdAt: Date;
    constructor(data: Partial<IScoreData>);
    private validate;
    getScoreRange(): {
        min: number;
        max: number;
    };
    getRankRange(): {
        best: number;
        worst: number;
    };
    isCompetitive(): boolean;
    getCompetitivityLevel(): 'low' | 'medium' | 'high' | 'very_high';
    getSafeTargetScore(safetyMargin?: number): number;
    isCurrentYear(): boolean;
    toJSON(): IScoreData;
    static fromDatabase(row: any): ScoreData;
}
//# sourceMappingURL=ScoreData.d.ts.map