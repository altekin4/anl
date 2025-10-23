module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/e2e/**/*.e2e.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/__tests__/**',
    '!src/database/migrations/**',
  ],
  coverageDirectory: 'coverage/e2e',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/e2e/setup.ts'],
  testTimeout: 30000, // 30 seconds for E2E tests
  maxWorkers: 1, // Run E2E tests sequentially to avoid conflicts
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  globalSetup: '<rootDir>/src/__tests__/e2e/globalSetup.js',
  globalTeardown: '<rootDir>/src/__tests__/e2e/globalTeardown.js',
};