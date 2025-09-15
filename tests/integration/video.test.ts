import request from 'supertest';
import httpStatus from 'http-status';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { app } from '../../src/app';
import { Video } from '../../src/models/video.model';
import { Category } from '../../src/models/category.model';
import { setupTestDB } from '../setup';
import { userOne, admin, insertUsers } from '../fixtures/user.fixture';
import { userOneAccessToken, adminAccessToken } from '../fixtures/token.fixture';

setupTestDB();

describe('Video routes', () => {
  let categoryId: mongoose.Types.ObjectId;
  let videoId: mongoose.Types.ObjectId;
  let testVideoPath: string;

  beforeAll(async () => {
    await insertUsers([userOne, admin]);
    
    // Create a test category
    const category = await Category.create({
      name: 'Test Category',
      description: 'Test Category Description',
    });
    categoryId = category._id;
    
    // Create test video file directory if it doesn't exist
    const testDir = path.join(__dirname, '../fixtures/test-videos');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    // Create a dummy test video file
    testVideoPath = path.join(testDir, 'test-video.mp4');
    if (!fs.existsSync(testVideoPath)) {
      // Create an empty file for testing
      fs.writeFileSync(testVideoPath, '');
    }
  });

  afterAll(async () => {
    // Clean up test video file
    if (fs.existsSync(testVideoPath)) {
      fs.unlinkSync(testVideoPath);
    }
  });

  describe('POST /v1/videos', () => {
    test('should return 201 and successfully create a video if data is ok', async () => {
      const videoData = {
        title: 'Test Video',
        description: 'Test Video Description',
        category: categoryId.toString(),
      };

      // Mock the file upload since supertest doesn't handle multipart/form-data well
      // In a real test, you would use a library like 'supertest-formdata' or mock the upload middleware
      jest.spyOn(Video.prototype, 'save').mockImplementationOnce(async function () {
        this._id = mongoose.Types.ObjectId();
        this.fileName = 'test-video.mp4';
        this.filePath = 'uploads/videos/test-video.mp4';
        this.thumbnailPath = 'uploads/thumbnails/thumbnail-test-video.jpg';
        this.duration = 60;
        this.views = 0;
        this.isPublished = true;
        return this;
      });

      const res = await request(app)
        .post('/v1/videos')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .field('title', videoData.title)
        .field('description', videoData.description)
        .field('category', videoData.category)
        .attach('video', testVideoPath);

      expect(res.status).toBe(httpStatus.CREATED);
      expect(res.body).toEqual({
        id: expect.anything(),
        title: videoData.title,
        description: videoData.description,
        category: videoData.category,
        fileName: expect.any(String),
        filePath: expect.any(String),
        thumbnailPath: expect.any(String),
        duration: expect.any(Number),
        views: 0,
        isPublished: true,
        createdAt: expect.any(String),
      });

      videoId = res.body.id;

      // Clean up mock
      jest.restoreAllMocks();
    });

    test('should return 401 error if access token is missing', async () => {
      const videoData = {
        title: 'Test Video',
        description: 'Test Video Description',
        category: categoryId.toString(),
      };

      const res = await request(app)
        .post('/v1/videos')
        .field('title', videoData.title)
        .field('description', videoData.description)
        .field('category', videoData.category)
        .attach('video', testVideoPath);

      expect(res.status).toBe(httpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /v1/videos', () => {
    test('should return 200 and apply the default query options', async () => {
      const res = await request(app)
        .get('/v1/videos')
        .send();

      expect(res.status).toBe(httpStatus.OK);
      expect(res.body).toEqual({
        results: expect.any(Array),
        page: 1,
        limit: 10,
        totalPages: 1,
        totalResults: expect.any(Number),
      });
    });

    test('should correctly apply filter on category field', async () => {
      const res = await request(app)
        .get('/v1/videos')
        .query({ category: categoryId.toString() })
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
      expect(res.body.results[0].category).toBe(categoryId.toString());
    });
  });

  describe('GET /v1/videos/:videoId', () => {
    test('should return 200 and the video object if data is ok', async () => {
      const res = await request(app)
        .get(`/v1/videos/${videoId}`)
        .send();

      expect(res.status).toBe(httpStatus.OK);
      expect(res.body).toMatchObject({
        id: videoId,
        title: 'Test Video',
        description: 'Test Video Description',
        category: categoryId.toString(),
      });
    });

    test('should return 404 error if video is not found', async () => {
      const nonExistentId = mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/v1/videos/${nonExistentId}`)
        .send();

      expect(res.status).toBe(httpStatus.NOT_FOUND);
    });
  });

  describe('PATCH /v1/videos/:videoId', () => {
    test('should return 200 and successfully update video if data is ok', async () => {
      const updateBody = {
        title: 'Updated Video Title',
      };

      const res = await request(app)
        .patch(`/v1/videos/${videoId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(updateBody);

      expect(res.status).toBe(httpStatus.OK);
      expect(res.body).toMatchObject({
        id: videoId,
        title: updateBody.title,
        description: 'Test Video Description',
        category: categoryId.toString(),
      });
    });

    test('should return 401 error if access token is missing', async () => {
      const updateBody = { title: 'New Title' };

      const res = await request(app)
        .patch(`/v1/videos/${videoId}`)
        .send(updateBody);

      expect(res.status).toBe(httpStatus.UNAUTHORIZED);
    });

    test('should return 404 if video is not found', async () => {
      const nonExistentId = mongoose.Types.ObjectId();
      const updateBody = { title: 'New Title' };

      const res = await request(app)
        .patch(`/v1/videos/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(updateBody);

      expect(res.status).toBe(httpStatus.NOT_FOUND);
    });
  });

  describe('DELETE /v1/videos/:videoId', () => {
    test('should return 204 if data is ok', async () => {
      const res = await request(app)
        .delete(`/v1/videos/${videoId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send();

      expect(res.status).toBe(httpStatus.NO_CONTENT);

      // Check that the video was actually deleted
      const dbVideo = await Video.findById(videoId);
      expect(dbVideo).toBeNull();
    });

    test('should return 401 error if access token is missing', async () => {
      const res = await request(app)
        .delete(`/v1/videos/${videoId}`)
        .send();

      expect(res.status).toBe(httpStatus.UNAUTHORIZED);
    });

    test('should return 404 if video is not found', async () => {
      const nonExistentId = mongoose.Types.ObjectId();

      const res = await request(app)
        .delete(`/v1/videos/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send();

      expect(res.status).toBe(httpStatus.NOT_FOUND);
    });
  });
});