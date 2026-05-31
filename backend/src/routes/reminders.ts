import { Router, Request, Response } from 'express';
import { query, queryOne } from '../config/database';
import { authenticate } from '../middleware/auth';

const router = Router();

// Eslatma yaratish
router.post('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, type, remind_at } = req.body;
    if (!title || !remind_at) { res.status(400).json({ error: 'Sarlavha va vaqt kerak' }); return; }

    const [reminder] = await query<any>(`
      INSERT INTO reminders (user_id, title, description, type, remind_at)
      VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user!.id, title, description, type || 'personal', remind_at]);

    res.status(201).json(reminder);
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Eslatmalar ro'yxati
router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const reminders = await query<any>(`
      SELECT * FROM reminders WHERE user_id = $1 AND is_dismissed = false
      ORDER BY remind_at ASC`, [req.user!.id]);
    res.json(reminders);
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Eslatmani bekor qilish
router.patch('/:id/dismiss', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    await query(`UPDATE reminders SET is_dismissed = true WHERE id = $1 AND user_id = $2`, [req.params.id, req.user!.id]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

export default router;
