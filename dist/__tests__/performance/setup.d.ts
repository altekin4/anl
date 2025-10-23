declare global {
    var performanceTestUtils: {
        measureTime: <T>(fn: () => Promise<T>) => Promise<{
            result: T;
            duration: number;
        }>;
        benchmark: <T>(fn: () => Promise<T>, iterations?: number) => Promise<{
            results: T[];
            times: number[];
            average: number;
            min: number;
            max: number;
            median: number;
            standardDeviation: number;
        }>;
        generateTestData: {
            universities: (count: number) => any[];
            departments: (count: number, universityIds: number[]) => any[];
            scoreData: (departmentIds: number[], years?: number[]) => any[];
        };
        thresholds: {
            database: {
                simpleQuery: number;
                complexQuery: number;
                transaction: number;
                concurrentQueries: number;
            };
            cache: {
                get: number;
                set: number;
                delete: number;
                pattern: number;
            };
            api: {
                healthCheck: number;
                simpleEndpoint: number;
                complexEndpoint: number;
                chatRequest: number;
            };
            load: {
                concurrentUsers: number;
                maxResponseTime: number;
                errorRateThreshold: number;
            };
        };
    };
}
export {};
//# sourceMappingURL=setup.d.ts.map