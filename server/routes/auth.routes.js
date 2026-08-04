import { Router } from 'express';
import * as authService from '../services/auth.service.js';
import { asyncHandler } from '../middleware/error.js';
import { validateBody } from '../middleware/validation.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/signup', validateBody({
  email: { required: true, type: 'email' },
  password: { required: true, type: 'password' },
  name: { type: 'string', maxLength: 100 },
}), asyncHandler(async (req, res) => {
  const result = authService.signup(req.body);
  res.status(201).json(result);
}));

router.post('/login', validateBody({
  email: { required: true, type: 'email' },
  password: { required: true, type: 'string' },
}), asyncHandler(async (req, res) => {
  const result = authService.login(req.body);
  res.json(result);
}));

router.post('/verify-email', validateBody({
  token: { required: true, type: 'string' },
}), asyncHandler(async (req, res) => {
  res.json(authService.verifyEmail(req.body.token));
}));

router.post('/forgot-password', validateBody({
  email: { required: true, type: 'email' },
}), asyncHandler(async (req, res) => {
  const { resetToken } = authService.requestPasswordReset(req.body.email);
  // resetToken is only surfaced here because there's no email transport wired up yet;
  // in production this should be emailed to the user, not returned in the response.
  res.json({ message: 'If that email exists, a reset link has been generated.', resetToken });
}));

router.post('/reset-password', validateBody({
  token: { required: true, type: 'string' },
  newPassword: { required: true, type: 'password' },
}), asyncHandler(async (req, res) => {
  res.json(authService.resetPassword(req.body));
}));

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  res.json({ user: authService.getUserById(req.user.id) });
}));

export default router;
