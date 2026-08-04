import { Router } from 'express';
import * as settingsService from '../services/settings.service.js';
import { asyncHandler } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', asyncHandler(async (req, res) => {
  const user = settingsService.updatePreferences(req.user.id, {});
  res.json({
    user,
    availableThemes: settingsService.AVAILABLE_THEMES,
    availableTimeFormats: settingsService.AVAILABLE_TIME_FORMATS,
  });
}));

router.put('/profile', asyncHandler(async (req, res) => {
  res.json({ user: settingsService.updateProfile(req.user.id, req.body) });
}));

router.put('/preferences', asyncHandler(async (req, res) => {
  res.json({ user: settingsService.updatePreferences(req.user.id, req.body) });
}));

router.delete('/account', asyncHandler(async (req, res) => {
  res.json(settingsService.deleteAccount(req.user.id));
}));

export default router;
