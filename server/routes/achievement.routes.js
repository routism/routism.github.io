import { Router } from 'express';
import * as achievementService from '../services/achievement.service.js';
import { asyncHandler } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', asyncHandler(async (req, res) => {
  res.json({ achievements: achievementService.listAchievements(req.user.id) });
}));

export default router;
