import { AppError } from '@/middleware/errorHandler';
export declare class DataError extends AppError {
    constructor(message: string, code: string, statusCode?: number, details?: any);
}
export declare const handleDataErrors: {
    universityNotFound: (searchTerm: string, suggestions?: string[]) => DataError;
    departmentNotFound: (searchTerm: string, universityName?: string, suggestions?: string[]) => DataError;
    scoreDataNotFound: (universityName: string, departmentName: string, year?: number) => DataError;
    invalidScoreRange: (minScore?: number, maxScore?: number) => DataError;
    databaseConnectionError: (error: Error) => DataError;
    cacheConnectionError: (error: Error) => DataError;
    dataImportError: (source: string, error: Error) => DataError;
    yokAtlasError: (error: Error) => DataError;
    fuzzyMatchingError: (searchTerm: string, error: Error) => DataError;
    insufficientData: (dataType: string, requiredFields: string[]) => DataError;
};
export declare const generateDataSuggestions: {
    universityNotFound: (searchTerm: string) => string[];
    departmentNotFound: (searchTerm: string, universityName?: string) => string[];
    scoreDataNotFound: (universityName: string, departmentName: string, year?: number) => string[];
};
export declare const generateDataFallback: (error: DataError) => any;
export default handleDataErrors;
//# sourceMappingURL=dataErrorHandler.d.ts.map