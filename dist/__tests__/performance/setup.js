"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@/config");
const logger_1 = __importDefault(require("@/utils/logger"));
// Set test environment
process.env.NODE_ENV = 'test';
process.env.DB_NAME = 'tercih_sihirbazi_test';
process.env.REDIS_DB = '1'; // Use different Redis DB for tests
// Increase timeout for performance tests
jest.setTimeout(60000);
// Global test setup
beforeAll(async () => {
    logger_1.default.info('Starting performance test suite');
    // Ensure we're in test environment
    if (config_1.config.nodeEnv !== 'test') {
        throw new Error('Performance tests must run in test environment');
    }
});
afterAll(async () => {
    logger_1.default.info('Performance test suite completed');
});
// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
    logger_1.default.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
// Performance test utilities
global.performanceTestUtils = {
    /**
     * Measure execution time of an async function
     */
    measureTime: async (fn) => {
        const start = Date.now();
        const result = await fn();
        const duration = Date.now() - start;
        return { result, duration };
    },
    /**
     * Run a function multiple times and get statistics
     */
    benchmark: async (fn, iterations = 10) => {
        const results = [];
        const times = [];
        for (let i = 0; i < iterations; i++) {
            const { result, duration } = await global.performanceTestUtils.measureTime(fn);
            results.push(result);
            times.push(duration);
        }
        const average = times.reduce((a, b) => a + b, 0) / times.length;
        const min = Math.min(...times);
        const max = Math.max(...times);
        const sortedTimes = [...times].sort((a, b) => a - b);
        const median = sortedTimes[Math.floor(sortedTimes.length / 2)];
        const variance = times.reduce((acc, time) => acc + Math.pow(time - average, 2), 0) / times.length;
        const standardDeviation = Math.sqrt(variance);
        return {
            results,
            times,
            average,
            min,
            max,
            median,
            standardDeviation,
        };
    },
    /**
     * Generate test data for performance tests
     */
    generateTestData: {
        universities: (count) => Array.from({ length: count }, (_, i) => ({
            id: i + 1,
            name: `Test University ${i + 1}`,
            city: `Test City ${i + 1}`,
            type: i % 2 === 0 ? 'state' : 'private',
            website: `http://test-university-${i + 1}.edu`,
        })),
        departments: (count, universityIds) => Array.from({ length: count }, (_, i) => ({
            id: i + 1,
            name: `Test Department ${i + 1}`,
            universityId: universityIds[i % universityIds.length],
            faculty: `Faculty ${i % 5 + 1}`,
            quota: Math.floor(Math.random() * 200) + 50,
        })),
        scoreData: (departmentIds, years = [2023, 2022, 2021]) => {
            const data = [];
            departmentIds.forEach(deptId => {
                years.forEach(year => {
                    data.push({
                        departmentId: deptId,
                        year,
                        minScore: Math.floor(Math.random() * 200) + 300,
                        maxScore: Math.floor(Math.random() * 100) + 500,
                        averageScore: Math.floor(Math.random() * 150) + 400,
                        quota: Math.floor(Math.random() * 100) + 50,
                        placed: Math.floor(Math.random() * 80) + 40,
                    });
                });
            });
            return data;
        },
    },
    /**
     * Performance thresholds for different operations
     */
    thresholds: {
        database: {
            simpleQuery: 100, // ms
            complexQuery: 1000, // ms
            transaction: 500, // ms
            concurrentQueries: 3000, // ms for batch
        },
        cache: {
            get: 10, // ms
            set: 20, // ms
            delete: 15, // ms
            pattern: 100, // ms
        },
        api: {
            healthCheck: 100, // ms
            simpleEndpoint: 500, // ms
            complexEndpoint: 3000, // ms
            chatRequest: 5000, // ms
        },
        load: {
            concurrentUsers: 100,
            maxResponseTime: 3000, // ms
            errorRateThreshold: 5, // percent
        },
    },
};
//# sourceMappingURL=setup.js.map