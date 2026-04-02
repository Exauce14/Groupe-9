// Configuration global des tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-jwt';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = 5432;
process.env.DB_NAME = 'fortivia_test';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'postgres';

// Mock console pour réduire le bruit des logs pendant les tests
global.console.log = jest.fn();
global.console.error = jest.fn();
global.console.warn = jest.fn();
