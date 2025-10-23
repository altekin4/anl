import { Department } from '@/models';
import { CacheService } from '@/services/CacheService';
import { MatchResult } from '@/services/FuzzyMatcher';
export declare class DepartmentRepository {
    private cacheService;
    constructor(cacheService: CacheService);
    /**
     * Get all departments
     */
    getAll(): Promise<Department[]>;
    /**
     * Get departments by university ID
     */
    getByUniversityId(universityId: number): Promise<Department[]>;
    /**
     * Get department by ID
     */
    getById(id: number): Promise<Department | null>;
    /**
     * Search departments by query
     */
    search(query: string, universityId?: number, limit?: number): Promise<MatchResult<Department>[]>;
    /**
     * Find department by name and university
     */
    findByNameAndUniversity(name: string, universityId: number): Promise<Department | null>;
    /**
     * Get departments with score data
     */
    getWithScoreData(year?: number): Promise<Array<Department & {
        hasScoreData: boolean;
    }>>;
    /**
     * Create new department
     */
    create(departmentData: Partial<Department>): Promise<Department>;
    /**
     * Update department
     */
    update(id: number, updates: Partial<Department>): Promise<Department>;
    /**
     * Delete department
     */
    delete(id: number): Promise<void>;
    /**
     * Bulk create departments
     */
    bulkCreate(departments: Partial<Department>[]): Promise<Department[]>;
    /**
     * Get departments by language
     */
    getByLanguage(language: string): Promise<Department[]>;
    /**
     * Get departments by faculty
     */
    getByFaculty(faculty: string): Promise<Department[]>;
    /**
     * Get department statistics
     */
    getStatistics(): Promise<{
        total: number;
        byLanguage: {
            language: string;
            count: number;
        }[];
        byFacultyTop10: {
            faculty: string;
            count: number;
        }[];
        byUniversityTop10: {
            universityId: number;
            count: number;
        }[];
    }>;
    /**
     * Invalidate cache for department data
     */
    private invalidateCache;
}
//# sourceMappingURL=DepartmentRepository.d.ts.map