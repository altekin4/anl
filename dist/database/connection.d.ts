import { Pool } from 'pg';
declare class DatabaseConnection {
    private pool;
    private static instance;
    private constructor();
    static getInstance(): DatabaseConnection;
    getPool(): Pool;
    query(text: string, params?: any[]): Promise<any>;
    transaction<T>(callback: (client: any) => Promise<T>): Promise<T>;
    runMigrations(): Promise<void>;
    getPerformanceStats(): Promise<any>;
    close(): Promise<void>;
}
declare const db: DatabaseConnection;
export default db;
//# sourceMappingURL=connection.d.ts.map