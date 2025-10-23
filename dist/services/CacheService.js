"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheService = void 0;
const redis_1 = require("redis");
const config_1 = __importDefault(require("@/config"));
const logger_1 = __importDefault(require("@/utils/logger"));
class CacheService {
    constructor() {
        this.isConnected = false;
        this.client = (0, redis_1.createClient)({
            socket: {
                host: config_1.default.redis.host,
                port: config_1.default.redis.port,
            },
            password: config_1.default.redis.password,
        });
        this.client.on('error', (err) => {
            logger_1.default.error('Redis Client Error:', err);
            this.isConnected = false;
        });
        this.client.on('connect', () => {
            logger_1.default.info('Redis Client Connected');
            this.isConnected = true;
        });
        this.client.on('disconnect', () => {
            logger_1.default.warn('Redis Client Disconnected');
            this.isConnected = false;
        });
    }
    async connect() {
        if (!this.isConnected) {
            try {
                await this.client.connect();
                logger_1.default.info('Connected to Redis');
            }
            catch (error) {
                logger_1.default.warn('Failed to connect to Redis, continuing without cache:', error.message);
                // Don't throw error, continue without cache
                this.isConnected = false;
            }
        }
    }
    async disconnect() {
        if (this.isConnected) {
            await this.client.disconnect();
            logger_1.default.info('Disconnected from Redis');
        }
    }
    /**
     * Get value from cache
     */
    async get(key) {
        if (!this.isConnected) {
            logger_1.default.warn('Redis not connected, skipping cache get');
            return null;
        }
        try {
            const value = await this.client.get(key);
            if (value) {
                logger_1.default.debug(`Cache hit for key: ${key}`);
                return JSON.parse(value);
            }
            logger_1.default.debug(`Cache miss for key: ${key}`);
            return null;
        }
        catch (error) {
            logger_1.default.error(`Cache get error for key ${key}:`, error);
            return null;
        }
    }
    /**
     * Set value in cache with TTL
     */
    async set(key, value, ttlSeconds = 3600) {
        if (!this.isConnected) {
            logger_1.default.warn('Redis not connected, skipping cache set');
            return;
        }
        try {
            const serializedValue = JSON.stringify(value);
            await this.client.setEx(key, ttlSeconds, serializedValue);
            logger_1.default.debug(`Cache set for key: ${key}, TTL: ${ttlSeconds}s`);
        }
        catch (error) {
            logger_1.default.error(`Cache set error for key ${key}:`, error);
        }
    }
    /**
     * Delete value from cache
     */
    async delete(key) {
        if (!this.isConnected) {
            return;
        }
        try {
            await this.client.del(key);
            logger_1.default.debug(`Cache deleted for key: ${key}`);
        }
        catch (error) {
            logger_1.default.error(`Cache delete error for key ${key}:`, error);
        }
    }
    /**
     * Delete multiple keys matching a pattern
     */
    async deletePattern(pattern) {
        if (!this.isConnected) {
            return;
        }
        try {
            const keys = await this.client.keys(pattern);
            if (keys.length > 0) {
                await this.client.del(keys);
                logger_1.default.debug(`Cache deleted ${keys.length} keys matching pattern: ${pattern}`);
            }
        }
        catch (error) {
            logger_1.default.error(`Cache delete pattern error for pattern ${pattern}:`, error);
        }
    }
    /**
     * Check if key exists in cache
     */
    async exists(key) {
        if (!this.isConnected) {
            return false;
        }
        try {
            const result = await this.client.exists(key);
            return result === 1;
        }
        catch (error) {
            logger_1.default.error(`Cache exists error for key ${key}:`, error);
            return false;
        }
    }
    /**
     * Get TTL for a key
     */
    async getTTL(key) {
        if (!this.isConnected) {
            return -1;
        }
        try {
            return await this.client.ttl(key);
        }
        catch (error) {
            logger_1.default.error(`Cache TTL error for key ${key}:`, error);
            return -1;
        }
    }
    /**
     * Increment a counter
     */
    async increment(key, ttlSeconds) {
        if (!this.isConnected) {
            return 0;
        }
        try {
            const result = await this.client.incr(key);
            if (ttlSeconds && result === 1) {
                await this.client.expire(key, ttlSeconds);
            }
            return result;
        }
        catch (error) {
            logger_1.default.error(`Cache increment error for key ${key}:`, error);
            return 0;
        }
    }
    /**
     * Get or set pattern - if key doesn't exist, call factory function and cache result
     */
    async getOrSet(key, factory, ttlSeconds = 3600) {
        const cached = await this.get(key);
        if (cached !== null) {
            return cached;
        }
        const value = await factory();
        await this.set(key, value, ttlSeconds);
        return value;
    }
    /**
     * Cache invalidation strategies
     */
    async invalidateUniversityCache(universityId) {
        const patterns = [
            CacheService.keys.universities(),
            'university:search:*',
        ];
        if (universityId) {
            patterns.push(CacheService.keys.university(universityId), CacheService.keys.departments(universityId), `department:search:*:uni:${universityId}`, `score:*` // Score data might be affected by university changes
            );
        }
        await Promise.all(patterns.map(pattern => this.deletePattern(pattern)));
        logger_1.default.info('University cache invalidated', { universityId, patterns });
    }
    async invalidateDepartmentCache(departmentId, universityId) {
        const patterns = [
            'departments:*',
            'department:search:*',
        ];
        if (departmentId) {
            patterns.push(CacheService.keys.department(departmentId), CacheService.keys.scoreData(departmentId), 'net:*' // Net calculations might be affected
            );
        }
        if (universityId) {
            patterns.push(CacheService.keys.departments(universityId));
        }
        await Promise.all(patterns.map(pattern => this.deletePattern(pattern)));
        logger_1.default.info('Department cache invalidated', { departmentId, universityId, patterns });
    }
    async invalidateScoreCache(departmentId, year) {
        const patterns = ['net:*']; // Net calculations depend on score data
        if (departmentId) {
            patterns.push(CacheService.keys.scoreData(departmentId, year));
        }
        else {
            patterns.push('score:*');
        }
        await Promise.all(patterns.map(pattern => this.deletePattern(pattern)));
        logger_1.default.info('Score cache invalidated', { departmentId, year, patterns });
    }
    /**
     * Get cache performance statistics
     */
    async getCacheStats() {
        if (!this.isConnected) {
            return { connected: false };
        }
        try {
            const info = await this.client.info('memory');
            const keyspace = await this.client.info('keyspace');
            const stats = await this.client.info('stats');
            // Parse Redis INFO output
            const parseInfo = (infoString) => {
                const result = {};
                infoString.split('\r\n').forEach(line => {
                    if (line.includes(':')) {
                        const [key, value] = line.split(':');
                        result[key] = isNaN(Number(value)) ? value : Number(value);
                    }
                });
                return result;
            };
            const memoryInfo = parseInfo(info);
            const keyspaceInfo = parseInfo(keyspace);
            const statsInfo = parseInfo(stats);
            return {
                connected: true,
                memory: {
                    used: memoryInfo.used_memory_human,
                    peak: memoryInfo.used_memory_peak_human,
                    rss: memoryInfo.used_memory_rss_human,
                },
                keyspace: keyspaceInfo,
                stats: {
                    totalConnectionsReceived: statsInfo.total_connections_received,
                    totalCommandsProcessed: statsInfo.total_commands_processed,
                    keyspaceHits: statsInfo.keyspace_hits,
                    keyspaceMisses: statsInfo.keyspace_misses,
                    hitRatio: statsInfo.keyspace_hits / (statsInfo.keyspace_hits + statsInfo.keyspace_misses) * 100,
                },
            };
        }
        catch (error) {
            logger_1.default.error('Failed to get cache stats', error);
            return { connected: true, error: 'Failed to retrieve stats' };
        }
    }
    /**
     * Warm up cache with frequently accessed data
     */
    async warmUpCache() {
        logger_1.default.info('Starting cache warm-up...');
        try {
            // This would typically be called with actual data service methods
            // For now, we'll just log the intention
            logger_1.default.info('Cache warm-up completed');
        }
        catch (error) {
            logger_1.default.error('Cache warm-up failed', error);
        }
    }
    /**
     * Clear all cache data (use with caution)
     */
    async clearAll() {
        if (!this.isConnected) {
            return;
        }
        try {
            await this.client.flushDb();
            logger_1.default.warn('All cache data cleared');
        }
        catch (error) {
            logger_1.default.error('Failed to clear cache', error);
        }
    }
}
exports.CacheService = CacheService;
/**
 * Cache key generators for consistent naming
 */
CacheService.keys = {
    university: (id) => `university:${id}`,
    universities: () => 'universities:all',
    universitySearch: (query) => `university:search:${query.toLowerCase()}`,
    department: (id) => `department:${id}`,
    departments: (universityId) => universityId ? `departments:university:${universityId}` : 'departments:all',
    departmentSearch: (query, universityId) => `department:search:${query.toLowerCase()}${universityId ? `:uni:${universityId}` : ''}`,
    scoreData: (departmentId, year) => `score:${departmentId}${year ? `:${year}` : ''}`,
    netCalculation: (university, department, language, scoreType) => `net:${university}:${department}:${language}:${scoreType}`.toLowerCase(),
    userSession: (userId) => `session:${userId}`,
    userRateLimit: (userId) => `rate:${userId}`,
};
/**
 * Cache TTL constants (in seconds)
 */
CacheService.TTL = {
    SHORT: 300, // 5 minutes
    MEDIUM: 1800, // 30 minutes
    LONG: 3600, // 1 hour
    VERY_LONG: 86400, // 24 hours
    PERMANENT: -1, // No expiration
};
//# sourceMappingURL=CacheService.js.map