// Test setup file
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test_session_secret_key_for_testing_only';
process.env.PGHOST = process.env.TEST_PGHOST || 'localhost';
process.env.PGDATABASE = process.env.TEST_PGDATABASE || 'afrozy_market_test';
process.env.PGUSER = process.env.TEST_PGUSER || 'postgres';
process.env.PGPASSWORD = process.env.TEST_PGPASSWORD || 'password';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};