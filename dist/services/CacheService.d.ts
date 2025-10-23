export declare class CacheService {
    private client;
    private isConnected;
    constructor();
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    /**
     * Get value from cache
     */
    get<T>(key: string): Promise<T | null>;
    /**
     * Set value in cache with TTL
     */
    set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
    /**
     * Delete value from cache
     */
    delete(key: string): Promise<void>;
    /**
     * Delete multiple keys matching a pattern
     */
    deletePattern(pattern: string): Promise<void>;
    /**
     * Check if key exists in cache
     */
    exists(key: string): Promise<boolean>;
    /**
     * Get TTL for a key
     */
    getTTL(key: string): Promise<number>;
    /**
     * Increment a counter
     */
    increment(key: string, ttlSeconds?: number): Promise<number>;
    /**
     * Get or set pattern - if key doesn't exist, call factory function and cache result
     */
    getOrSet<T>(key: string, factory: () => Promise<T>, ttlSeconds?: number): Promise<T>;
    /**
     * Cache key generators for consistent naming
     */
    static keys: {
        university: (id: number) => string;
        universities: () => string;
        universitySearch: (query: string) => string;
        department: (id: number) => string;
        departments: (universityId?: number) => string;
        departmentSearch: (query: string, universityId?: number) => string;
        scoreData: (departmentId: number, year?: number) => string;
        netCalculation: (university: string, department: string, language: string, scoreType: string) => string;
        userSession: (userId: string) => string;
        userRateLimit: (userId: string) => string;
    };
    /**
     * Cache TTL constants (in seconds)
     */
    static TTL: {
        SHORT: number;
        MEDIUM: number;
        LONG: number;
        VERY_LONG: number;
        PERMANENT: number;
    };
    /**
     * Cache invalidation strategies
     */
    invalidateUniversityCache(universityId?: number): Promise<void>;
    invalidateDepartmentCache(departmentId?: number, universityId?: number): Promise<void>;
    invalidateScoreCache(departmentId?: number, year?: number): Promise<void>;
    /**
     * Get cache performance statistics
     */
    getCacheStats(): Promise<any>;
    /**
     * Warm up cache with frequently accessed data
     */
    warmUpCache(): Promise<void>;
    /**
     * Clear all cache data (use with caution)
     */
    clearAll(): Promise<void>;
}
//# sourceMappingURL=CacheService.d.ts.map