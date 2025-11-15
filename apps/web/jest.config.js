const path = require('path');
const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });
const workspaceRoot = path.join(__dirname, '..', '..');

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^react$': path.join(workspaceRoot, 'node_modules', 'react'),
    '^react-dom$': path.join(workspaceRoot, 'node_modules', 'react-dom'),
  },
  testEnvironment: 'jest-environment-jsdom',
};

module.exports = createJestConfig(customJestConfig);
