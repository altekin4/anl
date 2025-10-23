import { University } from '@/models';
import { CacheService } from '@/services/CacheService';
import { MatchResult } from '@/services/FuzzyMatcher';
export declare class UniversityRepository {
    private cacheService;
    constructor(cacheService: CacheService);
    /**
     * Get all universities
     */
    getAll(): Promise<University[]>;
    /**
     * Get university by ID
     */
    getById(id: number): Promise<University | null>;
    /**
     * Search universities by query
     */
    search(query: string, limit?: number): Promise<MatchResult<University>[]>;
    /**
     * Find university by name (exact or fuzzy match)
     */
    findByName(name: string): Promise<University | null>;
    /**
     * Create new university
     */
    create(universityData: Partial<University>): Promise<University>;
    /**
     * Update university
     */
    update(id: number, updates: Partial<University>): Promise<University>;
    /**
     * Delete university
     */
    delete(id: number): Promise<void>;
    /**
     * Bulk create universities
     */
    bulkCreate(universities: Partial<University>[]): Promise<University[]>;
    /**
     * Get universities by type
     */
    getByType(type: 'Devlet' | 'Vakıf'): Promise<University[]>;
    /**
     * Get universities by city
     */
    getByCity(city: string): Promise<University[]>;
    /**
     * Get university statistics
     */
    getStatistics(): Promise<{
        total: number;
        byType: {
            Devlet: number;
            Vakıf: number;
        };
        byCityTop10: {
            city: string;
            count: number;
        }[];
    }>;
    /**
     * Invalidate cache for university data
     */
    private invalidateCache;
}
//# sourceMappingURL=UniversityRepository.d.ts.map