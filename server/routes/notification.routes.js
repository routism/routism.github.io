import { Router } from 'express';
import * as notificationService from '../services/notification.service.js';
import { asyncHandler } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: notificationService.getPublicVapidKey() });
});

router.post('/subscribe', requireAuth, asyncHandler(async (req, res) => {
  res.json(notificationService.saveSubscription(req.user.id, req.body.subscription));
}));

router.post('/unsubscribe', requireAuth, asyncHandler(async (req, res) => {
  res.json(notificationService.removeSubscription(req.body.endpoint));
}));

export default router;
