import request from 'supertest';
import httpStatus from 'http-status';
import mongoose from 'mongoose';
import { app } from '../../src/app';
import { Category } from '../../src/models/category.model';
import { setupTestDB } from '../setup';
import { userOne, admin, insertUsers } from '../fixtures/user.fixture';
import { userOneAccessToken, adminAccessToken } from '../fixtures/token.fixture';

setupTestDB();

describe('Category routes', () => {
  let categoryId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    await insertUsers([userOne, admin]);
  });

  describe('POST /v1/categories', () => {
    test('should return 201 and successfully create a category if data is ok', async () => {
      const categoryData = {
        name: 'Test Category',
        description: 'Test Category Description',
      };

      const res = await request(app)
        .post('/v1/categories')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(categoryData);

      expect(res.status).toBe(httpStatus.CREATED);
      expect(res.body).toEqual({
        id: expect.anything(),
        name: categoryData.name,
        description: categoryData.description,
        createdAt: expect.any(String),
      });

      categoryId = res.body.id;
    });

    test('should return 401 error if access token is missing', async () => {
      const categoryData = {
        name: 'Another Category',
        description: 'Another Category Description',
      };

      const res = await request(app)
        .post('/v1/categories')
        .send(categoryData);

      expect(res.status).toBe(httpStatus.UNAUTHORIZED);
    });

    test('should return 400 error if name is invalid', async () => {
      const categoryData = {
        description: 'Invalid Category',
      };

      const res = await request(app)
        .post('/v1/categories')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(categoryData);

      expect(res.status).toBe(httpStatus.BAD_REQUEST);
    });
  });

  describe('GET /v1/categories', () => {
    test('should return 200 and apply the default query options', async () => {
      const res = await request(app)
        .get('/v1/categories')
        .send();

      expect(res.status).toBe(httpStatus.OK);
      expect(res.body).toEqual({
        results: expect.any(Array),
        page: 1,
        limit: 10,
        totalPages: 1,
        totalResults: expect.any(Number),
      });
      expect(res.body.results).toHaveLength(1);
      expect(res.body.results[0].name).toBe('Test Category');
    });

    test('should correctly apply filter on name field', async () => {
      const res = await request(app)
        .get('/v1/categories')
        .query({ name: 'test' })
        .send();

      expect(res.status).toBe(httpStatus.OK);
      expect(res.body).toEqual({
        results: expect.any(Array),
        page: 1,
        limit: 10,
        totalPages: 1,
        totalResults: expect.any(Number),
      });
      expect(res.body.results).toHaveLength(1);
      expect(res.body.results[0].name).toBe('Test Category');
    });
  });

  describe('GET /v1/categories/:categoryId', () => {
    test('should return 200 and the category object if data is ok', async () => {
      const res = await request(app)
        .get(`/v1/categories/${categoryId}`)
        .send();

      expect(res.status).toBe(httpStatus.OK);
      expect(res.body).toMatchObject({
        id: categoryId,
        name: 'Test Category',
        description: 'Test Category Description',
      });
    });

    test('should return 404 error if category is not found', async () => {
      const nonExistentId = mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/v1/categories/${nonExistentId}`)
        .send();

      expect(res.status).toBe(httpStatus.NOT_FOUND);
    });
  });

  describe('PATCH /v1/categories/:categoryId', () => {
    test('should return 200 and successfully update category if data is ok', async () => {
      const updateBody = {
        name: 'Updated Category Name',
      };

      const res = await request(app)
        .patch(`/v1/categories/${categoryId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(updateBody);

      expect(res.status).toBe(httpStatus.OK);
      expect(res.body).toMatchObject({
        id: categoryId,
        name: updateBody.name,
        description: 'Test Category Description',
      });
    });

    test('should return 401 error if access token is missing', async () => {
      const updateBody = { name: 'New Name' };

      const res = await request(app)
        .patch(`/v1/categories/${categoryId}`)
        .send(updateBody);

      expect(res.status).toBe(httpStatus.UNAUTHORIZED);
    });

    test('should return 404 if category is not found', async () => {
      const nonExistentId = mongoose.Types.ObjectId();
      const updateBody = { name: 'New Name' };

      const res = await request(app)
        .patch(`/v1/categories/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(updateBody);

      expect(res.status).toBe(httpStatus.NOT_FOUND);
    });
  });

  describe('DELETE /v1/categories/:categoryId', () => {
    test('should return 204 if data is ok', async () => {
      const res = await request(app)
        .delete(`/v1/categories/${categoryId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send();

      expect(res.status).toBe(httpStatus.NO_CONTENT);

      // Check that the category was actually deleted
      const dbCategory = await Category.findById(categoryId);
      expect(dbCategory).toBeNull();
    });

    test('should return 401 error if access token is missing', async () => {
      const res = await request(app)
        .delete(`/v1/categories/${categoryId}`)
        .send();

      expect(res.status).toBe(httpStatus.UNAUTHORIZED);
    });

    test('should return 404 if category is not found', async () => {
      const nonExistentId = mongoose.Types.ObjectId();

      const res = await request(app)
        .delete(`/v1/categories/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send();

      expect(res.status).toBe(httpStatus.NOT_FOUND);
    });
  });
});