import { Pool } from 'pg';
import { createServer } from 'http';
import { Server } from 'socket.io';
// import { io as Client } from 'socket.io-client'; // Removed for now
import express from 'express';
import request from 'supertest';
import { app } from '../../index';
import config from '@/config';
import logger from '@/utils/logger';

// Test database configuration
const testDbConfig = {
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '5432', 10),
  database: process.env.TEST_DB_NAME || 'tercih_sihirbazi_test',
  user: process.env.TEST_DB_USER || 'postgres',
  password: process.env.TEST_DB_PASSWORD || 'password',
};

export class E2ETestSetup {
  public app: express.Application;
  public server: any;
  public db: Pool;
  public testPort: number;
  public baseUrl: string;

  constructor() {
    this.app = app;
    this.testPort = 3001; // Different port for testing
    this.baseUrl = `http://localhost:${this.testPort}`;
    this.db = new Pool(testDbConfig);
  }

  async setup(): Promise<void> {
    try {
      // Start test server
      this.server = this.app.listen(this.testPort);
      logger.info(`Test server started on port ${this.testPort}`);

      // Wait for server to be ready
      await this.waitForServer();

      // Setup test database
      await this.setupTestDatabase();

      logger.info('E2E test setup completed');
    } catch (error) {
      logger.error('E2E test setup failed:', error);
      throw error;
    }
  }

  async teardown(): Promise<void> {
    try {
      // Close server
      if (this.server) {
        this.server.close();
      }

      // Clean up test database
      await this.cleanupTestDatabase();

      // Close database connection
      await this.db.end();

      logger.info('E2E test teardown completed');
    } catch (error) {
      logger.error('E2E test teardown failed:', error);
    }
  }

  async setupTestDatabase(): Promise<void> {
    // Create test tables and insert test data
    const setupQueries = [
      // Clean existing data
      'TRUNCATE TABLE chat_messages, chat_sessions, score_data, departments, universities RESTART IDENTITY CASCADE',
      
      // Insert test universities
      `INSERT INTO universities (id, name, city, type, aliases) VALUES 
        (1, 'Test Üniversitesi', 'İstanbul', 'Devlet', ARRAY['Test Üni', 'TÜ']),
        (2, 'Örnek Üniversitesi', 'Ankara', 'Vakıf', ARRAY['Örnek Üni', 'ÖÜ'])`,
      
      // Insert test departments
      `INSERT INTO departments (id, university_id, name, faculty, language, aliases) VALUES 
        (1, 1, 'Bilgisayar Mühendisliği', 'Mühendislik Fakültesi', 'Türkçe', ARRAY['Bilgisayar Müh', 'BM']),
        (2, 1, 'İşletme', 'İktisadi ve İdari Bilimler Fakültesi', 'Türkçe', ARRAY['İşletme Böl']),
        (3, 2, 'Hukuk', 'Hukuk Fakültesi', 'Türkçe', ARRAY['Hukuk Böl'])`,
      
      // Insert test score data
      `INSERT INTO score_data (department_id, year, score_type, base_score, ceiling_score, base_rank, ceiling_rank, quota) VALUES 
        (1, 2024, 'SAY', 450.5, 485.2, 15000, 8000, 120),
        (1, 2023, 'SAY', 445.2, 480.1, 16000, 8500, 115),
        (2, 2024, 'EA', 380.5, 420.8, 45000, 25000, 200),
        (3, 2024, 'EA', 420.2, 465.5, 25000, 12000, 150)`
    ];

    for (const query of setupQueries) {
      await this.db.query(query);
    }

    logger.info('Test database setup completed');
  }

  async cleanupTestDatabase(): Promise<void> {
    try {
      await this.db.query('TRUNCATE TABLE chat_messages, chat_sessions, score_data, departments, universities RESTART IDENTITY CASCADE');
      logger.info('Test database cleaned up');
    } catch (error) {
      logger.error('Test database cleanup failed:', error);
    }
  }

  async waitForServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Server startup timeout'));
      }, 10000);

      const checkServer = () => {
        request(this.app)
          .get('/health')
          .end((err, res) => {
            if (!err && res.status === 200) {
              clearTimeout(timeout);
              resolve();
            } else {
              setTimeout(checkServer, 100);
            }
          });
      };

      checkServer();
    });
  }

  // Helper method to create test chat session
  async createTestChatSession(userId: string = 'test-user-1'): Promise<string> {
    const response = await request(this.app)
      .post('/api/chat/sessions')
      .send({ userId })
      .expect(201);

    return response.body.data.sessionId;
  }

  // Helper method to send test message
  async sendTestMessage(sessionId: string, content: string, userId: string = 'test-user-1'): Promise<any> {
    const response = await request(this.app)
      .post(`/api/chat/sessions/${sessionId}/messages`)
      .send({ content, userId })
      .expect(200);

    return response.body.data;
  }

  // Helper method to create WebSocket client
  createWebSocketClient(): any {
    const { io } = require('socket.io-client');
    return io(this.baseUrl, {
      transports: ['websocket'],
      forceNew: true
    });
  }
}

// Global test setup instance
export const testSetup = new E2ETestSetup();

// Jest setup and teardown
beforeAll(async () => {
  await testSetup.setup();
}, 30000);

afterAll(async () => {
  await testSetup.teardown();
}, 10000);

export default testSetup;