import logger from '@/utils/logger';

// Mock database connection for development without PostgreSQL
class MockDatabaseConnection {
  private connected: boolean = false;

  constructor() {
    this.connected = true;
    logger.info('Mock database connection initialized');
  }

  async query(text: string, params?: any[]): Promise<any> {
    logger.info('Mock query executed:', { text: text.substring(0, 100) + '...', params });
    
    // Return mock data based on query type
    if (text.includes('universities')) {
      return {
        rows: [
          { id: 1, name: 'İstanbul Üniversitesi', city: 'İstanbul', type: 'Devlet' },
          { id: 2, name: 'Marmara Üniversitesi', city: 'İstanbul', type: 'Devlet' },
          { id: 3, name: 'Boğaziçi Üniversitesi', city: 'İstanbul', type: 'Devlet' }
        ],
        rowCount: 3
      };
    }
    
    if (text.includes('departments')) {
      return {
        rows: [
          { id: 1, university_id: 1, name: 'Bilgisayar Mühendisliği', faculty: 'Mühendislik Fakültesi' },
          { id: 2, university_id: 1, name: 'İşletme', faculty: 'İktisadi ve İdari Bilimler Fakültesi' },
          { id: 3, university_id: 2, name: 'Hukuk', faculty: 'Hukuk Fakültesi' }
        ],
        rowCount: 3
      };
    }
    
    if (text.includes('score_data')) {
      return {
        rows: [
          { 
            id: 1, 
            department_id: 1, 
            year: 2024, 
            score_type: 'SAY', 
            base_score: 450.5, 
            ceiling_score: 485.2,
            quota: 120 
          }
        ],
        rowCount: 1
      };
    }
    
    // Mock chat sessions
    if (text.includes('chat_sessions') || text.includes('INSERT INTO chat_sessions')) {
      const sessionId = 'mock-session-' + Date.now();
      return {
        rows: [
          {
            id: sessionId,
            user_id: params?.[0] || 'demo-user',
            created_at: new Date(),
            last_activity: new Date(),
            is_active: true
          }
        ],
        rowCount: 1
      };
    }
    
    // Mock chat session lookup
    if (text.includes('SELECT') && text.includes('chat_sessions') && text.includes('WHERE')) {
      // For development, always return a session that matches the requesting user
      const sessionId = params?.[0] || 'mock-session-1761221653026';
      return {
        rows: [
          {
            id: sessionId,
            user_id: 'demo-user', // Always match demo user for development
            created_at: new Date(),
            last_activity: new Date(),
            is_active: true
          }
        ],
        rowCount: 1
      };
    }
    
    // Mock chat messages
    if (text.includes('chat_messages') || text.includes('INSERT INTO chat_messages')) {
      // Parameters: [id, sessionId, userId, content, type, intent, entities, timestamp]
      return {
        rows: [
          {
            id: params?.[0] || 'mock-message-' + Date.now(),
            session_id: params?.[1] || 'mock-session',
            user_id: params?.[2] || 'demo-user',
            content: params?.[3] || 'Mock message',
            message_type: params?.[4] || 'user',
            intent: params?.[5] || null,
            entities: params?.[6] || null,
            created_at: params?.[7] || new Date()
          }
        ],
        rowCount: 1
      };
    }
    
    if (text.includes('chat_sessions')) {
      return {
        rows: [
          { 
            id: 'mock-session-id', 
            user_id: 'mock-user', 
            created_at: new Date(),
            is_active: true 
          }
        ],
        rowCount: 1
      };
    }
    
    if (text.includes('chat_messages')) {
      return {
        rows: [
          { 
            id: 'mock-message-id', 
            session_id: 'mock-session-id',
            content: 'Mock message',
            message_type: 'user',
            created_at: new Date()
          }
        ],
        rowCount: 1
      };
    }
    
    // Default empty result
    return { rows: [], rowCount: 0 };
  }

  async getClient(): Promise<any> {
    return {
      query: this.query.bind(this),
      release: () => {}
    };
  }

  async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      return await callback(client);
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    this.connected = false;
    logger.info('Mock database connection closed');
  }

  getPool(): any {
    // Return a mock pool object that behaves like pg.Pool
    return {
      query: this.query.bind(this),
      connect: this.getClient.bind(this),
      end: this.close.bind(this),
      on: () => {}, // Mock event listener
    };
  }

  getPoolStats() {
    return {
      totalCount: 1,
      idleCount: 1,
      waitingCount: 0,
    };
  }

  async getPerformanceStats(): Promise<any> {
    return {
      activeConnections: 1,
      databaseSize: 'Mock DB',
      cacheHitRatio: 95,
      topColumns: [],
      poolStats: this.getPoolStats(),
    };
  }

  async runMigrations(): Promise<void> {
    logger.info('Mock migrations completed (no actual migrations run)');
  }
}

export const mockDb = new MockDatabaseConnection();
export default mockDb;