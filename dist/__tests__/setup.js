"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Global test setup
require("tsconfig-paths/register");
// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.PORT = '3003';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'tercih_sihirbazi_test';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'test';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.OPENAI_API_KEY = 'test-openai-key';
// Increase timeout for integration tests
jest.setTimeout(30000);
// Mock console methods to reduce noise in tests
global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};
//# sourceMappingURL=setup.js.map