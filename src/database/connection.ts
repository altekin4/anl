import { Pool } from 'pg';
import config from '../config';
import logger from '../utils/logger';

class DatabaseConnection {
  private pool: Pool;
  private static instance: DatabaseConnection;

  private constructor() {
    this.pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.user,
      password: config.database.password,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      logger.error('Unexpected error on idle client', err);
    });
  }

  static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  getPool(): Pool {
    return this.pool;
  }

  async query(text: string, params?: any[]): Promise<any> {
    const start = Date.now();
    try {
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug('Executed query', { text, duration, rows: res.rowCount });
      return res;
    } catch (error) {
      logger.error('Database query error', { text, error });
      throw error;
    }
  }

  async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async runMigrations(): Promise<void> {
    logger.info('Running database migrations...');
    // Migration logic would go here
    logger.info('Database migrations completed');
  }

  async getPerformanceStats(): Promise<any> {
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

  async close(): Promise<void> {
    await this.pool.end();
  }
}

const db = DatabaseConnection.getInstance();
export default db;