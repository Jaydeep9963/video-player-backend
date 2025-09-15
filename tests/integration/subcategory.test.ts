import request from 'supertest';
import mongoose from 'mongoose';
import httpStatus from 'http-status';
import app from '../../src/app';
import setupTestDB from '../utils/setupTestDB';
import { Category } from '../../src/models/category.model';
import { Subcategory } from '../../src/models/subcategory.model';
import { userOne, admin, insertUsers } from '../fixtures/user.fixture';
import { userOneAccessToken, adminAccessToken } from '../fixtures/token.fixture';

setupTestDB();

describe('Subcategory routes', () => {
  let category: any;
  let newSubcategory: Record<string, any>;

  beforeEach(async () => {
    await insertUsers([admin]);
    category = await Category.create({ name: 'Test Category', description: 'Test Description' });
    newSubcategory = {
      name: 'Test Subcategory',
      description: 'Test Subcategory Description',
      category: category._id,
    };
  });

  describe('POST /v1/subcategories', () => {
    test('should return 201 and successfully create subcategory if data is ok', async () => {
      const res = await request(app)
        .post('/v1/subcategories')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(newSubcategory)
        .expect(httpStatus.CREATED);

      expect(res.body).toEqual({
        id: expect.anything(),
        name: newSubcategory.name,
        description: newSubcategory.description,
        category: category._id.toString(),
        createdAt: expect.anything(),
        updatedAt: expect.anything(),
      });

      const dbSubcategory = await Subcategory.findById(res.body.id);
      expect(dbSubcategory).toBeDefined();
      expect(dbSubcategory).toMatchObject({
        name: newSubcategory.name,
        description: newSubcategory.description,
        category: category._id,
      });
    });

    test('should return 401 error if access token is missing', async () => {
      await request(app)
        .post('/v1/subcategories')
        .send(newSubcategory)
        .expect(httpStatus.UNAUTHORIZED);
    });

    test('should return 403 error if user is not admin', async () => {
      await insertUsers([userOne]);

      await request(app)
        .post('/v1/subcategories')
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send(newSubcategory)
        .expect(httpStatus.FORBIDDEN);
    });

    test('should return 400 error if name is invalid', async () => {
      newSubcategory.name = '';

      await request(app)
        .post('/v1/subcategories')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(newSubcategory)
        .expect(httpStatus.BAD_REQUEST);
    });

    test('should return 400 error if category does not exist', async () => {
      newSubcategory.category = mongoose.Types.ObjectId();

      await request(app)
        .post('/v1/subcategories')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(newSubcategory)
        .expect(httpStatus.BAD_REQUEST);
    });
  });

  describe('GET /v1/subcategories', () => {
    test('should return 200 and apply the default query options', async () => {
      await insertUsers([userOne]);
      await Subcategory.insertMany([newSubcategory]);

      const res = await request(app)
        .get('/v1/subcategories')
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send()
        .expect(httpStatus.OK);

      expect(res.body).toEqual({
        results: expect.any(Array),
        page: 1,
        limit: 10,
        totalPages: 1,
        totalResults: 1,
      });
      expect(res.body.results).toHaveLength(1);
      expect(res.body.results[0]).toEqual({
        id: expect.anything(),
        name: newSubcategory.name,
        description: newSubcategory.description,
        category: {
          id: category._id.toString(),
          name: category.name,
          description: category.description,
        },
        createdAt: expect.anything(),
        updatedAt: expect.anything(),
      });
    });

    test('should return 401 if access token is missing', async () => {
      await request(app)
        .get('/v1/subcategories')
        .send()
        .expect(httpStatus.UNAUTHORIZED);
    });

    test('should correctly apply filter on name field', async () => {
      await insertUsers([userOne]);
      await Subcategory.insertMany([
        newSubcategory,
        { name: 'Another Subcategory', description: 'Another Description', category: category._id },
      ]);

      const res = await request(app)
        .get('/v1/subcategories')
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .query({ name: newSubcategory.name })
        .send()
        .expect(httpStatus.OK);

      expect(res.body.results).toHaveLength(1);
      expect(res.body.results[0].name).toBe(newSubcategory.name);
    });

    test('should correctly apply filter on category field', async () => {
      await insertUsers([userOne]);
      const anotherCategory = await Category.create({ name: 'Another Category', description: 'Another Description' });
      await Subcategory.insertMany([
        newSubcategory,
        { name: 'Another Subcategory', description: 'Another Description', category: anotherCategory._id },
      ]);

      const res = await request(app)
        .get('/v1/subcategories')
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .query({ category: category._id.toString() })
        .send()
        .expect(httpStatus.OK);

      expect(res.body.results).toHaveLength(1);
      expect(res.body.results[0].name).toBe(newSubcategory.name);
    });
  });

  describe('GET /v1/subcategories/:subcategoryId', () => {
    test('should return 200 and the subcategory object if data is ok', async () => {
      await insertUsers([userOne]);
      const subcategory = await Subcategory.create(newSubcategory);

      const res = await request(app)
        .get(`/v1/subcategories/${subcategory._id}`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send()
        .expect(httpStatus.OK);

      expect(res.body).toEqual({
        id: subcategory._id.toString(),
        name: subcategory.name,
        description: subcategory.description,
        category: {
          id: category._id.toString(),
          name: category.name,
          description: category.description,
        },
        createdAt: subcategory.createdAt.toISOString(),
        updatedAt: subcategory.updatedAt.toISOString(),
      });
    });

    test('should return 401 error if access token is missing', async () => {
      const subcategory = await Subcategory.create(newSubcategory);

      await request(app)
        .get(`/v1/subcategories/${subcategory._id}`)
        .send()
        .expect(httpStatus.UNAUTHORIZED);
    });

    test('should return 404 error if subcategory is not found', async () => {
      await insertUsers([userOne]);

      await request(app)
        .get(`/v1/subcategories/${mongoose.Types.ObjectId()}`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send()
        .expect(httpStatus.NOT_FOUND);
    });
  });

  describe('GET /v1/subcategories/category/:categoryId', () => {
    test('should return 200 and the subcategories for a category', async () => {
      await insertUsers([userOne]);
      await Subcategory.create(newSubcategory);

      const res = await request(app)
        .get(`/v1/subcategories/category/${category._id}`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send()
        .expect(httpStatus.OK);

      expect(res.body).toEqual({
        results: expect.any(Array),
        page: 1,
        limit: 10,
        totalPages: 1,
        totalResults: 1,
      });
      expect(res.body.results).toHaveLength(1);
      expect(res.body.results[0].name).toBe(newSubcategory.name);
    });

    test('should return 401 error if access token is missing', async () => {
      await request(app)
        .get(`/v1/subcategories/category/${category._id}`)
        .send()
        .expect(httpStatus.UNAUTHORIZED);
    });

    test('should return empty array if no subcategories found for category', async () => {
      await insertUsers([userOne]);
      const anotherCategory = await Category.create({ name: 'Another Category', description: 'Another Description' });

      const res = await request(app)
        .get(`/v1/subcategories/category/${anotherCategory._id}`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send()
        .expect(httpStatus.OK);

      expect(res.body.results).toHaveLength(0);
    });
  });

  describe('PATCH /v1/subcategories/:subcategoryId', () => {
    test('should return 200 and successfully update subcategory if data is ok', async () => {
      await insertUsers([admin]);
      const subcategory = await Subcategory.create(newSubcategory);
      const updateBody = {
        name: 'Updated Subcategory',
        description: 'Updated Description',
      };

      const res = await request(app)
        .patch(`/v1/subcategories/${subcategory._id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(updateBody)
        .expect(httpStatus.OK);

      expect(res.body).toEqual({
        id: subcategory._id.toString(),
        name: updateBody.name,
        description: updateBody.description,
        category: category._id.toString(),
        createdAt: expect.anything(),
        updatedAt: expect.anything(),
      });

      const dbSubcategory = await Subcategory.findById(subcategory._id);
      expect(dbSubcategory).toBeDefined();
      expect(dbSubcategory).toMatchObject({
        name: updateBody.name,
        description: updateBody.description,
        category: category._id,
      });
    });

    test('should return 401 error if access token is missing', async () => {
      const subcategory = await Subcategory.create(newSubcategory);
      const updateBody = { name: 'Updated Subcategory' };

      await request(app)
        .patch(`/v1/subcategories/${subcategory._id}`)
        .send(updateBody)
        .expect(httpStatus.UNAUTHORIZED);
    });

    test('should return 403 error if user is not admin', async () => {
      await insertUsers([userOne]);
      const subcategory = await Subcategory.create(newSubcategory);
      const updateBody = { name: 'Updated Subcategory' };

      await request(app)
        .patch(`/v1/subcategories/${subcategory._id}`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send(updateBody)
        .expect(httpStatus.FORBIDDEN);
    });

    test('should return 404 error if subcategory is not found', async () => {
      await insertUsers([admin]);
      const updateBody = { name: 'Updated Subcategory' };

      await request(app)
        .patch(`/v1/subcategories/${mongoose.Types.ObjectId()}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(updateBody)
        .expect(httpStatus.NOT_FOUND);
    });

    test('should return 400 error if name is invalid', async () => {
      await insertUsers([admin]);
      const subcategory = await Subcategory.create(newSubcategory);
      const updateBody = { name: '' };

      await request(app)
        .patch(`/v1/subcategories/${subcategory._id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(updateBody)
        .expect(httpStatus.BAD_REQUEST);
    });
  });

  describe('DELETE /v1/subcategories/:subcategoryId', () => {
    test('should return 204 if data is ok', async () => {
      await insertUsers([admin]);
      const subcategory = await Subcategory.create(newSubcategory);

      await request(app)
        .delete(`/v1/subcategories/${subcategory._id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send()
        .expect(httpStatus.NO_CONTENT);

      const dbSubcategory = await Subcategory.findById(subcategory._id);
      expect(dbSubcategory).toBeNull();
    });

    test('should return 401 error if access token is missing', async () => {
      const subcategory = await Subcategory.create(newSubcategory);

      await request(app)
        .delete(`/v1/subcategories/${subcategory._id}`)
        .send()
        .expect(httpStatus.UNAUTHORIZED);
    });

    test('should return 403 error if user is not admin', async () => {
      await insertUsers([userOne]);
      const subcategory = await Subcategory.create(newSubcategory);

      await request(app)
        .delete(`/v1/subcategories/${subcategory._id}`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send()
        .expect(httpStatus.FORBIDDEN);
    });

    test('should return 404 error if subcategory is not found', async () => {
      await insertUsers([admin]);

      await request(app)
        .delete(`/v1/subcategories/${mongoose.Types.ObjectId()}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send()
        .expect(httpStatus.NOT_FOUND);
    });
  });
});