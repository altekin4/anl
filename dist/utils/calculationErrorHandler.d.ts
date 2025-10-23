import { AppError } from '@/middleware/errorHandler';
export declare class CalculationError extends AppError {
    constructor(message: string, code: string, statusCode?: number, details?: any);
}
export declare const handleCalculationErrors: {
    invalidScoreInput: (score: number, field: string) => CalculationError;
    invalidNetInput: (net: number, examType: string) => CalculationError;
    missingRequiredData: (missingFields: string[]) => CalculationError;
    calculationOverflow: (operation: string, values: any) => CalculationError;
    noValidCombination: (targetScore: number, examType: string) => CalculationError;
    unrealisticTarget: (targetScore: number, maxPossible: number) => CalculationError;
    insufficientHistoricalData: (year: number, examType: string) => CalculationError;
    formulaError: (formula: string, error: Error) => CalculationError;
    confidenceTooLow: (confidence: number, threshold?: number) => CalculationError;
};
export declare const generateCalculationSuggestions: {
    invalidScoreInput: (score: number, field: string) => string[];
    invalidNetInput: (net: number, examType: string) => string[];
    noValidCombination: (targetScore: number, examType: string) => string[];
    unrealisticTarget: (targetScore: number, maxPossible: number) => string[];
};
export declare const generateCalculationFallback: (error: CalculationError) => any;
export declare const validateCalculationInput: {
    score: (score: number, examType: string) => void;
    net: (net: number, examType: string) => void;
    examType: (examType: string) => void;
};
export default handleCalculationErrors;
//# sourceMappingURL=calculationErrorHandler.d.ts.map