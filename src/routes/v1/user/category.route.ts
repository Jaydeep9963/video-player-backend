import express from 'express';
import validate from '../../../middleware/validate';
import * as categoryValidation from '../../../validations/category.validation';
import { getCategories, getCategory } from '../../../controllers/category.controller';

const router = express.Router();

// User routes without authentication (read-only access)
router
  .route('/')
  .get(validate(categoryValidation.getCategories), getCategories);

router
  .route('/:categoryId')
  .get(validate(categoryValidation.getCategory), getCategory);

export default router;