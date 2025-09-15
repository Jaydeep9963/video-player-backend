import express from 'express';
import  validate  from '../../middleware/validate';
import * as  contentValidation  from '../../validations/content.validation';
import { createOrUpdateContent, deleteContent, getAllContent, getContentByType } from '../../controllers/content.controller';
import { auth } from '../../middleware/auth';

const router = express.Router();

router
  .route('/')
  .post(auth('manageContent'), validate(contentValidation.createContent), createOrUpdateContent)
  .get(getAllContent);

router
  .route('/:type')
  .get(validate(contentValidation.getContent), getContentByType)
  .delete(auth('manageContent'), validate(contentValidation.deleteContent), deleteContent);

export default router;