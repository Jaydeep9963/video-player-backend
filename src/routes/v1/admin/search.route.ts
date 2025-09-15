import express from 'express';
import { searchContent } from '../../../controllers/search.controller';
import { auth } from '../../../middleware/auth';

const router = express.Router();

// Admin search route with authentication
router.route('/').get(auth('getVideos'), searchContent);

export default router;