import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { query, queryOne } from '../config/database';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// Barcha xodimlar
router.get('/', authenticate, requireRole('owner', 'accountant', 'manager'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { branch_id, role } = req.query;
    let filter = 'WHERE u.is_active = true';
    const params: any[] = [];
    let idx = 1;

    if (req.user!.role === 'manager') {
      filter += ` AND u.branch_id = $${idx++}`;
      params.push(req.user!.branch_id);
    } else if (branch_id) {
      filter += ` AND u.branch_id = $${idx++}`;
      params.push(branch_id);
    }
    if (role) { filter += ` AND u.role = $${idx++}`; params.push(role); }

    const users = await query<any>(`
      SELECT u.id, u.full_name, u.phone, u.email, u.role,
             u.branch_id, b.name as branch_name, u.telegram_username,
             u.avatar_url, u.last_login, u.created_at
      FROM users u LEFT JOIN branches b ON b.id = u.branch_id
      ${filter} ORDER BY u.role, u.full_name`, params);

    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Yangi xodim qo'shish
router.post('/', authenticate, requireRole('owner'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { full_name, phone, email, password, role, branch_id } = req.body;
    if (!full_name || !phone || !password || !role) {
      res.status(400).json({ error: 'Barcha maydonlar kerak' }); return;
    }

    const exists = await queryOne<any>(`SELECT id FROM users WHERE phone = $1`, [phone]);
    if (exists) { res.status(409).json({ error: 'Bu telefon allaqachon mavjud' }); return; }

    const hash = await bcrypt.hash(password, 12);
    const [user] = await query<any>(`
      INSERT INTO users (full_name, phone, email, password_hash, role, branch_id)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, full_name, phone, role, branch_id, created_at`,
      [full_name, phone, email, hash, role, branch_id]);

    res.status(201).json(user);
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi', detail: err.message });
  }
});

// Xodimni o'chirish (deaktivatsiya)
router.delete('/:id', authenticate, requireRole('owner'), async (req: Request, res: Response): Promise<void> => {
  try {
    await query(`UPDATE users SET is_active = false WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Davomiylik ro'yxati
router.get('/attendance', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { branch_id, date_from, date_to, user_id } = req.query;
    let filter = 'WHERE 1=1';
    const params: any[] = [];
    let idx = 1;

    if (req.user!.role === 'manager') {
      filter += ` AND a.branch_id = $${idx++}`;
      params.push(req.user!.branch_id);
    } else if (branch_id) {
      filter += ` AND a.branch_id = $${idx++}`;
      params.push(branch_id);
    }
    if (user_id) { filter += ` AND a.user_id = $${idx++}`; params.push(user_id); }
    if (date_from) { filter += ` AND DATE(a.check_in) >= $${idx++}`; params.push(date_from); }
    if (date_to) { filter += ` AND DATE(a.check_in) <= $${idx++}`; params.push(date_to); }

    const records = await query<any>(`
      SELECT a.*, u.full_name, u.role, b.name as branch_name,
             EXTRACT(EPOCH FROM (COALESCE(a.check_out, NOW()) - a.check_in))/3600 as hours_worked
      FROM attendance a JOIN users u ON u.id = a.user_id
      JOIN branches b ON b.id = a.branch_id
      ${filter} ORDER BY a.check_in DESC`, params);

    res.json(records);
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Keldi belgilash
router.post('/attendance/check-in', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const branchId = req.body.branch_id || req.user!.branch_id;
    if (!branchId) { res.status(400).json({ error: 'Filial kerak' }); return; }

    const existing = await queryOne<any>(`
      SELECT id FROM attendance WHERE user_id = $1 AND DATE(check_in) = CURRENT_DATE AND check_out IS NULL`,
      [req.user!.id]);
    if (existing) { res.status(409).json({ error: 'Allaqachon keldi belgilangan' }); return; }

    const [record] = await query<any>(`
      INSERT INTO attendance (user_id, branch_id, check_in) VALUES ($1, $2, NOW()) RETURNING *`,
      [req.user!.id, branchId]);

    res.status(201).json(record);
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Ketdi belgilash
router.post('/attendance/check-out', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const [record] = await query<any>(`
      UPDATE attendance SET check_out = NOW()
      WHERE user_id = $1 AND DATE(check_in) = CURRENT_DATE AND check_out IS NULL
      RETURNING *`, [req.user!.id]);

    if (!record) { res.status(404).json({ error: 'Aktiv sessiya topilmadi' }); return; }
    res.json(record);
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

export default router;
