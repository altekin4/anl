declare class MockDatabaseConnection {
    private connected;
    constructor();
    query(text: string, params?: any[]): Promise<any>;
    getClient(): Promise<any>;
    transaction<T>(callback: (client: any) => Promise<T>): Promise<T>;
    close(): Promise<void>;
    getPool(): any;
    getPoolStats(): {
        totalCount: number;
        idleCount: number;
        waitingCount: number;
    };
    getPerformanceStats(): Promise<any>;
    runMigrations(): Promise<void>;
}
export declare const mockDb: MockDatabaseConnection;
export default mockDb;
//# sourceMappingURL=mockConnection.d.ts.map