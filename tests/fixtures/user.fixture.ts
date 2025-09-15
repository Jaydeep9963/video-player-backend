import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../../src/models/user.model';

const password = 'password1';
const salt = bcrypt.genSaltSync(8);
const hashedPassword = bcrypt.hashSync(password, salt);

export const userOne = {
  _id: mongoose.Types.ObjectId(),
  name: 'John Doe',
  email: 'john@example.com',
  password,
  role: 'user',
  isEmailVerified: false,
};

export const userTwo = {
  _id: mongoose.Types.ObjectId(),
  name: 'Jane Doe',
  email: 'jane@example.com',
  password,
  role: 'user',
  isEmailVerified: false,
};

export const admin = {
  _id: mongoose.Types.ObjectId(),
  name: 'Admin User',
  email: 'admin@example.com',
  password,
  role: 'admin',
  isEmailVerified: true,
};

export const insertUsers = async (users: Record<string, any>[]) => {
  await User.insertMany(users.map(user => ({ ...user, password: hashedPassword })));
};