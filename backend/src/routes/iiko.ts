import { Router, Request, Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { syncAll } from '../services/iiko';
import { query } from '../config/database';

const router = Router();

// Manual sync trigger
router.post('/sync', authenticate, requireRole('owner', 'accountant'), async (req: Request, res: Response): Promise<void> => {
  try {
    const days = Number(req.body.days) || 1;
    await syncAll(days);
    res.json({ success: true, message: `iiko: oxirgi ${days} kun sinxronlashtirildi` });
  } catch (err: any) {
    res.status(500).json({ error: 'iiko sync xatolik', detail: err.message });
  }
});

// Sync logs
router.get('/logs', authenticate, requireRole('owner', 'accountant'), async (_req: Request, res: Response): Promise<void> => {
  const logs = await query(`
    SELECT sync_type, status, records_count, error_message, synced_at
    FROM iiko_sync_logs ORDER BY synced_at DESC LIMIT 20`);
  res.json(logs);
});

// Branch stats from iiko
router.get('/stats', authenticate, requireRole('owner', 'accountant'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { date = new Date().toISOString().split('T')[0] } = req.query;
    const stats = await query(`
      SELECT b.name, k.total_revenue, k.total_orders, k.avg_check,
             k.avg_cooking_time, k.avg_delivery_time, k.date
      FROM branches b
      LEFT JOIN kpi_daily k ON k.branch_id = b.id AND k.date = $1
      WHERE b.is_active = true ORDER BY b.name`, [date]);
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
