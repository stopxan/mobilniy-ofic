import { Router, Request, Response } from 'express';
import { query, queryOne } from '../config/database';
import { authenticate } from '../middleware/auth';
import { notifyUser } from '../services/notifications';

const router = Router();

// Yetkazib berish ro'yxati
router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { branch_id, status, courier_id, date } = req.query;
    let filter = 'WHERE 1=1';
    const params: any[] = [];
    let idx = 1;

    if (req.user!.role === 'courier') {
      filter += ` AND d.courier_id = $${idx++}`;
      params.push(req.user!.id);
    } else if (req.user!.role === 'manager') {
      filter += ` AND d.branch_id = $${idx++}`;
      params.push(req.user!.branch_id);
    } else if (branch_id) {
      filter += ` AND d.branch_id = $${idx++}`;
      params.push(branch_id);
    }
    if (status) { filter += ` AND d.status = $${idx++}`; params.push(status); }
    if (courier_id) { filter += ` AND d.courier_id = $${idx++}`; params.push(courier_id); }
    if (date) { filter += ` AND DATE(d.created_at) = $${idx++}`; params.push(date); }

    const deliveries = await query<any>(`
      SELECT d.*, u.full_name as courier_name, b.name as branch_name
      FROM deliveries d
      LEFT JOIN users u ON u.id = d.courier_id
      JOIN branches b ON b.id = d.branch_id
      ${filter} ORDER BY d.created_at DESC LIMIT 100`, params);

    res.json(deliveries);
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Kuryer statistikasi
router.get('/courier-stats', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { branch_id, date_from, date_to } = req.query;
    const from = date_from || new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const to = date_to || new Date().toISOString().split('T')[0];

    const filter = branch_id ? `AND d.branch_id = '${branch_id}'` : '';

    const stats = await query<any>(`
      SELECT u.id, u.full_name,
             COUNT(*) as total_deliveries,
             COUNT(*) FILTER(WHERE d.status = 'delivered') as completed,
             COALESCE(AVG(d.actual_time), 0) as avg_time,
             MIN(d.actual_time) as fastest_time
      FROM deliveries d JOIN users u ON u.id = d.courier_id
      WHERE DATE(d.created_at) BETWEEN $1 AND $2 ${filter}
      GROUP BY u.id, u.full_name
      ORDER BY completed DESC`, [from, to]);

    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Status yangilash (kuryer uchun)
router.patch('/:id/status', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.body;
    const validStatuses = ['picked_up', 'on_way', 'delivered', 'returned'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: 'Noto\'g\'ri status' }); return;
    }

    const delivery = await queryOne<any>(`SELECT * FROM deliveries WHERE id = $1`, [req.params.id]);
    if (!delivery) { res.status(404).json({ error: 'Topilmadi' }); return; }

    if (req.user!.role === 'courier' && delivery.courier_id !== req.user!.id) {
      res.status(403).json({ error: 'Ruxsat yo\'q' }); return;
    }

    let timeField = '';
    if (status === 'picked_up') timeField = ', picked_up_at = NOW()';
    if (status === 'delivered') {
      timeField = ', delivered_at = NOW(), actual_time = EXTRACT(EPOCH FROM (NOW() - assigned_at))/60';
    }

    const [updated] = await query<any>(`
      UPDATE deliveries SET status = $1 ${timeField}, updated_at = NOW()
      WHERE id = $2 RETURNING *`, [status, req.params.id]);

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

export default router;
