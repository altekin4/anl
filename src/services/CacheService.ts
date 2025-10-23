import { createClient, RedisClientType } from 'redis';
import config from '@/config';
import logger from '@/utils/logger';

export class CacheService {
  private client: RedisClientType;
  private isConnected: boolean = false;

  constructor() {
    this.client = createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port,
      },
      password: config.redis.password,
    });

    this.client.on('error', (err) => {
      logger.error('Redis Client Error:', err);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      logger.info('Redis Client Connected');
      this.isConnected = true;
    });

    this.client.on('disconnect', () => {
      logger.warn('Redis Client Disconnected');
      this.isConnected = false;
    });
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      try {
        await this.client.connect();
        logger.info('Connected to Redis');
      } catch (error) {
        logger.warn('Failed to connect to Redis, continuing without cache:', (error as Error).message);
        // Don't throw error, continue without cache
        this.isConnected = false;
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.disconnect();
      logger.info('Disconnected from Redis');
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected) {
      logger.warn('Redis not connected, skipping cache get');
      return null;
    }

    try {
      const value = await this.client.get(key);
      if (value) {
        logger.debug(`Cache hit for key: ${key}`);
        return JSON.parse(value);
      }
      logger.debug(`Cache miss for key: ${key}`);
      return null;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set<T>(key: string, value: T, ttlSeconds: number = 3600): Promise<void> {
    if (!this.isConnected) {
      logger.warn('Redis not connected, skipping cache set');
      return;
    }

    try {
      const serializedValue = JSON.stringify(value);
      await this.client.setEx(key, ttlSeconds, serializedValue);
      logger.debug(`Cache set for key: ${key}, TTL: ${ttlSeconds}s`);
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.client.del(key);
      logger.debug(`Cache deleted for key: ${key}`);
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
        logger.debug(`Cache deleted ${keys.length} keys matching pattern: ${pattern}`);
      }
    } catch (error) {
      logger.error(`Cache delete pattern error for pattern ${pattern}:`, error);
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get TTL for a key
   */
  async getTTL(key: string): Promise<number> {
    if (!this.isConnected) {
      return -1;
    }

    try {
      return await this.client.ttl(key);
    } catch (error) {
      logger.error(`Cache TTL error for key ${key}:`, error);
      return -1;
    }
  }

  /**
   * Increment a counter
   */
  async increment(key: string, ttlSeconds?: number): Promise<number> {
    if (!this.isConnected) {
      return 0;
    }

    try {
      const result = await this.client.incr(key);
      if (ttlSeconds && result === 1) {
        await this.client.expire(key, ttlSeconds);
      }
      return result;
    } catch (error) {
      logger.error(`Cache increment error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Get or set pattern - if key doesn't exist, call factory function and cache result
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds: number = 3600
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  /**
   * Cache key generators for consistent naming
   */
  static keys = {
    university: (id: number) => `university:${id}`,
    universities: () => 'universities:all',
    universitySearch: (query: string) => `university:search:${query.toLowerCase()}`,
    
    department: (id: number) => `department:${id}`,
    departments: (universityId?: number) => 
      universityId ? `departments:university:${universityId}` : 'departments:all',
    departmentSearch: (query: string, universityId?: number) => 
      `department:search:${query.toLowerCase()}${universityId ? `:uni:${universityId}` : ''}`,
    
    scoreData: (departmentId: number, year?: number) => 
      `score:${departmentId}${year ? `:${year}` : ''}`,
    
    netCalculation: (university: string, department: string, language: string, scoreType: string) =>
      `net:${university}:${department}:${language}:${scoreType}`.toLowerCase(),
    
    userSession: (userId: string) => `session:${userId}`,
    userRateLimit: (userId: string) => `rate:${userId}`,
  };

  /**
   * Cache TTL constants (in seconds)
   */
  static TTL = {
    SHORT: 300,      // 5 minutes
    MEDIUM: 1800,    // 30 minutes
    LONG: 3600,      // 1 hour
    VERY_LONG: 86400, // 24 hours
    PERMANENT: -1,    // No expiration
  };

  /**
   * Cache invalidation strategies
   */
  async invalidateUniversityCache(universityId?: number): Promise<void> {
    const patterns = [
      CacheService.keys.universities(),
      'university:search:*',
    ];

    if (universityId) {
      patterns.push(
        CacheService.keys.university(universityId),
        CacheService.keys.departments(universityId),
        `department:search:*:uni:${universityId}`,
        `score:*` // Score data might be affected by university changes
      );
    }

    await Promise.all(patterns.map(pattern => this.deletePattern(pattern)));
    logger.info('University cache invalidated', { universityId, patterns });
  }

  async invalidateDepartmentCache(departmentId?: number, universityId?: number): Promise<void> {
    const patterns = [
      'departments:*',
      'department:search:*',
    ];

    if (departmentId) {
      patterns.push(
        CacheService.keys.department(departmentId),
        CacheService.keys.scoreData(departmentId),
        'net:*' // Net calculations might be affected
      );
    }

    if (universityId) {
      patterns.push(CacheService.keys.departments(universityId));
    }

    await Promise.all(patterns.map(pattern => this.deletePattern(pattern)));
    logger.info('Department cache invalidated', { departmentId, universityId, patterns });
  }

  async invalidateScoreCache(departmentId?: number, year?: number): Promise<void> {
    const patterns = ['net:*']; // Net calculations depend on score data

    if (departmentId) {
      patterns.push(CacheService.keys.scoreData(departmentId, year));
    } else {
      patterns.push('score:*');
    }

    await Promise.all(patterns.map(pattern => this.deletePattern(pattern)));
    logger.info('Score cache invalidated', { departmentId, year, patterns });
  }

  /**
   * Get cache performance statistics
   */
  async getCacheStats(): Promise<any> {
    if (!this.isConnected) {
      return { connected: false };
    }

    try {
      const info = await this.client.info('memory');
      const keyspace = await this.client.info('keyspace');
      const stats = await this.client.info('stats');

      // Parse Redis INFO output
      const parseInfo = (infoString: string) => {
        const result: any = {};
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
    } catch (error) {
      logger.error('Failed to get cache stats', error);
      return { connected: true, error: 'Failed to retrieve stats' };
    }
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmUpCache(): Promise<void> {
    logger.info('Starting cache warm-up...');
    
    try {
      // This would typically be called with actual data service methods
      // For now, we'll just log the intention
      logger.info('Cache warm-up completed');
    } catch (error) {
      logger.error('Cache warm-up failed', error);
    }
  }

  /**
   * Clear all cache data (use with caution)
   */
  async clearAll(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.client.flushDb();
      logger.warn('All cache data cleared');
    } catch (error) {
      logger.error('Failed to clear cache', error);
    }
  }
}