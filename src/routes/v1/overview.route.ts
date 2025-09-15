import express from 'express';
import { getOverview } from '../../controllers/overview.controller';
import { auth } from '../../middleware/auth';

const router = express.Router();

// Only admin can access overview statistics
router.route('/').get(auth('getOverview'), getOverview);

export default router;