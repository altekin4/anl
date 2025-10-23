import { NetCalculation, CalculationRequest, ScoreData } from '@/types';
export declare class NetCalculatorService {
    private readonly DEFAULT_SAFETY_MARGIN;
    private readonly CURRENT_YEAR;
    /**
     * Calculate required net scores based on target department and score data
     */
    calculateRequiredNets(request: CalculationRequest, scoreData: ScoreData): Promise<NetCalculation>;
    /**
     * Calculate target score with safety margin
     */
    private calculateTargetScore;
    /**
     * Determine confidence level based on score data characteristics
     */
    private determineConfidence;
    /**
     * Calculate net score breakdown by exam type
     */
    private calculateNetBreakdown;
    /**
     * Get net values (coefficients) for different score types
     */
    private getNetValues;
    /**
     * Calculate TYT-only net requirements
     */
    private calculateTYTNets;
    /**
     * Calculate SAY (Science) net requirements
     */
    private calculateSAYNets;
    /**
     * Calculate EA (Equal Weight) net requirements
     */
    private calculateEANets;
    /**
     * Calculate SOZ (Social Sciences) net requirements
     */
    private calculateSOZNets;
    /**
     * Calculate DIL (Language) net requirements
     */
    private calculateDILNets;
    /**
     * Validate calculation request
     */
    private validateCalculationRequest;
    /**
     * Validate score data
     */
    private validateScoreData;
    /**
     * Calculate multiple scenarios with different safety margins
     */
    calculateMultipleScenarios(request: CalculationRequest, scoreData: ScoreData, safetyMargins?: number[]): Promise<NetCalculation[]>;
    /**
     * Get recommended study plan based on net calculations
     */
    getStudyRecommendations(calculation: NetCalculation): {
        priority: 'high' | 'medium' | 'low';
        subjects: string[];
        tips: string[];
    };
}
//# sourceMappingURL=NetCalculatorService.d.ts.map