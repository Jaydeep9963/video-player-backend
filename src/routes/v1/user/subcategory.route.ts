import express from 'express';
import validate from '../../../middleware/validate';
import * as subcategoryValidation from '../../../validations/subcategory.validation';
import { getSubcategories, getSubcategoriesByCategory, getSubcategory } from '../../../controllers/subcategory.controller';

const router = express.Router();

// User routes without authentication (read-only access)
router
  .route('/')
  .get(validate(subcategoryValidation.getSubcategories), getSubcategories);

router
  .route('/:subcategoryId')
  .get(validate(subcategoryValidation.getSubcategory), getSubcategory);

router
  .route('/category/:categoryId')
  .get(validate(subcategoryValidation.getSubcategoriesByCategory), getSubcategoriesByCategory);

export default router;