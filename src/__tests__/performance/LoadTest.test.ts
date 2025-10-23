import request from 'supertest';
import { app } from '@/index';
import performanceMonitor from '@/services/PerformanceMonitoringService';
import { CacheService } from '@/services/CacheService';
import db from '@/database/connection';

describe('Load Tests', () => {
  let cacheService: CacheService;

  beforeAll(async () => {
    cacheService = new CacheService();
    await cacheService.connect();
    
    // Reset performance metrics for clean testing
    performanceMonitor.resetMetrics();
  });

  afterAll(async () => {
    await cacheService.disconnect();
    await db.close();
  });

  describe('Concurrent User Load Test', () => {
    it('should handle 100+ concurrent requests within 3 seconds', async () => {
      const concurrentRequests = 100;
      const maxResponseTime = 3000; // 3 seconds
      
      const startTime = Date.now();
      
      // Create array of concurrent requests
      const requests = Array.from({ length: concurrentRequests }, () =>
        request(app)
          .get('/health')
          .expect(200)
      );

      // Execute all requests concurrently
      const responses = await Promise.all(requests);
      
      const totalTime = Date.now() - startTime;
      const averageResponseTime = totalTime / concurrentRequests;

      // Assertions
      expect(responses).toHaveLength(concurrentRequests);
      expect(totalTime).toBeLessThan(maxResponseTime);
      expect(averageResponseTime).toBeLessThan(maxResponseTime / 10); // Each request should be much faster
      
      console.log(`Load Test Results:
        - Concurrent Requests: ${concurrentRequests}
        - Total Time: ${totalTime}ms
        - Average Response Time: ${averageResponseTime.toFixed(2)}ms
        - All requests completed successfully: ${responses.every(r => r.status === 200)}
      `);
    }, 10000); // 10 second timeout

    it('should handle concurrent chat requests', async () => {
      const concurrentChatRequests = 50;
      const maxResponseTime = 5000; // 5 seconds for chat requests
      
      const chatPayload = {
        message: 'Bilgisayar mühendisliği için hangi üniversiteleri önerirsiniz?',
        sessionId: 'test-session-' + Date.now(),
      };

      const startTime = Date.now();
      
      const requests = Array.from({ length: concurrentChatRequests }, (_, index) =>
        request(app)
          .post('/api/chat/message')
          .send({
            ...chatPayload,
            sessionId: `${chatPayload.sessionId}-${index}`,
          })
          .expect(200)
      );

      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;
      const averageResponseTime = totalTime / concurrentChatRequests;

      expect(responses).toHaveLength(concurrentChatRequests);
      expect(totalTime).toBeLessThan(maxResponseTime * 2); // Allow some buffer for concurrent processing
      expect(averageResponseTime).toBeLessThan(maxResponseTime);
      
      console.log(`Chat Load Test Results:
        - Concurrent Chat Requests: ${concurrentChatRequests}
        - Total Time: ${totalTime}ms
        - Average Response Time: ${averageResponseTime.toFixed(2)}ms
        - Success Rate: ${(responses.filter(r => r.status === 200).length / concurrentChatRequests * 100).toFixed(2)}%
      `);
    }, 30000); // 30 second timeout for chat requests

    it('should handle concurrent calculator requests', async () => {
      const concurrentRequests = 75;
      const maxResponseTime = 3000;
      
      const calculatorPayload = {
        university: 'İstanbul Teknik Üniversitesi',
        department: 'Bilgisayar Mühendisliği',
        language: 'turkish',
        scoreType: 'sayisal',
      };

      const startTime = Date.now();
      
      const requests = Array.from({ length: concurrentRequests }, () =>
        request(app)
          .post('/api/calculator/net-score')
          .send(calculatorPayload)
          .expect(200)
      );

      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;
      const averageResponseTime = totalTime / concurrentRequests;

      expect(responses).toHaveLength(concurrentRequests);
      expect(totalTime).toBeLessThan(maxResponseTime * 2);
      expect(averageResponseTime).toBeLessThan(maxResponseTime);
      
      console.log(`Calculator Load Test Results:
        - Concurrent Calculator Requests: ${concurrentRequests}
        - Total Time: ${totalTime}ms
        - Average Response Time: ${averageResponseTime.toFixed(2)}ms
        - Success Rate: ${(responses.filter(r => r.status === 200).length / concurrentRequests * 100).toFixed(2)}%
      `);
    }, 15000);
  });

  describe('Response Time Requirements', () => {
    it('should respond to health checks within 100ms', async () => {
      const iterations = 10;
      const maxResponseTime = 100;
      
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        
        const response = await request(app)
          .get('/health')
          .expect(200);
        
        const responseTime = Date.now() - startTime;
        
        expect(responseTime).toBeLessThan(maxResponseTime);
        expect(response.body.status).toBe('healthy');
      }
    });

    it('should respond to API requests within 3 seconds', async () => {
      const endpoints = [
        { method: 'get', path: '/health/metrics' },
        { method: 'get', path: '/health/database' },
        { method: 'get', path: '/health/cache' },
      ];

      for (const endpoint of endpoints) {
        const startTime = Date.now();
        
        let response;
        if (endpoint.method === 'get') {
          response = await request(app).get(endpoint.path);
        }
        
        const responseTime = Date.now() - startTime;
        
        expect(responseTime).toBeLessThan(3000);
        expect(response?.status).toBeLessThan(500); // Should not be server error
        
        console.log(`${endpoint.method.toUpperCase()} ${endpoint.path}: ${responseTime}ms`);
      }
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should not exceed memory limits during load', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform intensive operations
      const requests = Array.from({ length: 50 }, () =>
        request(app)
          .get('/health/detailed')
          .expect(200)
      );

      await Promise.all(requests);
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseInMB = memoryIncrease / 1024 / 1024;
      
      // Memory increase should be reasonable (less than 100MB for this test)
      expect(memoryIncreaseInMB).toBeLessThan(100);
      
      console.log(`Memory Usage:
        - Initial Heap: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB
        - Final Heap: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB
        - Increase: ${memoryIncreaseInMB.toFixed(2)}MB
      `);
    });

    it('should maintain stable performance over time', async () => {
      const iterations = 20;
      const responseTimes: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        
        await request(app)
          .get('/health/metrics')
          .expect(200);
        
        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Calculate statistics
      const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      const minResponseTime = Math.min(...responseTimes);
      const variance = responseTimes.reduce((acc, time) => acc + Math.pow(time - averageResponseTime, 2), 0) / responseTimes.length;
      const standardDeviation = Math.sqrt(variance);
      
      // Performance should be stable (low standard deviation)
      expect(standardDeviation).toBeLessThan(averageResponseTime * 0.5); // SD should be less than 50% of average
      expect(maxResponseTime).toBeLessThan(3000); // No request should take more than 3 seconds
      
      console.log(`Performance Stability:
        - Average Response Time: ${averageResponseTime.toFixed(2)}ms
        - Min Response Time: ${minResponseTime}ms
        - Max Response Time: ${maxResponseTime}ms
        - Standard Deviation: ${standardDeviation.toFixed(2)}ms
        - Coefficient of Variation: ${(standardDeviation / averageResponseTime * 100).toFixed(2)}%
      `);
    });
  });
});