import { CacheService } from './CacheService';
import { University, Department, ScoreData } from '@/models';
export interface ImportProgress {
    stage: 'universities' | 'departments' | 'scoreData' | 'complete';
    current: number;
    total: number;
    message: string;
    percentage: number;
}
export interface ImportResult {
    success: boolean;
    summary: {
        universities: {
            imported: number;
            failed: number;
        };
        departments: {
            imported: number;
            failed: number;
        };
        scoreData: {
            imported: number;
            failed: number;
        };
    };
    errors: string[];
    duration: number;
}
/**
 * Service that orchestrates data import from YÖK Atlas and integration with the data layer
 */
export declare class DataImportService {
    private yokAtlasImporter;
    private dataService;
    private cacheService;
    constructor(cacheService: CacheService);
    /**
     * Import all data for a specific year with progress tracking
     */
    importYearData(year: number, onProgress?: (progress: ImportProgress) => void): Promise<ImportResult>;
    /**
     * Import only universities
     */
    importUniversitiesOnly(): Promise<{
        universities: University[];
        summary: {
            imported: number;
            failed: number;
        };
        errors: string[];
    }>;
    /**
     * Import departments for a specific university
     */
    importUniversityDepartments(universityId: number): Promise<{
        departments: Department[];
        summary: {
            imported: number;
            failed: number;
        };
        errors: string[];
    }>;
    /**
     * Import score data for a specific department and year
     */
    importDepartmentScoreData(departmentId: number, year: number): Promise<{
        scoreData: ScoreData[];
        summary: {
            imported: number;
            failed: number;
        };
        errors: string[];
    }>;
    /**
     * Validate imported data integrity
     */
    validateImportedData(year: number): Promise<{
        isValid: boolean;
        issues: string[];
        statistics: {
            universities: number;
            departments: number;
            scoreData: number;
            orphanedDepartments: number;
            orphanedScoreData: number;
        };
    }>;
    /**
     * Clear import-related cache
     */
    private clearImportCache;
    /**
     * Get import status and statistics
     */
    getImportStatus(): Promise<{
        lastImport: {
            year: number | null;
            date: Date | null;
            status: 'success' | 'failed' | 'never';
        };
        dataAvailability: {
            universities: number;
            departments: number;
            availableYears: number[];
            totalScoreRecords: number;
        };
        systemHealth: {
            status: 'healthy' | 'degraded' | 'unhealthy';
            issues: string[];
        };
    }>;
}
//# sourceMappingURL=DataImportService.d.ts.map