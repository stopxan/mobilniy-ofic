import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import cron from 'node-cron';

import { logger } from './config/logger';
import { connectRedis } from './config/redis';
import { initTelegramBot, sendDailySummaryToOwners } from './services/telegram';
import { syncAllBranches } from './services/iiko';
import { generateDailySummary } from './services/ai';
import { notifyOwners } from './services/notifications';

import authRoutes from './routes/auth';
import dashboardRoutes from './routes/dashboard';
import tasksRoutes from './routes/tasks';
import financeRoutes from './routes/finance';
import warehouseRoutes from './routes/warehouse';
import usersRoutes from './routes/users';
import deliveryRoutes from './routes/delivery';
import remindersRoutes from './routes/reminders';
import aiRoutes from './routes/ai';

const app = express();
const httpServer = createServer(app);

// Socket.io (real-time bildirishnomalar)
export const io = new Server(httpServer, {
  cors: { origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true },
});

io.on('connection', (socket) => {
  socket.on('join', (userId: string) => {
    socket.join(`user:${userId}`);
    logger.debug('Socket joined', { userId });
  });
  socket.on('disconnect', () => {});
});

// Middleware
app.use(helmet());
const corsOrigin = process.env.CORS_ORIGIN === '*' ? true : (process.env.CORS_ORIGIN || 'http://localhost:5173');
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Juda ko\'p so\'rov' } }));
app.use('/api', rateLimit({ windowMs: 1 * 60 * 1000, max: 200 }));

// Static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/warehouse', warehouseRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/reminders', remindersRoutes);
app.use('/api/ai', aiRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route topilmadi' });
});

// ============================================================
// CRON JOBS (Avtomatik vazifalar)
// ============================================================

// iiko sinxronizatsiya - har 15 daqiqada
cron.schedule('*/15 * * * *', async () => {
  logger.info('iiko sync started');
  await syncAllBranches().catch(err => logger.error('iiko sync failed', { error: err.message }));
});

// Muddati o'tgan vazifalarni belgilash - har soatda
cron.schedule('0 * * * *', async () => {
  await require('./config/database').query(`
    UPDATE tasks SET status = 'overdue'
    WHERE due_date < NOW() AND status NOT IN ('done', 'cancelled', 'overdue')
  `).catch(console.error);
});

// Muddati o'tgan aggregator to'lovlar - kuniga bir marta
cron.schedule('0 9 * * *', async () => {
  const { query } = require('./config/database');
  await query(`
    UPDATE aggregator_payments SET status = 'overdue'
    WHERE expected_date < CURRENT_DATE AND status = 'pending'
  `).catch(console.error);

  const overdueCount = await require('./config/database').queryOne(`
    SELECT COUNT(*) as count FROM aggregator_payments WHERE status = 'overdue'
  `).catch(() => null);

  if (overdueCount?.count > 0) {
    await notifyOwners('payment_due',
      `${overdueCount.count} ta aggregator to'lovi kechikdi`,
      'Moliyaviy bo\'limni tekshiring.',
      {}).catch(console.error);
  }
});

// Erta tongda kunlik hisobot
cron.schedule('0 8 * * *', async () => {
  logger.info('Generating daily summary');
  await generateDailySummary().catch(err => logger.error('Daily AI summary failed', { error: err.message }));
  await sendDailySummaryToOwners().catch(err => logger.error('Telegram summary failed', { error: err.message }));
});

// Eslatmalar yuborish - har daqiqada
cron.schedule('* * * * *', async () => {
  const { query } = require('./config/database');
  const { notifyUser } = require('./services/notifications');
  const due = await query(`
    SELECT * FROM reminders WHERE remind_at <= NOW() AND is_sent = false AND is_dismissed = false
  `).catch(() => []);
  for (const r of due) {
    await notifyUser(r.user_id, 'system', r.title, r.description || '', {}).catch(console.error);
    await query(`UPDATE reminders SET is_sent = true WHERE id = $1`, [r.id]).catch(console.error);
  }
});

// Start server
const PORT = process.env.PORT || 3001;

async function start(): Promise<void> {
  await connectRedis().catch(err => logger.warn('Redis not connected', { error: err.message }));
  initTelegramBot();

  httpServer.listen(PORT, () => {
    logger.info(`Server started on port ${PORT}`);
  });
}

start().catch((err) => {
  logger.error('Failed to start', { error: err.message });
  process.exit(1);
});
