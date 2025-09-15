import request from 'supertest';
import httpStatus from 'http-status';
import mongoose from 'mongoose';
import app from '../../src/app';
import { User } from '../../src/models/user.model';

describe('User routes', () => {
  let adminToken: string;
  let userId: string;

  beforeEach(async () => {
    // Create a user and get authentication token
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin',
    });
    userId = adminUser._id.toString();
    
    const loginResponse = await request(app)
      .post('/v1/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'password123',
      });
    
    adminToken = loginResponse.body.tokens.access.token;
  });

  describe('GET /v1/users', () => {
    test('should return 200 and all users', async () => {
      const res = await request(app)
        .get('/v1/users')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(httpStatus.OK);
      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  describe('GET /v1/users/:userId', () => {
    test('should return 200 and the user if data is ok', async () => {
      const res = await request(app)
        .get(`/v1/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(httpStatus.OK);
      expect(res.body).toHaveProperty('_id', userId);
    });

    test('should return 404 if user does not exist', async () => {
      const res = await request(app)
        .get('/v1/users/5f0c5d9f3d7e4a001f7c2c7b')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(httpStatus.NOT_FOUND);
    });
  });

  describe('POST /v1/users', () => {
    test('should return 201 and create a new user', async () => {
      const newUser = {
        name: 'New User',
        email: 'newuser@example.com',
        password: 'password123',
        role: 'user',
      };

      const res = await request(app)
        .post('/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newUser);
      
      expect(res.status).toBe(httpStatus.CREATED);
      expect(res.body).toHaveProperty('name', newUser.name);
      expect(res.body).toHaveProperty('email', newUser.email);
      expect(res.body).toHaveProperty('role', newUser.role);
    });
  });

  describe('PATCH /v1/users/:userId', () => {
    test('should return 200 and update the user', async () => {
      const updateData = {
        name: 'Updated Name',
      };

      const res = await request(app)
        .patch(`/v1/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);
      
      expect(res.status).toBe(httpStatus.OK);
      expect(res.body).toHaveProperty('name', updateData.name);
    });
  });

  describe('DELETE /v1/users/:userId', () => {
    test('should return 204 and delete the user', async () => {
      const res = await request(app)
        .delete(`/v1/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(httpStatus.NO_CONTENT);
      
      const dbUser = await User.findById(userId);
      expect(dbUser).toBeNull();
    });
  });
});