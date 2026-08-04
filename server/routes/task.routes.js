import { Router } from 'express';
import * as taskService from '../services/task.service.js';
import { asyncHandler, AppError } from '../middleware/error.js';
import { validateBody } from '../middleware/validation.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', asyncHandler(async (req, res) => {
  res.json({ tasks: taskService.listTasks(req.user.id, { status: req.query.status }) });
}));

router.get('/calendar', asyncHandler(async (req, res) => {
  const { start, end } = req.query;
  if (!start || !end) throw new AppError('start and end query params are required (ISO dates)', 422);
  res.json({ days: taskService.getCalendarOccurrences(req.user.id, start, end) });
}));

router.post('/', validateBody({
  name: { required: true, type: 'string', maxLength: 200 },
  recurrenceType: { required: true, type: 'recurrenceType' },
}), asyncHandler(async (req, res) => {
  const task = taskService.createTask(req.user.id, req.body);
  res.status(201).json({ task });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  res.json({ task: taskService.getTask(req.user.id, req.params.id) });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  res.json({ task: taskService.updateTask(req.user.id, req.params.id, req.body) });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  res.json(taskService.deleteTask(req.user.id, req.params.id));
}));

router.post('/:id/pause', asyncHandler(async (req, res) => {
  res.json({ task: taskService.setTaskStatus(req.user.id, req.params.id, 'paused') });
}));

router.post('/:id/resume', asyncHandler(async (req, res) => {
  res.json({ task: taskService.setTaskStatus(req.user.id, req.params.id, 'active') });
}));

router.post('/:id/complete', asyncHandler(async (req, res) => {
  res.json(taskService.completeTask(req.user.id, req.params.id));
}));

router.post('/:id/skip', asyncHandler(async (req, res) => {
  res.json(taskService.skipTask(req.user.id, req.params.id));
}));

router.get('/:id/history', asyncHandler(async (req, res) => {
  res.json({ history: taskService.getCompletionHistory(req.user.id, req.params.id) });
}));

export default router;
