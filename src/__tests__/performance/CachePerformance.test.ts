import { CacheService } from '@/services/CacheService';
import logger from '@/utils/logger';

describe('Cache Performance Tests', () => {
  let cacheService: CacheService;

  beforeAll(async () => {
    cacheService = new CacheService();
    await cacheService.connect();
  });

  afterAll(async () => {
    await cacheService.disconnect();
  });

  beforeEach(async () => {
    // Clear cache before each test
    await cacheService.clearAll();
  });

  describe('Cache Hit Rate Tests', () => {
    it('should achieve high cache hit rate with repeated requests', async () => {
      const testData = {
        universities: Array.from({ length: 100 }, (_, i) => ({
          id: i + 1,
          name: `University ${i + 1}`,
          city: `City ${i + 1}`,
        })),
        departments: Array.from({ length: 200 }, (_, i) => ({
          id: i + 1,
          name: `Department ${i + 1}`,
          universityId: (i % 100) + 1,
        })),
      };

      // First pass - populate cache (cache misses)
      const firstPassStart = Date.now();
      for (const university of testData.universities) {
        const key = CacheService.keys.university(university.id);
        await cacheService.set(key, university, CacheService.TTL.LONG);
      }
      const firstPassTime = Date.now() - firstPassStart;

      // Second pass - should hit cache
      const secondPassStart = Date.now();
      let cacheHits = 0;
      for (const university of testData.universities) {
        const key = CacheService.keys.university(university.id);
        const cached = await cacheService.get(key);
        if (cached) cacheHits++;
      }
      const secondPassTime = Date.now() - secondPassStart;

      const hitRate = (cacheHits / testData.universities.length) * 100;

      // Assertions
      expect(hitRate).toBeGreaterThan(95); // Should achieve >95% hit rate
      expect(secondPassTime).toBeLessThan(firstPassTime / 2); // Cache reads should be much faster
      
      console.log(`Cache Hit Rate Test:
        - Total Items: ${testData.universities.length}
        - Cache Hits: ${cacheHits}
        - Hit Rate: ${hitRate.toFixed(2)}%
        - First Pass (writes): ${firstPassTime}ms
        - Second Pass (reads): ${secondPassTime}ms
        - Performance Improvement: ${((firstPassTime / secondPassTime) - 1) * 100}%
      `);
    });

    it('should maintain performance with large datasets', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        data: `Large data object ${i + 1}`.repeat(100), // Make objects larger
      }));

      // Test write performance
      const writeStart = Date.now();
      await Promise.all(
        largeDataset.map(item =>
          cacheService.set(`large_data:${item.id}`, item, CacheService.TTL.MEDIUM)
        )
      );
      const writeTime = Date.now() - writeStart;

      // Test read performance
      const readStart = Date.now();
      const results = await Promise.all(
        largeDataset.map(item =>
          cacheService.get(`large_data:${item.id}`)
        )
      );
      const readTime = Date.now() - readStart;

      const successfulReads = results.filter(result => result !== null).length;
      const readHitRate = (successfulReads / largeDataset.length) * 100;

      // Performance assertions
      expect(writeTime).toBeLessThan(5000); // Should write 1000 items in <5 seconds
      expect(readTime).toBeLessThan(2000); // Should read 1000 items in <2 seconds
      expect(readHitRate).toBeGreaterThan(95); // Should achieve >95% hit rate
      
      console.log(`Large Dataset Performance:
        - Dataset Size: ${largeDataset.length} items
        - Write Time: ${writeTime}ms (${(writeTime / largeDataset.length).toFixed(2)}ms per item)
        - Read Time: ${readTime}ms (${(readTime / largeDataset.length).toFixed(2)}ms per item)
        - Read Hit Rate: ${readHitRate.toFixed(2)}%
        - Read/Write Ratio: ${(readTime / writeTime).toFixed(2)}
      `);
    });
  });

  describe('Cache Invalidation Performance', () => {
    it('should efficiently invalidate related cache entries', async () => {
      // Setup test data
      const universityId = 1;
      const departments = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        name: `Department ${i + 1}`,
        universityId,
      }));

      // Populate cache
      await cacheService.set(CacheService.keys.university(universityId), { id: universityId, name: 'Test University' });
      await cacheService.set(CacheService.keys.universities(), [{ id: universityId, name: 'Test University' }]);
      
      for (const dept of departments) {
        await cacheService.set(CacheService.keys.department(dept.id), dept);
        await cacheService.set(CacheService.keys.scoreData(dept.id), { scores: [100, 200, 300] });
      }

      // Test invalidation performance
      const invalidationStart = Date.now();
      await cacheService.invalidateUniversityCache(universityId);
      const invalidationTime = Date.now() - invalidationStart;

      // Verify invalidation worked
      const universityExists = await cacheService.exists(CacheService.keys.university(universityId));
      const universitiesExists = await cacheService.exists(CacheService.keys.universities());

      expect(universityExists).toBe(false);
      expect(universitiesExists).toBe(false);
      expect(invalidationTime).toBeLessThan(1000); // Should complete in <1 second
      
      console.log(`Cache Invalidation Performance:
        - Items to invalidate: ~${departments.length + 10} cache entries
        - Invalidation time: ${invalidationTime}ms
        - University cache cleared: ${!universityExists}
        - Universities list cleared: ${!universitiesExists}
      `);
    });

    it('should handle pattern-based invalidation efficiently', async () => {
      // Create many search result caches
      const searchQueries = Array.from({ length: 100 }, (_, i) => `search query ${i + 1}`);
      
      // Populate search caches
      for (const query of searchQueries) {
        const key = CacheService.keys.universitySearch(query);
        await cacheService.set(key, [{ id: 1, name: 'Result' }]);
      }

      // Test pattern invalidation
      const invalidationStart = Date.now();
      await cacheService.deletePattern('university:search:*');
      const invalidationTime = Date.now() - invalidationStart;

      // Verify all search caches are cleared
      let remainingCaches = 0;
      for (const query of searchQueries) {
        const key = CacheService.keys.universitySearch(query);
        if (await cacheService.exists(key)) {
          remainingCaches++;
        }
      }

      expect(remainingCaches).toBe(0);
      expect(invalidationTime).toBeLessThan(2000); // Should complete in <2 seconds
      
      console.log(`Pattern Invalidation Performance:
        - Search caches created: ${searchQueries.length}
        - Invalidation time: ${invalidationTime}ms
        - Remaining caches: ${remainingCaches}
        - Average time per cache: ${(invalidationTime / searchQueries.length).toFixed(2)}ms
      `);
    });
  });

  describe('Cache Memory Efficiency', () => {
    it('should handle TTL expiration correctly', async () => {
      const shortTTL = 1; // 1 second
      const testKey = 'ttl_test_key';
      const testValue = { data: 'test data for TTL' };

      // Set with short TTL
      await cacheService.set(testKey, testValue, shortTTL);
      
      // Should exist immediately
      const immediateResult = await cacheService.get(testKey);
      expect(immediateResult).toEqual(testValue);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Should be expired
      const expiredResult = await cacheService.get(testKey);
      expect(expiredResult).toBeNull();
      
      console.log(`TTL Test:
        - Set with TTL: ${shortTTL}s
        - Immediate retrieval: ${immediateResult ? 'Success' : 'Failed'}
        - After expiration: ${expiredResult ? 'Still exists (Failed)' : 'Expired (Success)'}
      `);
    });

    it('should provide accurate cache statistics', async () => {
      // Perform various cache operations
      const operations = [
        () => cacheService.set('stat_test_1', { data: 'test1' }),
        () => cacheService.set('stat_test_2', { data: 'test2' }),
        () => cacheService.get('stat_test_1'),
        () => cacheService.get('stat_test_2'),
        () => cacheService.get('non_existent_key'), // Cache miss
        () => cacheService.delete('stat_test_1'),
      ];

      for (const operation of operations) {
        await operation();
      }

      // Get cache statistics
      const stats = await cacheService.getCacheStats();
      
      expect(stats.connected).toBe(true);
      expect(stats.stats).toBeDefined();
      expect(typeof stats.stats.hitRatio).toBe('number');
      
      console.log(`Cache Statistics:
        - Connected: ${stats.connected}
        - Memory Used: ${stats.memory?.used || 'N/A'}
        - Hit Ratio: ${stats.stats?.hitRatio?.toFixed(2) || 'N/A'}%
        - Total Commands: ${stats.stats?.totalCommandsProcessed || 'N/A'}
        - Keyspace Hits: ${stats.stats?.keyspaceHits || 'N/A'}
        - Keyspace Misses: ${stats.stats?.keyspaceMisses || 'N/A'}
      `);
    });
  });

  describe('Concurrent Cache Operations', () => {
    it('should handle concurrent reads and writes', async () => {
      const concurrentOperations = 100;
      const testData = Array.from({ length: concurrentOperations }, (_, i) => ({
        key: `concurrent_test_${i}`,
        value: { id: i, data: `Test data ${i}` },
      }));

      // Concurrent writes
      const writeStart = Date.now();
      await Promise.all(
        testData.map(({ key, value }) =>
          cacheService.set(key, value, CacheService.TTL.SHORT)
        )
      );
      const writeTime = Date.now() - writeStart;

      // Concurrent reads
      const readStart = Date.now();
      const results = await Promise.all(
        testData.map(({ key }) => cacheService.get(key))
      );
      const readTime = Date.now() - readStart;

      const successfulReads = results.filter(result => result !== null).length;
      const concurrencySuccessRate = (successfulReads / concurrentOperations) * 100;

      expect(concurrencySuccessRate).toBeGreaterThan(95);
      expect(writeTime).toBeLessThan(3000);
      expect(readTime).toBeLessThan(1000);
      
      console.log(`Concurrent Operations Test:
        - Concurrent Operations: ${concurrentOperations}
        - Write Time: ${writeTime}ms
        - Read Time: ${readTime}ms
        - Success Rate: ${concurrencySuccessRate.toFixed(2)}%
        - Avg Write Time: ${(writeTime / concurrentOperations).toFixed(2)}ms
        - Avg Read Time: ${(readTime / concurrentOperations).toFixed(2)}ms
      `);
    });
  });
});