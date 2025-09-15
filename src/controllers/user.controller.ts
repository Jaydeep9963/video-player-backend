import httpStatus from 'http-status';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import  User   from '../models/user.model';

/**
 * Create a user
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<Response>}
 */
export const createUser = async (req: Request, res: Response) => {
  try {
    const user = await User.create(req.body);
    return res.status(httpStatus.CREATED).send(user);
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(httpStatus.BAD_REQUEST).send({ message: error.message });
    }
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ message: 'Error creating user' });
  }
};

/**
 * Get all users
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<Response>}
 */
export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find();
    return res.status(httpStatus.OK).send(users);
  } catch (error) {
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ message: 'Error fetching users' });
  }
};

/**
 * Get user by id
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<Response>}
 */
export const getUser = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(httpStatus.NOT_FOUND).send({ message: 'User not found' });
    }
    return res.status(httpStatus.OK).send(user);
  } catch (error) {
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ message: 'Error fetching user' });
  }
};

/**
 * Update user by id
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<Response>}
 */
export const updateUser = async (req: Request, res: Response) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.userId, req.body, {
      new: true,
      runValidators: true,
    });
    if (!user) {
      return res.status(httpStatus.NOT_FOUND).send({ message: 'User not found' });
    }
    return res.status(httpStatus.OK).send(user);
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(httpStatus.BAD_REQUEST).send({ message: error.message });
    }
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ message: 'Error updating user' });
  }
};

/**
 * Delete user by id
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<Response>}
 */
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const user = await User.findByIdAndDelete(req.params.userId);
    if (!user) {
      return res.status(httpStatus.NOT_FOUND).send({ message: 'User not found' });
    }
    return res.status(httpStatus.NO_CONTENT).send();
  } catch (error) {
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ message: 'Error deleting user' });
  }
};