"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testSetup = exports.E2ETestSetup = void 0;
const pg_1 = require("pg");
const supertest_1 = __importDefault(require("supertest"));
const index_1 = require("../../index");
const logger_1 = __importDefault(require("@/utils/logger"));
// Test database configuration
const testDbConfig = {
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5432', 10),
    database: process.env.TEST_DB_NAME || 'tercih_sihirbazi_test',
    user: process.env.TEST_DB_USER || 'postgres',
    password: process.env.TEST_DB_PASSWORD || 'password',
};
class E2ETestSetup {
    constructor() {
        this.app = index_1.app;
        this.testPort = 3001; // Different port for testing
        this.baseUrl = `http://localhost:${this.testPort}`;
        this.db = new pg_1.Pool(testDbConfig);
    }
    async setup() {
        try {
            // Start test server
            this.server = this.app.listen(this.testPort);
            logger_1.default.info(`Test server started on port ${this.testPort}`);
            // Wait for server to be ready
            await this.waitForServer();
            // Setup test database
            await this.setupTestDatabase();
            logger_1.default.info('E2E test setup completed');
        }
        catch (error) {
            logger_1.default.error('E2E test setup failed:', error);
            throw error;
        }
    }
    async teardown() {
        try {
            // Close server
            if (this.server) {
                this.server.close();
            }
            // Clean up test database
            await this.cleanupTestDatabase();
            // Close database connection
            await this.db.end();
            logger_1.default.info('E2E test teardown completed');
        }
        catch (error) {
            logger_1.default.error('E2E test teardown failed:', error);
        }
    }
    async setupTestDatabase() {
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
        logger_1.default.info('Test database setup completed');
    }
    async cleanupTestDatabase() {
        try {
            await this.db.query('TRUNCATE TABLE chat_messages, chat_sessions, score_data, departments, universities RESTART IDENTITY CASCADE');
            logger_1.default.info('Test database cleaned up');
        }
        catch (error) {
            logger_1.default.error('Test database cleanup failed:', error);
        }
    }
    async waitForServer() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Server startup timeout'));
            }, 10000);
            const checkServer = () => {
                (0, supertest_1.default)(this.app)
                    .get('/health')
                    .end((err, res) => {
                    if (!err && res.status === 200) {
                        clearTimeout(timeout);
                        resolve();
                    }
                    else {
                        setTimeout(checkServer, 100);
                    }
                });
            };
            checkServer();
        });
    }
    // Helper method to create test chat session
    async createTestChatSession(userId = 'test-user-1') {
        const response = await (0, supertest_1.default)(this.app)
            .post('/api/chat/sessions')
            .send({ userId })
            .expect(201);
        return response.body.data.sessionId;
    }
    // Helper method to send test message
    async sendTestMessage(sessionId, content, userId = 'test-user-1') {
        const response = await (0, supertest_1.default)(this.app)
            .post(`/api/chat/sessions/${sessionId}/messages`)
            .send({ content, userId })
            .expect(200);
        return response.body.data;
    }
    // Helper method to create WebSocket client
    createWebSocketClient() {
        const { io } = require('socket.io-client');
        return io(this.baseUrl, {
            transports: ['websocket'],
            forceNew: true
        });
    }
}
exports.E2ETestSetup = E2ETestSetup;
// Global test setup instance
exports.testSetup = new E2ETestSetup();
// Jest setup and teardown
beforeAll(async () => {
    await exports.testSetup.setup();
}, 30000);
afterAll(async () => {
    await exports.testSetup.teardown();
}, 10000);
exports.default = exports.testSetup;
//# sourceMappingURL=setup.js.map