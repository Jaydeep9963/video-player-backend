import express from 'express';
import  validate from '../../middleware/validate';
import * as userValidation  from '../../validations/user.validation';
import { createUser, deleteUser, getUser, getUsers, updateUser } from '../../controllers/user.controller';
import { auth } from '../../middleware/auth';

const router = express.Router();

router
  .route('/')
  .post(auth('manageUsers'), validate(userValidation.createUser), createUser)
  .get(auth('getUsers'), validate(userValidation.getUsers), getUsers);

router
  .route('/:userId')
  .get(auth('getUsers'), validate(userValidation.getUser), getUser)
  .patch(auth('manageUsers'), validate(userValidation.updateUser), updateUser)
  .delete(auth('manageUsers'), validate(userValidation.deleteUser), deleteUser);

export default router;