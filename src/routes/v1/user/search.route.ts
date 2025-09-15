import express from 'express';
import { searchContent } from '../../../controllers/search.controller';

const router = express.Router();

// User search route without authentication
router.route('/').get(searchContent);

export default router;