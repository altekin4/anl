import { ScoreData } from '@/models';
import { CacheService } from '@/services/CacheService';
export declare class ScoreDataRepository {
    private cacheService;
    constructor(cacheService: CacheService);
    /**
     * Get score data by department ID and year
     */
    getByDepartmentAndYear(departmentId: number, year?: number): Promise<ScoreData[]>;
    /**
     * Get score data by ID
     */
    getById(id: number): Promise<ScoreData | null>;
    /**
     * Get latest score data for a department
     */
    getLatestByDepartment(departmentId: number): Promise<ScoreData[]>;
    /**
     * Get score data by score type and year
     */
    getByScoreTypeAndYear(scoreType: string, year: number, limit?: number): Promise<ScoreData[]>;
    /**
     * Get departments by score range
     */
    getDepartmentsByScoreRange(scoreType: string, minScore: number, maxScore: number, year?: number, limit?: number): Promise<ScoreData[]>;
    /**
     * Create new score data
     */
    create(scoreDataInput: Partial<ScoreData>): Promise<ScoreData>;
    /**
     * Update score data
     */
    update(id: number, updates: Partial<ScoreData>): Promise<ScoreData>;
    /**
     * Delete score data
     */
    delete(id: number): Promise<void>;
    /**
     * Bulk create score data
     */
    bulkCreate(scoreDataList: Partial<ScoreData>[]): Promise<ScoreData[]>;
    /**
     * Get available years for score data
     */
    getAvailableYears(): Promise<number[]>;
    /**
     * Get score data statistics
     */
    getStatistics(year?: number): Promise<{
        totalRecords: number;
        byScoreType: {
            scoreType: string;
            count: number;
            avgBaseScore: number;
        }[];
        byYear: {
            year: number;
            count: number;
        }[];
        scoreRanges: {
            scoreType: string;
            minScore: number;
            maxScore: number;
            avgScore: number;
        }[];
    }>;
    /**
     * Delete score data by year
     */
    deleteByYear(year: number): Promise<number>;
    /**
     * Invalidate cache for score data
     */
    private invalidateCache;
}
//# sourceMappingURL=ScoreDataRepository.d.ts.map