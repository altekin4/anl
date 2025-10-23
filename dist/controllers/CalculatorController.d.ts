import { Request, Response, NextFunction } from 'express';
export declare class CalculatorController {
    private calculatorService;
    private dataService;
    constructor();
    /**
     * Calculate required net scores for a department
     */
    calculateNets(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Calculate multiple scenarios with different safety margins
     */
    calculateScenarios(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Get study recommendations based on calculation
     */
    getRecommendations(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Get net values for a specific score type
     */
    getNetValues(req: Request, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=CalculatorController.d.ts.map