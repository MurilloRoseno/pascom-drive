module.exports = {
  testEnvironment: 'node',
  setupFiles: ['./jest-setup.js'],
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: ['Drive.js', 'Sheet.js', 'Watermark.js', 'WhatsApp.js', 'Code.js'],
  coverageThreshold: { global: { lines: 80 } },
};
