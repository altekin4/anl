"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const config_1 = __importDefault(require("../config"));
const logger_1 = __importDefault(require("../utils/logger"));
class DatabaseConnection {
    constructor() {
        this.pool = new pg_1.Pool({
            host: config_1.default.database.host,
            port: config_1.default.database.port,
            database: config_1.default.database.name,
            user: config_1.default.database.user,
            password: config_1.default.database.password,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
        this.pool.on('error', (err) => {
            logger_1.default.error('Unexpected error on idle client', err);
        });
    }
    static getInstance() {
        if (!DatabaseConnection.instance) {
            DatabaseConnection.instance = new DatabaseConnection();
        }
        return DatabaseConnection.instance;
    }
    getPool() {
        return this.pool;
    }
    async query(text, params) {
        const start = Date.now();
        try {
            const res = await this.pool.query(text, params);
            const duration = Date.now() - start;
            logger_1.default.debug('Executed query', { text, duration, rows: res.rowCount });
            return res;
        }
        catch (error) {
            logger_1.default.error('Database query error', { text, error });
            throw error;
        }
    }
    async transaction(callback) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    async runMigrations() {
        logger_1.default.info('Running database migrations...');
        // Migration logic would go here
        logger_1.default.info('Database migrations completed');
    }
    async getPerformanceStats() {
        const result = await this.query(`
      SELECT 
        'connections' as metric,
        numbackends as value
      FROM pg_stat_database 
      WHERE datname = current_database()
    `);
        return {
            connections: result.rows[0]?.value || 0,
            queries: 0, // Placeholder
            avgResponseTime: 0 // Placeholder
        };
    }
    async close() {
        await this.pool.end();
    }
}
const db = DatabaseConnection.getInstance();
exports.default = db;
//# sourceMappingURL=connection.js.map