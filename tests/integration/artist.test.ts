import request from 'supertest';
import mongoose from 'mongoose';
import httpStatus from 'http-status';
import app from '../../src/app';
import setupTestDB from '../utils/setupTestDB';
import { Artist } from '../../src/models/artist.model';
import { userOne, admin, insertUsers } from '../fixtures/user.fixture';
import { userOneAccessToken, adminAccessToken } from '../fixtures/token.fixture';

setupTestDB();

describe('Artist routes', () => {
  let newArtist: Record<string, any>;

  beforeEach(async () => {
    await insertUsers([admin]);
    newArtist = {
      name: 'Test Artist',
      bio: 'Test Artist Bio',
      profileImage: 'https://example.com/image.jpg',
      socialLinks: {
        instagram: 'https://instagram.com/testartist',
        twitter: 'https://twitter.com/testartist',
        youtube: 'https://youtube.com/testartist'
      }
    };
  });

  describe('POST /v1/artists', () => {
    test('should return 201 and successfully create artist if data is ok', async () => {
      const res = await request(app)
        .post('/v1/artists')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(newArtist)
        .expect(httpStatus.CREATED);

      expect(res.body).toEqual({
        id: expect.anything(),
        name: newArtist.name,
        bio: newArtist.bio,
        profileImage: newArtist.profileImage,
        socialLinks: newArtist.socialLinks,
        createdAt: expect.anything(),
        updatedAt: expect.anything(),
      });

      const dbArtist = await Artist.findById(res.body.id);
      expect(dbArtist).toBeDefined();
      expect(dbArtist).toMatchObject({
        name: newArtist.name,
        bio: newArtist.bio,
        profileImage: newArtist.profileImage,
        socialLinks: newArtist.socialLinks,
      });
    });

    test('should return 401 error if access token is missing', async () => {
      await request(app)
        .post('/v1/artists')
        .send(newArtist)
        .expect(httpStatus.UNAUTHORIZED);
    });

    test('should return 403 error if user is not admin', async () => {
      await insertUsers([userOne]);

      await request(app)
        .post('/v1/artists')
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send(newArtist)
        .expect(httpStatus.FORBIDDEN);
    });

    test('should return 400 error if name is invalid', async () => {
      newArtist.name = '';

      await request(app)
        .post('/v1/artists')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(newArtist)
        .expect(httpStatus.BAD_REQUEST);
    });
  });

  describe('GET /v1/artists', () => {
    test('should return 200 and apply the default query options', async () => {
      await insertUsers([userOne]);
      await Artist.insertMany([newArtist]);

      const res = await request(app)
        .get('/v1/artists')
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
        name: newArtist.name,
        bio: newArtist.bio,
        profileImage: newArtist.profileImage,
        socialLinks: newArtist.socialLinks,
        createdAt: expect.anything(),
        updatedAt: expect.anything(),
      });
    });

    test('should return 401 if access token is missing', async () => {
      await request(app)
        .get('/v1/artists')
        .send()
        .expect(httpStatus.UNAUTHORIZED);
    });

    test('should correctly apply filter on name field', async () => {
      await insertUsers([userOne]);
      await Artist.insertMany([
        newArtist,
        { name: 'Another Artist', bio: 'Another Bio', profileImage: 'https://example.com/another.jpg' },
      ]);

      const res = await request(app)
        .get('/v1/artists')
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .query({ name: newArtist.name })
        .send()
        .expect(httpStatus.OK);

      expect(res.body.results).toHaveLength(1);
      expect(res.body.results[0].name).toBe(newArtist.name);
    });

    test('should correctly sort the returned array if descending sort param is specified', async () => {
      await insertUsers([userOne]);
      await Artist.insertMany([
        newArtist,
        {
          name: 'Artist B',
          bio: 'Bio B',
          profileImage: 'https://example.com/b.jpg',
          createdAt: new Date(2020, 1, 15),
        },
      ]);

      const res = await request(app)
        .get('/v1/artists')
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .query({ sortBy: 'name:desc' })
        .send()
        .expect(httpStatus.OK);

      expect(res.body.results).toHaveLength(2);
      expect(res.body.results[0].name).toBe('Test Artist');
      expect(res.body.results[1].name).toBe('Artist B');
    });

    test('should correctly apply pagination', async () => {
      await insertUsers([userOne]);
      await Artist.insertMany([
        newArtist,
        { name: 'Artist B', bio: 'Bio B', profileImage: 'https://example.com/b.jpg' },
        { name: 'Artist C', bio: 'Bio C', profileImage: 'https://example.com/c.jpg' },
      ]);

      const res = await request(app)
        .get('/v1/artists')
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .query({ page: 2, limit: 1 })
        .send()
        .expect(httpStatus.OK);

      expect(res.body.results).toHaveLength(1);
      expect(res.body.page).toBe(2);
      expect(res.body.limit).toBe(1);
      expect(res.body.totalPages).toBe(3);
    });
  });

  describe('GET /v1/artists/:artistId', () => {
    test('should return 200 and the artist object if data is ok', async () => {
      await insertUsers([userOne]);
      const artist = await Artist.create(newArtist);

      const res = await request(app)
        .get(`/v1/artists/${artist._id}`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send()
        .expect(httpStatus.OK);

      expect(res.body).toEqual({
        id: artist._id.toString(),
        name: artist.name,
        bio: artist.bio,
        profileImage: artist.profileImage,
        socialLinks: artist.socialLinks,
        createdAt: artist.createdAt.toISOString(),
        updatedAt: artist.updatedAt.toISOString(),
      });
    });

    test('should return 401 error if access token is missing', async () => {
      const artist = await Artist.create(newArtist);

      await request(app)
        .get(`/v1/artists/${artist._id}`)
        .send()
        .expect(httpStatus.UNAUTHORIZED);
    });

    test('should return 404 error if artist is not found', async () => {
      await insertUsers([userOne]);

      await request(app)
        .get(`/v1/artists/${mongoose.Types.ObjectId()}`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send()
        .expect(httpStatus.NOT_FOUND);
    });
  });

  describe('PATCH /v1/artists/:artistId', () => {
    test('should return 200 and successfully update artist if data is ok', async () => {
      await insertUsers([admin]);
      const artist = await Artist.create(newArtist);
      const updateBody = {
        name: 'Updated Artist',
        bio: 'Updated Bio',
      };

      const res = await request(app)
        .patch(`/v1/artists/${artist._id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(updateBody)
        .expect(httpStatus.OK);

      expect(res.body).toEqual({
        id: artist._id.toString(),
        name: updateBody.name,
        bio: updateBody.bio,
        profileImage: artist.profileImage,
        socialLinks: artist.socialLinks,
        createdAt: expect.anything(),
        updatedAt: expect.anything(),
      });

      const dbArtist = await Artist.findById(artist._id);
      expect(dbArtist).toBeDefined();
      expect(dbArtist).toMatchObject({
        name: updateBody.name,
        bio: updateBody.bio,
        profileImage: artist.profileImage,
        socialLinks: artist.socialLinks,
      });
    });

    test('should return 401 error if access token is missing', async () => {
      const artist = await Artist.create(newArtist);
      const updateBody = { name: 'Updated Artist' };

      await request(app)
        .patch(`/v1/artists/${artist._id}`)
        .send(updateBody)
        .expect(httpStatus.UNAUTHORIZED);
    });

    test('should return 403 error if user is not admin', async () => {
      await insertUsers([userOne]);
      const artist = await Artist.create(newArtist);
      const updateBody = { name: 'Updated Artist' };

      await request(app)
        .patch(`/v1/artists/${artist._id}`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send(updateBody)
        .expect(httpStatus.FORBIDDEN);
    });

    test('should return 404 error if artist is not found', async () => {
      await insertUsers([admin]);
      const updateBody = { name: 'Updated Artist' };

      await request(app)
        .patch(`/v1/artists/${mongoose.Types.ObjectId()}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(updateBody)
        .expect(httpStatus.NOT_FOUND);
    });

    test('should return 400 error if name is invalid', async () => {
      await insertUsers([admin]);
      const artist = await Artist.create(newArtist);
      const updateBody = { name: '' };

      await request(app)
        .patch(`/v1/artists/${artist._id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(updateBody)
        .expect(httpStatus.BAD_REQUEST);
    });
  });

  describe('DELETE /v1/artists/:artistId', () => {
    test('should return 204 if data is ok', async () => {
      await insertUsers([admin]);
      const artist = await Artist.create(newArtist);

      await request(app)
        .delete(`/v1/artists/${artist._id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send()
        .expect(httpStatus.NO_CONTENT);

      const dbArtist = await Artist.findById(artist._id);
      expect(dbArtist).toBeNull();
    });

    test('should return 401 error if access token is missing', async () => {
      const artist = await Artist.create(newArtist);

      await request(app)
        .delete(`/v1/artists/${artist._id}`)
        .send()
        .expect(httpStatus.UNAUTHORIZED);
    });

    test('should return 403 error if user is not admin', async () => {
      await insertUsers([userOne]);
      const artist = await Artist.create(newArtist);

      await request(app)
        .delete(`/v1/artists/${artist._id}`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send()
        .expect(httpStatus.FORBIDDEN);
    });

    test('should return 404 error if artist is not found', async () => {
      await insertUsers([admin]);

      await request(app)
        .delete(`/v1/artists/${mongoose.Types.ObjectId()}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send()
        .expect(httpStatus.NOT_FOUND);
    });
  });
});