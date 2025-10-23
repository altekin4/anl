module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/performance/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/performance/setup.ts'],
  testTimeout: 60000, // 60 seconds for performance tests
  maxWorkers: 1, // Run performance tests sequentially
  verbose: true,
  collectCoverage: false, // Disable coverage for performance tests
  // Performance test specific settings
  testSequencer: '<rootDir>/src/__tests__/performance/sequencer.js',
};