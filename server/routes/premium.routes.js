import { Router } from 'express';
import * as premiumService from '../services/premium.service.js';
import { asyncHandler } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/status', asyncHandler(async (req, res) => {
  res.json(premiumService.getPremiumStatus(req.user.id));
}));

router.post('/watch-ad', asyncHandler(async (req, res) => {
  res.json(premiumService.watchRewardedAd(req.user.id));
}));

router.post('/subscribe', asyncHandler(async (req, res) => {
  res.json(premiumService.subscribe(req.user.id, req.body.plan));
}));

export default router;
