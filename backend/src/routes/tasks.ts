import { Router, Request, Response } from 'express';
import { query, queryOne } from '../config/database';
import { authenticate, requireRole } from '../middleware/auth';
import { notifyUser } from '../services/notifications';
import multer from 'multer';
import path from 'path';

const router = Router();

const upload = multer({
  dest: process.env.UPLOAD_DIR || './uploads',
  limits: { fileSize: Number(process.env.MAX_FILE_SIZE) || 10485760 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Faqat rasm fayllari qabul qilinadi'));
    }
  },
});

// Barcha vazifalar ro'yxati
router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, branch_id, assigned_to, priority, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let filter = `WHERE 1=1`;
    const params: any[] = [];
    let pIdx = 1;

    if (req.user!.role === 'manager' || req.user!.role === 'courier') {
      filter += ` AND (t.branch_id = $${pIdx} OR t.assigned_to = $${pIdx + 1})`;
      params.push(req.user!.branch_id, req.user!.id);
      pIdx += 2;
    } else if (branch_id) {
      filter += ` AND t.branch_id = $${pIdx}`;
      params.push(branch_id);
      pIdx++;
    }

    if (status) { filter += ` AND t.status = $${pIdx}`; params.push(status); pIdx++; }
    if (assigned_to) { filter += ` AND t.assigned_to = $${pIdx}`; params.push(assigned_to); pIdx++; }
    if (priority) { filter += ` AND t.priority = $${pIdx}`; params.push(priority); pIdx++; }

    const tasks = await query<any>(`
      SELECT t.*,
             u.full_name as assigned_name,
             c.full_name as created_by_name,
             b.name as branch_name,
             (SELECT COUNT(*) FROM task_photos WHERE task_id = t.id) as photo_count,
             (SELECT COUNT(*) FROM task_comments WHERE task_id = t.id) as comment_count
      FROM tasks t
      LEFT JOIN users u ON u.id = t.assigned_to
      LEFT JOIN users c ON c.id = t.created_by
      LEFT JOIN branches b ON b.id = t.branch_id
      ${filter}
      ORDER BY
        CASE t.status WHEN 'overdue' THEN 0 WHEN 'in_progress' THEN 1 WHEN 'new' THEN 2 ELSE 3 END,
        t.due_date ASC NULLS LAST
      LIMIT $${pIdx} OFFSET $${pIdx + 1}`, [...params, Number(limit), offset]);

    const countRow = await queryOne<any>(`SELECT COUNT(*) as total FROM tasks t ${filter}`, params);

    res.json({ data: tasks, total: Number(countRow?.total || 0), page: Number(page), limit: Number(limit) });
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi', detail: err.message });
  }
});

// Yangi vazifa yaratish
router.post('/', authenticate, requireRole('owner', 'manager'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, assigned_to, branch_id, priority, due_date, requires_photo } = req.body;

    if (!title) { res.status(400).json({ error: 'Sarlavha kerak' }); return; }

    const [task] = await query<any>(`
      INSERT INTO tasks (title, description, created_by, assigned_to, branch_id, priority, due_date, requires_photo)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`, [title, description, req.user!.id, assigned_to, branch_id, priority || 'normal', due_date, requires_photo || false]);

    if (assigned_to) {
      await notifyUser(assigned_to, 'task_new', `Yangi vazifa: ${title}`, `Sizga yangi vazifa tayinlandi`, { task_id: task.id });
    }

    res.status(201).json(task);
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi', detail: err.message });
  }
});

// Vazifa ma'lumotlari
router.get('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const task = await queryOne<any>(`
      SELECT t.*, u.full_name as assigned_name, c.full_name as created_by_name, b.name as branch_name
      FROM tasks t
      LEFT JOIN users u ON u.id = t.assigned_to
      LEFT JOIN users c ON c.id = t.created_by
      LEFT JOIN branches b ON b.id = t.branch_id
      WHERE t.id = $1`, [req.params.id]);

    if (!task) { res.status(404).json({ error: 'Vazifa topilmadi' }); return; }

    const [photos, comments] = await Promise.all([
      query<any>(`SELECT p.*, u.full_name FROM task_photos p JOIN users u ON u.id = p.uploaded_by WHERE p.task_id = $1 ORDER BY p.created_at`, [task.id]),
      query<any>(`SELECT c.*, u.full_name, u.avatar_url FROM task_comments c JOIN users u ON u.id = c.user_id WHERE c.task_id = $1 ORDER BY c.created_at`, [task.id]),
    ]);

    res.json({ ...task, photos, comments });
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Vazifa statusini o'zgartirish
router.patch('/:id/status', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.body;
    const validStatuses = ['new', 'in_progress', 'done', 'cancelled'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: 'Noto\'g\'ri status' });
      return;
    }

    const completedAt = status === 'done' ? 'NOW()' : 'NULL';
    const [task] = await query<any>(`
      UPDATE tasks SET status = $1, completed_at = ${completedAt}, updated_at = NOW()
      WHERE id = $2 RETURNING *`, [status, req.params.id]);

    if (!task) { res.status(404).json({ error: 'Vazifa topilmadi' }); return; }

    if (status === 'done') {
      await notifyUser(task.created_by, 'task_done', `Vazifa bajarildi: ${task.title}`, '', { task_id: task.id });
    }

    res.json(task);
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Fotootyot qo'shish
router.post('/:id/photos', authenticate, upload.array('photos', 5), async (req: Request, res: Response): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files?.length) { res.status(400).json({ error: 'Fayl kerak' }); return; }

    const photos = await Promise.all(files.map(file =>
      queryOne<any>(`
        INSERT INTO task_photos (task_id, uploaded_by, photo_url, caption)
        VALUES ($1, $2, $3, $4) RETURNING *`,
        [req.params.id, req.user!.id, `/uploads/${file.filename}`, req.body.caption])
    ));

    res.status(201).json(photos);
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Izoh qo'shish
router.post('/:id/comments', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { text } = req.body;
    if (!text) { res.status(400).json({ error: 'Matn kerak' }); return; }

    const [comment] = await query<any>(`
      INSERT INTO task_comments (task_id, user_id, text) VALUES ($1, $2, $3) RETURNING *`,
      [req.params.id, req.user!.id, text]);

    res.status(201).json(comment);
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

export default router;
