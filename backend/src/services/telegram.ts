import TelegramBot from 'node-telegram-bot-api';
import { queryOne, query } from '../config/database';
import { logger } from '../config/logger';

export let telegramBot: TelegramBot | null = null;

export function initTelegramBot(): void {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    logger.warn('TELEGRAM_BOT_TOKEN not set, Telegram disabled');
    return;
  }

  telegramBot = new TelegramBot(token, { polling: true });
  logger.info('Telegram bot started');

  telegramBot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const username = msg.from?.username;

    await telegramBot!.sendMessage(chatId,
      `🍕 *Pizza Chain Management*\n\n` +
      `Salom! Bu tizim pizza restoran tarmog'ini boshqarish uchun.\n\n` +
      `Telegram ID'ingiz: \`${chatId}\`\n\n` +
      `Telefon raqamingizni yuborib, tizimga bog'laning:`,
      { parse_mode: 'Markdown' }
    );
  });

  telegramBot.on('contact', async (msg) => {
    const chatId = msg.chat.id;
    const phone = msg.contact?.phone_number?.replace(/[^\d+]/g, '');
    if (!phone) return;

    const user = await queryOne<any>(`SELECT id, full_name FROM users WHERE phone = $1`, [phone]);
    if (!user) {
      await telegramBot!.sendMessage(chatId, '❌ Bu telefon raqam tizimda topilmadi.');
      return;
    }

    await query(`UPDATE users SET telegram_id = $1 WHERE id = $2`, [chatId, user.id]);
    await telegramBot!.sendMessage(chatId,
      `✅ *Muvaffaqiyatli ulandi!*\n\nSalom, ${user.full_name}!\n` +
      `Endi sizga bildirishnomalar yuboriladi.`,
      { parse_mode: 'Markdown' }
    );
  });

  telegramBot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    if (msg.contact || msg.text?.startsWith('/')) return;

    const user = await queryOne<any>(`SELECT * FROM users WHERE telegram_id = $1`, [chatId]);
    if (!user) {
      await telegramBot!.sendMessage(chatId, 'Tizimga ulaning: /start');
      return;
    }

    const text = msg.text?.toLowerCase() || '';
    if (text.includes('bugun') || text.includes('today')) {
      const today = new Date().toISOString().split('T')[0];
      const revenue = await queryOne<any>(`SELECT COALESCE(SUM(amount), 0) as total FROM revenues WHERE date = $1`, [today]);
      await telegramBot!.sendMessage(chatId,
        `📊 *Bugungi daromad*\n\n${Number(revenue?.total || 0).toLocaleString()} so'm`,
        { parse_mode: 'Markdown' }
      );
    }
  });

  telegramBot.on('polling_error', (err) => {
    logger.error('Telegram polling error', { error: err.message });
  });
}

export async function sendDailySummaryToOwners(): Promise<void> {
  if (!telegramBot) return;

  const today = new Date().toISOString().split('T')[0];
  const owners = await query<any>(`SELECT telegram_id, full_name FROM users WHERE role = 'owner' AND telegram_id IS NOT NULL`);
  const revenue = await queryOne<any>(`SELECT COALESCE(SUM(amount), 0) as total FROM revenues WHERE date = $1`, [today]);
  const orders = await queryOne<any>(`SELECT COUNT(*) as count FROM iiko_orders WHERE DATE(created_at_iiko) = $1`, [today]);
  const overdue = await queryOne<any>(`SELECT COUNT(*) as count FROM tasks WHERE status = 'overdue'`);

  const message = `📊 *Kunlik hisobot - ${today}*\n\n` +
    `💰 Daromad: *${Number(revenue?.total || 0).toLocaleString()} so'm*\n` +
    `🛒 Buyurtmalar: *${orders?.count || 0}*\n` +
    `⚠️ Prosrochennye zadachi: *${overdue?.count || 0}*\n\n` +
    `Batafsil ma'lumot uchun ilovani oching.`;

  for (const owner of owners) {
    await telegramBot.sendMessage(owner.telegram_id, message, { parse_mode: 'Markdown' })
      .catch(err => logger.warn('Daily summary send failed', { error: err.message }));
  }
}
