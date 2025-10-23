import { University, Department, ScoreData } from '@/models';
export declare class YokAtlasImporter {
    private readonly baseUrl;
    private readonly timeout;
    private readonly retryAttempts;
    private readonly retryDelay;
    private readonly fuzzyMatcher;
    private readonly validationRules;
    constructor();
    /**
     * Import all universities from YÖK Atlas
     */
    importUniversities(): Promise<University[]>;
    /**
     * Import departments for a specific university
     */
    importDepartments(universityId: number): Promise<Department[]>;
    /**
     * Import score data for a specific department and year
     */
    importScoreData(departmentId: number, year: number): Promise<ScoreData[]>;
    /**
     * Import all data (universities, departments, and score data) for a specific year
     */
    importAllData(year: number): Promise<{
        universities: University[];
        departments: Department[];
        scoreData: ScoreData[];
    }>;
    /**
     * Fetch universities from YÖK Atlas
     */
    private fetchUniversities;
    /**
     * Fetch departments for a university
     */
    private fetchDepartments;
    /**
     * Fetch score data for a department
     */
    private fetchScoreData;
    /**
     * Make HTTP request with retry logic
     */
    private makeRequest;
    /**
     * Generate common aliases for university names
     */
    private generateUniversityAliases;
    /**
     * Generate common aliases for department names
     */
    private generateDepartmentAliases;
    /**
     * Create sample universities for development
     */
    private createSampleUniversities;
    /**
     * Create sample departments for development
     */
    private createSampleDepartments;
    /**
     * Create sample score data for development
     */
    private createSampleScoreData;
    /**
     * Validate and transform imported data
     */
    private validateAndTransformUniversity;
    private validateAndTransformDepartment;
    private validateAndTransformScoreData;
    /**
     * Normalize text by removing extra spaces and fixing Turkish characters
     */
    private normalizeText;
    /**
     * Normalize language field
     */
    private normalizeLanguage;
    /**
     * Enhanced fuzzy matching for university names
     */
    findBestUniversityMatch(searchName: string, existingUniversities: University[]): Promise<{
        university: University;
        confidence: number;
    } | null>;
    /**
     * Enhanced fuzzy matching for department names
     */
    findBestDepartmentMatch(searchName: string, universityId: number, existingDepartments: Department[]): Promise<{
        department: Department;
        confidence: number;
    } | null>;
    /**
     * Batch import with progress tracking
     */
    importAllDataWithProgress(year: number, onProgress?: (progress: {
        stage: string;
        current: number;
        total: number;
        message: string;
    }) => void): Promise<{
        universities: University[];
        departments: Department[];
        scoreData: ScoreData[];
        summary: {
            processed: number;
            successful: number;
            failed: number;
            errors: string[];
        };
    }>;
    /**
     * Utility method to add delay
     */
    private delay;
}
//# sourceMappingURL=YokAtlasImporter.d.ts.map