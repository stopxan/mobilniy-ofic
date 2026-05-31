import { query, queryOne } from '../config/database';
import { telegramBot } from './telegram';
import { io } from '../index';
import { logger } from '../config/logger';

type NotificationType =
  | 'task_new' | 'task_overdue' | 'task_done'
  | 'shortage' | 'surplus' | 'low_stock'
  | 'payment_due' | 'payment_received'
  | 'delivery_assigned' | 'delivery_late'
  | 'shift_open' | 'shift_close'
  | 'ai_alert' | 'system';

export async function notifyUser(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> {
  try {
    const [notification] = await query<any>(`
      INSERT INTO notifications (user_id, type, title, body, data)
      VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, type, title, body, data ? JSON.stringify(data) : null]);

    // Real-time via Socket.io
    if (io) {
      io.to(`user:${userId}`).emit('notification', notification);
    }

    // Telegram notification
    const user = await queryOne<any>(`SELECT telegram_id FROM users WHERE id = $1`, [userId]);
    if (user?.telegram_id && telegramBot) {
      await telegramBot.sendMessage(
        user.telegram_id,
        `🔔 *${title}*\n\n${body}`,
        { parse_mode: 'Markdown' }
      ).catch(err => logger.warn('Telegram send failed', { error: err.message }));

      await query(`UPDATE notifications SET sent_telegram = true WHERE id = $1`, [notification.id]);
    }
  } catch (err: any) {
    logger.error('Notification error', { error: err.message, userId, type });
  }
}

export async function notifyBranch(
  branchId: string,
  type: NotificationType,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> {
  const staff = await query<any>(`SELECT id FROM users WHERE branch_id = $1 AND is_active = true`, [branchId]);
  await Promise.all(staff.map(u => notifyUser(u.id, type, title, body, data)));
}

export async function notifyOwners(
  type: NotificationType,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> {
  const owners = await query<any>(`SELECT id FROM users WHERE role IN ('owner', 'accountant') AND is_active = true`);
  await Promise.all(owners.map(u => notifyUser(u.id, type, title, body, data)));
}
