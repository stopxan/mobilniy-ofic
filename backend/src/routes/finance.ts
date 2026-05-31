import { Router, Request, Response } from 'express';
import { query, queryOne } from '../config/database';
import { authenticate, requireRole } from '../middleware/auth';
import multer from 'multer';

const router = Router();
const upload = multer({ dest: process.env.UPLOAD_DIR || './uploads' });

// Daromad qo'shish
router.post('/revenues', authenticate, requireRole('owner', 'manager', 'cashier'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { branch_id, amount, source, aggregator, notes, date } = req.body;
    if (!branch_id || !amount) { res.status(400).json({ error: 'Filial va summa kerak' }); return; }

    if (req.user!.role !== 'owner' && req.user!.branch_id !== branch_id) {
      res.status(403).json({ error: 'Ruxsat yo\'q' }); return;
    }

    const [revenue] = await query<any>(`
      INSERT INTO revenues (branch_id, amount, source, aggregator, recorded_by, date, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [branch_id, amount, source || 'cash', aggregator, req.user!.id, date || 'today', notes]);

    res.status(201).json(revenue);
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi', detail: err.message });
  }
});

// Xarajat qo'shish
router.post('/expenses', authenticate, upload.fields([{ name: 'receipt', maxCount: 1 }, { name: 'document', maxCount: 1 }]), async (req: Request, res: Response): Promise<void> => {
  try {
    const { branch_id, category, amount, description, date } = req.body;
    if (!branch_id || !amount || !category || !description) {
      res.status(400).json({ error: 'Barcha maydonlar kerak' }); return;
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const receiptUrl = files?.receipt?.[0] ? `/uploads/${files.receipt[0].filename}` : null;
    const documentUrl = files?.document?.[0] ? `/uploads/${files.document[0].filename}` : null;

    const [expense] = await query<any>(`
      INSERT INTO expenses (branch_id, category, amount, description, receipt_url, document_url, recorded_by, date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [branch_id, category, amount, description, receiptUrl, documentUrl, req.user!.id, date || 'today']);

    res.status(201).json(expense);
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi', detail: err.message });
  }
});

// Daromad ro'yxati
router.get('/revenues', authenticate, requireRole('owner', 'accountant'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { branch_id, date_from, date_to, source } = req.query;
    let filter = 'WHERE 1=1';
    const params: any[] = [];
    let idx = 1;

    if (branch_id) { filter += ` AND r.branch_id = $${idx++}`; params.push(branch_id); }
    if (date_from) { filter += ` AND r.date >= $${idx++}`; params.push(date_from); }
    if (date_to) { filter += ` AND r.date <= $${idx++}`; params.push(date_to); }
    if (source) { filter += ` AND r.source = $${idx++}`; params.push(source); }

    const revenues = await query<any>(`
      SELECT r.*, b.name as branch_name, u.full_name as recorded_by_name
      FROM revenues r JOIN branches b ON b.id = r.branch_id
      LEFT JOIN users u ON u.id = r.recorded_by
      ${filter} ORDER BY r.date DESC, r.created_at DESC`, params);

    const total = await queryOne<any>(`SELECT SUM(amount) as total FROM revenues r ${filter}`, params);

    res.json({ data: revenues, total: Number(total?.total || 0) });
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Xarajat ro'yxati
router.get('/expenses', authenticate, requireRole('owner', 'accountant'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { branch_id, date_from, date_to, category } = req.query;
    let filter = 'WHERE 1=1';
    const params: any[] = [];
    let idx = 1;

    if (branch_id) { filter += ` AND e.branch_id = $${idx++}`; params.push(branch_id); }
    if (date_from) { filter += ` AND e.date >= $${idx++}`; params.push(date_from); }
    if (date_to) { filter += ` AND e.date <= $${idx++}`; params.push(date_to); }
    if (category) { filter += ` AND e.category = $${idx++}`; params.push(category); }

    const expenses = await query<any>(`
      SELECT e.*, b.name as branch_name, u.full_name as recorded_by_name
      FROM expenses e JOIN branches b ON b.id = e.branch_id
      LEFT JOIN users u ON u.id = e.recorded_by
      ${filter} ORDER BY e.date DESC, e.created_at DESC`, params);

    const stats = await query<any>(`
      SELECT category, SUM(amount) as total
      FROM expenses e ${filter}
      GROUP BY category ORDER BY total DESC`, params);

    res.json({ data: expenses, by_category: stats });
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Moliyaviy hisobot (oylik)
router.get('/report', authenticate, requireRole('owner', 'accountant'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { month, year } = req.query;
    const m = month || new Date().getMonth() + 1;
    const y = year || new Date().getFullYear();

    const data = await query<any>(`
      SELECT b.id, b.name as branch_name,
             COALESCE(r.total_revenue, 0) as total_revenue,
             COALESCE(e.total_expenses, 0) as total_expenses,
             COALESCE(r.total_revenue, 0) - COALESCE(e.total_expenses, 0) as profit
      FROM branches b
      LEFT JOIN (
        SELECT branch_id, SUM(amount) as total_revenue FROM revenues
        WHERE EXTRACT(MONTH FROM date) = $1 AND EXTRACT(YEAR FROM date) = $2
        GROUP BY branch_id
      ) r ON r.branch_id = b.id
      LEFT JOIN (
        SELECT branch_id, SUM(amount) as total_expenses FROM expenses
        WHERE EXTRACT(MONTH FROM date) = $1 AND EXTRACT(YEAR FROM date) = $2
        GROUP BY branch_id
      ) e ON e.branch_id = b.id
      WHERE b.is_active = true ORDER BY b.name`, [m, y]);

    res.json({ month: m, year: y, branches: data });
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Aggregator to'lovlar
router.get('/aggregators', authenticate, requireRole('owner', 'accountant'), async (req: Request, res: Response): Promise<void> => {
  try {
    const aggregators = await query<any>(`
      SELECT ap.*, b.name as branch_name
      FROM aggregator_payments ap JOIN branches b ON b.id = ap.branch_id
      ORDER BY ap.expected_date DESC`);
    res.json(aggregators);
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

export default router;
