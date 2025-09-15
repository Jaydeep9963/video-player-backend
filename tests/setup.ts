import mongoose from 'mongoose';
import config from '../src/config/config';

beforeAll(async () => {
  await mongoose.connect(config.mongoose.url);
});

afterAll(async () => {
  await mongoose.disconnect();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});