import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '../config/database';
import { authenticate } from '../middleware/auth';
import { logger } from '../config/logger';

const router = Router();

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      res.status(400).json({ error: 'Telefon va parol kerak' });
      return;
    }

    const user = await queryOne<any>(
      `SELECT u.*, b.name as branch_name FROM users u
       LEFT JOIN branches b ON b.id = u.branch_id
       WHERE u.phone = $1 AND u.is_active = true`,
      [phone]
    );

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      res.status(401).json({ error: 'Telefon yoki parol noto\'g\'ri' });
      return;
    }

    const payload = { id: user.id, role: user.role, branch_id: user.branch_id };
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    });
    const refreshToken = uuidv4();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
      [user.id, refreshToken, expiresAt]
    );

    await query(`UPDATE users SET last_login = NOW() WHERE id = $1`, [user.id]);

    res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        full_name: user.full_name,
        phone: user.phone,
        role: user.role,
        branch_id: user.branch_id,
        branch_name: user.branch_name,
        avatar_url: user.avatar_url,
      },
    });
  } catch (err: any) {
    logger.error('Login error', { error: err.message });
    res.status(500).json({ error: 'Server xatosi' });
  }
});

router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      res.status(400).json({ error: 'Refresh token kerak' });
      return;
    }

    const tokenRecord = await queryOne<any>(
      `SELECT rt.*, u.id as uid, u.role, u.branch_id, u.is_active
       FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id
       WHERE rt.token = $1 AND rt.expires_at > NOW()`,
      [refresh_token]
    );

    if (!tokenRecord || !tokenRecord.is_active) {
      res.status(401).json({ error: 'Token yaroqsiz' });
      return;
    }

    const payload = { id: tokenRecord.uid, role: tokenRecord.role, branch_id: tokenRecord.branch_id };
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '1h' });

    res.json({ access_token: accessToken });
  } catch (err: any) {
    logger.error('Refresh error', { error: err.message });
    res.status(500).json({ error: 'Server xatosi' });
  }
});

router.post('/logout', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { refresh_token } = req.body;
    if (refresh_token) {
      await query(`DELETE FROM refresh_tokens WHERE token = $1`, [refresh_token]);
    }
    res.json({ message: 'Muvaffaqiyatli chiqildi' });
  } catch (err: any) {
    logger.error('Logout error', { error: err.message });
    res.status(500).json({ error: 'Server xatosi' });
  }
});

router.get('/me', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await queryOne<any>(
      `SELECT u.id, u.full_name, u.phone, u.email, u.role, u.branch_id,
              u.telegram_id, u.avatar_url, u.last_login, b.name as branch_name
       FROM users u LEFT JOIN branches b ON b.id = u.branch_id
       WHERE u.id = $1`,
      [req.user!.id]
    );
    res.json(user);
  } catch (err: any) {
    logger.error('Me error', { error: err.message });
    res.status(500).json({ error: 'Server xatosi' });
  }
});

export default router;
