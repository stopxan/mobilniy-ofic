import { Router, Request, Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { askAI, generateDailySummary } from '../services/ai';
import { query } from '../config/database';

const router = Router();

// AI ga savol berish
router.post('/ask', authenticate, requireRole('owner'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { question } = req.body;
    if (!question?.trim()) { res.status(400).json({ error: 'Savol kerak' }); return; }

    const answer = await askAI(req.user!.id, question);
    res.json({ question, answer });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server xatosi' });
  }
});

// Kunlik hisobot generatsiya qilish
router.post('/daily-summary', authenticate, requireRole('owner'), async (req: Request, res: Response): Promise<void> => {
  try {
    const summary = await generateDailySummary();
    res.json({ summary });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server xatosi' });
  }
});

// Suhbat tarixi
router.get('/conversations', authenticate, requireRole('owner'), async (req: Request, res: Response): Promise<void> => {
  try {
    const conversations = await query<any>(`
      SELECT * FROM ai_conversations WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.user!.id]);
    res.json(conversations);
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// AI hisobotlari tarixi
router.get('/reports', authenticate, requireRole('owner'), async (req: Request, res: Response): Promise<void> => {
  try {
    const reports = await query<any>(`SELECT * FROM ai_reports ORDER BY generated_at DESC LIMIT 30`);
    res.json(reports);
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

export default router;
