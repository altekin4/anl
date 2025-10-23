module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/public'],
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  setupFilesAfterEnv: ['<rootDir>/public/__tests__/setup.js'],
  collectCoverageFrom: [
    'public/**/*.js',
    '!public/**/*.test.js',
    '!public/__tests__/**',
  ],
  coverageDirectory: 'coverage-frontend',
  coverageReporters: ['text', 'lcov', 'html'],
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  moduleNameMapping: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  testTimeout: 10000,
};