const request = require('supertest');
const express = require('express');
const authRoutes = require('../routes/auth');

// Mock the database module
jest.mock('../config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

// Mock the logger module
jest.mock('../config/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

// Mock session utilities
jest.mock('../utils/sessionUtils', () => ({
  getUserSessions: jest.fn(),
  destroyUserSessions: jest.fn(),
  destroySession: jest.fn(),
  getSessionStats: jest.fn()
}));

// Mock auth utils
jest.mock('../utils/auth', () => ({
  authenticateUser: jest.fn(),
  createUser: jest.fn(),
  getUserById: jest.fn(),
  authenticateSession: jest.fn(() => (req, res, next) => next())
}));

const { pool } = require('../config/database');
const { authenticateUser, createUser } = require('../utils/auth');

describe('Auth Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Mock session middleware
    app.use((req, res, next) => {
      req.session = {
        userId: null,
        userType: null,
        email: null,
        destroy: jest.fn((callback) => callback && callback()),
        touch: jest.fn()
      };
      req.sessionID = 'test-session-id';
      next();
    });
    
    app.use('/api/auth', authRoutes);
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123!',
        fullName: 'Test User',
        phone: '1234567890',
        address: '123 Test St'
      };

      // Mock database responses for user existence checks
      pool.query
        .mockResolvedValueOnce({ rows: [] }) // customers check
        .mockResolvedValueOnce({ rows: [] }) // admins check  
        .mockResolvedValueOnce({ rows: [] }); // store_owners check

      // Mock createUser function
      createUser.mockResolvedValueOnce({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        phone: '1234567890',
        address: '123 Test St',
        user_type: 'customer',
        status: 'active',
        created_at: new Date()
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.data.user).toBeDefined();
      // Session-based auth, no token expected
    });

    it('should return 400 for invalid email', async () => {
      const userData = {
        username: 'testuser',
        email: 'invalid-email',
        password: 'Password123!',
        fullName: 'Test User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Please provide a valid email address');
    });

    it('should return 400 for weak password', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'weak',
        fullName: 'Test User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Password must be at least 6 characters long');
    });

    it('should return 409 for existing user', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123!',
        fullName: 'Test User'
      };

      // Mock existing user found in first table (customers)
      pool.query.mockResolvedValueOnce({ 
        rows: [{ id: 1 }] 
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User with this email or username already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login user successfully', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'Password123!'
      };

      // Mock authenticateUser function
      authenticateUser.mockResolvedValueOnce({
        success: true,
        message: 'Authentication successful',
        data: {
          user: {
            id: 1,
            username: 'testuser',
            email: 'test@example.com',
            full_name: 'Test User',
            phone: '1234567890',
            address: '123 Test St',
            user_type: 'customer',
            status: 'active',
            created_at: new Date()
          }
        }
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Authentication successful');
      expect(response.body.data.user).toBeDefined();
      // Session-based auth, no token expected
    });

    it('should return 401 for non-existent user', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'Password123!'
      };

      // Mock authenticateUser returning failure
      authenticateUser.mockResolvedValueOnce({
        success: false,
        message: 'Invalid email or password'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid email or password');
    });

    it('should return 401 for invalid password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      // Mock authenticateUser returning failure for invalid password
      authenticateUser.mockResolvedValueOnce({
        success: false,
        message: 'Invalid email or password'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid email or password');
    });

    it('should return 400 for invalid email format', async () => {
      const loginData = {
        email: 'invalid-email',
        password: 'Password123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Please provide a valid email address');
    });
  });
});