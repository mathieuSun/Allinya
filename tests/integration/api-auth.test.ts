/**
 * Integration Test: Authentication API
 * Tests auth endpoints with supertest
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { faker } from '@faker-js/faker';

// We'll need to import the Express app
const API_URL = 'http://localhost:5000';

describe('Authentication API', () => {
  const testUser = {
    email: faker.internet.email(),
    password: 'TestPassword123!',
    full_name: faker.person.fullName(),
    role: 'guest',
  };
  
  describe('POST /api/auth/signup', () => {
    it('should create a new user account', async () => {
      const response = await request(API_URL)
        .post('/api/auth/signup')
        .send(testUser)
        .expect(200);
      
      expect(response.body).toMatchObject({
        email: testUser.email,
        full_name: testUser.full_name,
        role: testUser.role,
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.password).toBeUndefined();
    });
    
    it('should reject duplicate email', async () => {
      // First signup
      await request(API_URL)
        .post('/api/auth/signup')
        .send({
          ...testUser,
          email: faker.internet.email(),
        })
        .expect(200);
      
      // Duplicate signup
      const response = await request(API_URL)
        .post('/api/auth/signup')
        .send(testUser)
        .expect(400);
      
      expect(response.body.error).toContain('already exists');
    });
    
    it('should validate required fields', async () => {
      const response = await request(API_URL)
        .post('/api/auth/signup')
        .send({
          email: testUser.email,
          // Missing password and other fields
        })
        .expect(400);
      
      expect(response.body.error).toBeDefined();
    });
  });
  
  describe('POST /api/auth/login', () => {
    const loginUser = {
      email: faker.internet.email(),
      password: 'LoginPassword123!',
      full_name: faker.person.fullName(),
      role: 'guest',
    };
    
    beforeAll(async () => {
      // Create user for login tests
      await request(API_URL)
        .post('/api/auth/signup')
        .send(loginUser);
    });
    
    it('should login with valid credentials', async () => {
      const response = await request(API_URL)
        .post('/api/auth/login')
        .send({
          email: loginUser.email,
          password: loginUser.password,
        })
        .expect(200);
      
      expect(response.body).toMatchObject({
        email: loginUser.email,
        full_name: loginUser.full_name,
        role: loginUser.role,
      });
    });
    
    it('should reject invalid password', async () => {
      const response = await request(API_URL)
        .post('/api/auth/login')
        .send({
          email: loginUser.email,
          password: 'WrongPassword123!',
        })
        .expect(401);
      
      expect(response.body.error).toContain('Invalid');
    });
    
    it('should reject non-existent user', async () => {
      const response = await request(API_URL)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@email.com',
          password: 'SomePassword123!',
        })
        .expect(401);
      
      expect(response.body.error).toBeDefined();
    });
  });
  
  describe('POST /api/auth/logout', () => {
    it('should clear session on logout', async () => {
      const agent = request.agent(API_URL);
      
      // Login first
      await agent
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);
      
      // Logout
      await agent
        .post('/api/auth/logout')
        .expect(200);
      
      // Try to access protected route
      const response = await agent
        .get('/api/auth/user')
        .expect(401);
      
      expect(response.body.error).toContain('authenticated');
    });
  });
  
  describe('GET /api/auth/user', () => {
    it('should return current user when authenticated', async () => {
      const agent = request.agent(API_URL);
      
      // Login
      const loginResponse = await agent
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);
      
      // Get user
      const response = await agent
        .get('/api/auth/user')
        .expect(200);
      
      expect(response.body).toMatchObject({
        email: testUser.email,
        full_name: testUser.full_name,
        role: testUser.role,
      });
    });
    
    it('should return 401 when not authenticated', async () => {
      const response = await request(API_URL)
        .get('/api/auth/user')
        .expect(401);
      
      expect(response.body.error).toContain('authenticated');
    });
  });
});