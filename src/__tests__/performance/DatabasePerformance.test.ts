import db from '@/database/connection';
import logger from '@/utils/logger';

describe('Database Performance Tests', () => {
  beforeAll(async () => {
    // Ensure database is connected
    await db.query('SELECT 1');
  });

  afterAll(async () => {
    // Clean up test data
    await db.query('DELETE FROM universities WHERE name LIKE $1', ['Test University%']);
    await db.query('DELETE FROM departments WHERE name LIKE $1', ['Test Department%']);
  });

  describe('Connection Pool Performance', () => {
    it('should handle concurrent database connections efficiently', async () => {
      const concurrentQueries = 50;
      const maxResponseTime = 3000;

      const queries = Array.from({ length: concurrentQueries }, (_, i) =>
        db.query('SELECT $1 as test_id, NOW() as timestamp', [i])
      );

      const startTime = Date.now();
      const results = await Promise.all(queries);
      const totalTime = Date.now() - startTime;

      const averageTime = totalTime / concurrentQueries;
      const allSuccessful = results.every(result => result.rows.length > 0);

      expect(allSuccessful).toBe(true);
      expect(totalTime).toBeLessThan(maxResponseTime);
      expect(averageTime).toBeLessThan(maxResponseTime / 10);

      // Check pool statistics
      const poolStats = db.getPoolStats();
      
      console.log(`Database Connection Pool Test:
        - Concurrent Queries: ${concurrentQueries}
        - Total Time: ${totalTime}ms
        - Average Time: ${averageTime.toFixed(2)}ms
        - All Successful: ${allSuccessful}
        - Pool Stats: ${JSON.stringify(poolStats)}
      `);
    });

    it('should maintain stable connection pool under load', async () => {
      const iterations = 10;
      const queriesPerIteration = 20;
      const poolStatHistory: any[] = [];

      for (let i = 0; i < iterations; i++) {
        // Execute batch of queries
        const queries = Array.from({ length: queriesPerIteration }, (_, j) =>
          db.query('SELECT $1 as iteration, $2 as query_num', [i, j])
        );

        await Promise.all(queries);
        
        // Record pool statistics
        const stats = db.getPoolStats();
        poolStatHistory.push({
          iteration: i,
          ...stats,
        });

        // Small delay between iterations
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Analyze pool stability
      const totalCounts = poolStatHistory.map(s => s.totalCount);
      const idleCounts = poolStatHistory.map(s => s.idleCount);
      const waitingCounts = poolStatHistory.map(s => s.waitingCount);

      const maxTotal = Math.max(...totalCounts);
      const minTotal = Math.min(...totalCounts);
      const maxWaiting = Math.max(...waitingCounts);

      // Pool should remain stable
      expect(maxTotal - minTotal).toBeLessThan(5); // Pool size shouldn't vary much
      expect(maxWaiting).toBeLessThan(5); // Shouldn't have many waiting connections
      
      console.log(`Connection Pool Stability:
        - Iterations: ${iterations}
        - Queries per iteration: ${queriesPerIteration}
        - Pool size range: ${minTotal} - ${maxTotal}
        - Max waiting connections: ${maxWaiting}
        - Final pool stats: ${JSON.stringify(poolStatHistory[poolStatHistory.length - 1])}
      `);
    });
  });

  describe('Query Performance', () => {
    it('should execute simple queries within performance thresholds', async () => {
      const simpleQueries = [
        'SELECT COUNT(*) FROM universities',
        'SELECT COUNT(*) FROM departments',
        'SELECT COUNT(*) FROM score_data',
        'SELECT 1 as health_check',
        'SELECT NOW() as current_time',
      ];

      const queryResults: Array<{ query: string; time: number; success: boolean }> = [];

      for (const query of simpleQueries) {
        const startTime = Date.now();
        try {
          const result = await db.query(query);
          const queryTime = Date.now() - startTime;
          
          queryResults.push({
            query: query.substring(0, 50) + '...',
            time: queryTime,
            success: true,
          });

          // Simple queries should be very fast
          expect(queryTime).toBeLessThan(1000);
        } catch (error) {
          queryResults.push({
            query: query.substring(0, 50) + '...',
            time: Date.now() - startTime,
            success: false,
          });
        }
      }

      const averageTime = queryResults.reduce((sum, r) => sum + r.time, 0) / queryResults.length;
      const successRate = (queryResults.filter(r => r.success).length / queryResults.length) * 100;

      expect(successRate).toBe(100);
      expect(averageTime).toBeLessThan(500);

      console.log(`Simple Query Performance:
        - Queries tested: ${simpleQueries.length}
        - Average time: ${averageTime.toFixed(2)}ms
        - Success rate: ${successRate}%
        - Query details:
      `);
      queryResults.forEach(r => {
        console.log(`  - ${r.query}: ${r.time}ms (${r.success ? 'Success' : 'Failed'})`);
      });
    });

    it('should handle complex queries efficiently', async () => {
      // Create test data first
      await db.query(`
        INSERT INTO universities (name, city, type, website) 
        VALUES ($1, $2, $3, $4) 
        ON CONFLICT (name) DO NOTHING
      `, ['Test University Complex', 'Test City', 'state', 'http://test.edu']);

      const universityResult = await db.query('SELECT id FROM universities WHERE name = $1', ['Test University Complex']);
      const universityId = universityResult.rows[0]?.id;

      if (universityId) {
        await db.query(`
          INSERT INTO departments (name, university_id, faculty, quota) 
          VALUES ($1, $2, $3, $4) 
          ON CONFLICT (name, university_id) DO NOTHING
        `, ['Test Department Complex', universityId, 'Engineering', 100]);
      }

      const complexQueries = [
        // Join query
        `SELECT u.name as university_name, d.name as department_name, d.quota
         FROM universities u 
         JOIN departments d ON u.id = d.university_id 
         WHERE u.name LIKE '%Test%' 
         LIMIT 10`,
        
        // Aggregation query
        `SELECT u.city, COUNT(d.id) as department_count, AVG(d.quota) as avg_quota
         FROM universities u 
         LEFT JOIN departments d ON u.id = d.university_id 
         GROUP BY u.city 
         HAVING COUNT(d.id) > 0 
         ORDER BY department_count DESC 
         LIMIT 5`,
        
        // Subquery
        `SELECT name FROM universities 
         WHERE id IN (
           SELECT DISTINCT university_id FROM departments 
           WHERE quota > 50
         ) 
         LIMIT 10`,
      ];

      const complexQueryResults: Array<{ query: string; time: number; rows: number }> = [];

      for (const query of complexQueries) {
        const startTime = Date.now();
        const result = await db.query(query);
        const queryTime = Date.now() - startTime;
        
        complexQueryResults.push({
          query: query.split('\n')[0].trim() + '...',
          time: queryTime,
          rows: result.rowCount || 0,
        });

        // Complex queries should still be reasonably fast
        expect(queryTime).toBeLessThan(5000);
      }

      const averageComplexTime = complexQueryResults.reduce((sum, r) => sum + r.time, 0) / complexQueryResults.length;
      expect(averageComplexTime).toBeLessThan(3000);

      console.log(`Complex Query Performance:
        - Queries tested: ${complexQueries.length}
        - Average time: ${averageComplexTime.toFixed(2)}ms
        - Query details:
      `);
      complexQueryResults.forEach(r => {
        console.log(`  - ${r.query}: ${r.time}ms (${r.rows} rows)`);
      });
    });
  });

  describe('Database Statistics and Monitoring', () => {
    it('should provide accurate performance statistics', async () => {
      const stats = await db.getPerformanceStats();
      
      expect(stats).toBeDefined();
      expect(typeof stats.activeConnections).toBe('number');
      expect(stats.databaseSize).toBeDefined();
      expect(typeof stats.cacheHitRatio).toBe('number');
      expect(Array.isArray(stats.topColumns)).toBe(true);
      expect(stats.poolStats).toBeDefined();

      console.log(`Database Performance Statistics:
        - Active Connections: ${stats.activeConnections}
        - Database Size: ${stats.databaseSize}
        - Cache Hit Ratio: ${stats.cacheHitRatio}%
        - Pool Stats: ${JSON.stringify(stats.poolStats)}
        - Top Columns: ${stats.topColumns.length} analyzed
      `);
    });

    it('should detect slow queries', async () => {
      // Simulate a slow query
      const slowQuery = 'SELECT pg_sleep(0.1), NOW()'; // 100ms delay
      
      const startTime = Date.now();
      await db.query(slowQuery);
      const queryTime = Date.now() - startTime;

      // Should detect as slow (>100ms)
      expect(queryTime).toBeGreaterThan(100);
      
      console.log(`Slow Query Detection:
        - Query: ${slowQuery}
        - Execution time: ${queryTime}ms
        - Detected as slow: ${queryTime > 100 ? 'Yes' : 'No'}
      `);
    });

    it('should handle transaction performance', async () => {
      const transactionOperations = 10;
      
      const startTime = Date.now();
      
      await db.transaction(async (client) => {
        for (let i = 0; i < transactionOperations; i++) {
          await client.query('SELECT $1 as operation_num', [i]);
        }
      });
      
      const transactionTime = Date.now() - startTime;
      const averageOperationTime = transactionTime / transactionOperations;

      expect(transactionTime).toBeLessThan(3000);
      expect(averageOperationTime).toBeLessThan(300);

      console.log(`Transaction Performance:
        - Operations in transaction: ${transactionOperations}
        - Total transaction time: ${transactionTime}ms
        - Average operation time: ${averageOperationTime.toFixed(2)}ms
      `);
    });
  });

  describe('Database Load Testing', () => {
    it('should handle high-frequency inserts', async () => {
      const insertCount = 100;
      const testData = Array.from({ length: insertCount }, (_, i) => ({
        name: `Test University Perf ${i}`,
        city: `Test City ${i}`,
        type: 'private',
        website: `http://test${i}.edu`,
      }));

      const startTime = Date.now();
      
      // Use batch insert for better performance
      const values = testData.map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`).join(', ');
      const params = testData.flatMap(d => [d.name, d.city, d.type, d.website]);
      
      await db.query(`
        INSERT INTO universities (name, city, type, website) 
        VALUES ${values}
        ON CONFLICT (name) DO NOTHING
      `, params);
      
      const insertTime = Date.now() - startTime;
      const averageInsertTime = insertTime / insertCount;

      expect(insertTime).toBeLessThan(5000);
      expect(averageInsertTime).toBeLessThan(50);

      // Clean up
      await db.query('DELETE FROM universities WHERE name LIKE $1', ['Test University Perf%']);

      console.log(`Batch Insert Performance:
        - Records inserted: ${insertCount}
        - Total time: ${insertTime}ms
        - Average time per record: ${averageInsertTime.toFixed(2)}ms
        - Records per second: ${(insertCount / (insertTime / 1000)).toFixed(2)}
      `);
    });

    it('should maintain performance under concurrent load', async () => {
      const concurrentConnections = 25;
      const queriesPerConnection = 10;
      
      const connectionTasks = Array.from({ length: concurrentConnections }, async (_, connIndex) => {
        const queries = Array.from({ length: queriesPerConnection }, (_, queryIndex) =>
          db.query('SELECT $1 as conn_id, $2 as query_id, NOW() as timestamp', [connIndex, queryIndex])
        );
        
        return Promise.all(queries);
      });

      const startTime = Date.now();
      const results = await Promise.all(connectionTasks);
      const totalTime = Date.now() - startTime;

      const totalQueries = concurrentConnections * queriesPerConnection;
      const averageTime = totalTime / totalQueries;
      const queriesPerSecond = totalQueries / (totalTime / 1000);

      expect(totalTime).toBeLessThan(10000); // Should complete in <10 seconds
      expect(averageTime).toBeLessThan(100); // Each query should be <100ms on average

      console.log(`Concurrent Load Test:
        - Concurrent connections: ${concurrentConnections}
        - Queries per connection: ${queriesPerConnection}
        - Total queries: ${totalQueries}
        - Total time: ${totalTime}ms
        - Average query time: ${averageTime.toFixed(2)}ms
        - Queries per second: ${queriesPerSecond.toFixed(2)}
        - All successful: ${results.every(connResults => connResults.every(r => r.rows.length > 0))}
      `);
    });
  });
});