import { Router } from 'express';
import PDFDocument from 'pdfkit';
import * as insightsService from '../services/insights.service.js';
import * as achievementService from '../services/achievement.service.js';
import { asyncHandler } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', asyncHandler(async (req, res) => {
  res.json(insightsService.getInsightsSummary(req.user.id));
}));

router.get('/achievements', asyncHandler(async (req, res) => {
  res.json({ achievements: achievementService.listAchievements(req.user.id) });
}));

router.get('/export.csv', asyncHandler(async (req, res) => {
  const rows = insightsService.getCompletionHistoryForExport(req.user.id);
  const header = 'task_name,occurrence_date,completed_at\n';
  const body = rows
    .map((r) => `"${r.task_name.replace(/"/g, '""')}",${r.occurrence_date},${r.completed_at}`)
    .join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="routism-history.csv"');
  res.send(header + body);
}));

router.get('/export.pdf', asyncHandler(async (req, res) => {
  const rows = insightsService.getCompletionHistoryForExport(req.user.id);
  const summary = insightsService.getInsightsSummary(req.user.id);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="routism-insights.pdf"');

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);

  doc.fontSize(20).text('Routism Insights', { align: 'left' });
  doc.moveDown();
  doc.fontSize(12).text(`Weekly completion rate: ${summary.hasData ? summary.completionRate + '%' : 'No data yet'}`);
  if (summary.hasData) {
    doc.text(`Current streak: ${summary.currentStreak} days`);
    doc.text(`Most consistent routine: ${summary.mostConsistentRoutine || '—'}`);
  }
  doc.moveDown();
  doc.fontSize(14).text('Completion history');
  doc.moveDown(0.5);

  rows.slice(0, 200).forEach((r) => {
    doc.fontSize(10).text(`${r.occurrence_date}  —  ${r.task_name}`);
  });

  doc.end();
}));

export default router;
