module.exports = {
  preset: 'ts-jest',
  // Use jsdom so tests that interact with the DOM (document/window) compile and run correctly.
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  // Increase timeout for slower integration tests (ms)
  testTimeout: 20000,
  // Setup file to polyfill Web APIs for Node/Jest
  setupFiles: ['<rootDir>/jest.setup.js'],
};
