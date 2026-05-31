import { Router, Request, Response } from 'express';
import { query, queryOne } from '../config/database';
import { authenticate, requireRole } from '../middleware/auth';
import { getCache, setCache } from '../config/redis';

const router = Router();

// Owner main dashboard - barcha filiallar bo'yicha yig'ilgan ko'rsatkichlar
router.get('/owner', authenticate, requireRole('owner'), async (req: Request, res: Response): Promise<void> => {
  try {
    const cacheKey = 'dashboard:owner:' + new Date().toISOString().split('T')[0];
    const cached = await getCache(cacheKey);
    if (cached) { res.json(cached); return; }

    const today = new Date().toISOString().split('T')[0];
    const weekStart = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    const [
      todayRevenue,
      weekRevenue,
      monthRevenue,
      orderStats,
      branchKpis,
      overdueTasks,
      shortages,
      lowStockItems,
      pendingAggregators,
      recentNotifications,
    ] = await Promise.all([
      // Today revenue
      queryOne<any>(`SELECT COALESCE(SUM(amount), 0) as total FROM revenues WHERE date = $1`, [today]),
      // Week revenue
      queryOne<any>(`SELECT COALESCE(SUM(amount), 0) as total FROM revenues WHERE date >= $1`, [weekStart]),
      // Month revenue
      queryOne<any>(`SELECT COALESCE(SUM(amount), 0) as total FROM revenues WHERE date >= $1`, [monthStart]),
      // Order stats from iiko
      queryOne<any>(`
        SELECT COUNT(*) as total_orders,
               COALESCE(AVG(total_amount), 0) as avg_check,
               COALESCE(AVG(cooking_time), 0) as avg_cooking_time,
               COALESCE(AVG(delivery_time), 0) as avg_delivery_time
        FROM iiko_orders WHERE DATE(created_at_iiko) = $1`, [today]),
      // Branch KPIs
      query<any>(`
        SELECT b.id, b.name, k.total_revenue, k.total_orders, k.avg_check,
               k.avg_delivery_time, k.shortage_amount, k.tasks_overdue
        FROM branches b
        LEFT JOIN kpi_daily k ON k.branch_id = b.id AND k.date = $1
        WHERE b.is_active = true ORDER BY b.name`, [today]),
      // Overdue tasks count
      queryOne<any>(`SELECT COUNT(*) as count FROM tasks WHERE status = 'overdue'`),
      // Total shortage
      queryOne<any>(`SELECT COALESCE(SUM(shortage_total), 0) as total FROM inventories WHERE DATE(created_at) = $1`, [today]),
      // Low stock products
      query<any>(`
        SELECT p.name, s.quantity, p.min_stock, b.name as branch_name
        FROM stock s JOIN products p ON p.id = s.product_id
        JOIN branches b ON b.id = s.branch_id
        WHERE s.quantity <= p.min_stock AND p.is_active = true
        ORDER BY (s.quantity / NULLIF(p.min_stock, 0)) LIMIT 10`),
      // Pending aggregator payments
      queryOne<any>(`SELECT COUNT(*) as count FROM aggregator_payments WHERE status = 'overdue'`),
      // Recent notifications
      query<any>(`
        SELECT * FROM notifications WHERE user_id = $1 AND is_read = false
        ORDER BY created_at DESC LIMIT 10`, [req.user!.id]),
    ]);

    const data = {
      today_revenue: Number(todayRevenue?.total || 0),
      week_revenue: Number(weekRevenue?.total || 0),
      month_revenue: Number(monthRevenue?.total || 0),
      total_orders: Number(orderStats?.total_orders || 0),
      avg_check: Number(orderStats?.avg_check || 0),
      avg_cooking_time: Math.round(Number(orderStats?.avg_cooking_time || 0) / 60),
      avg_delivery_time: Math.round(Number(orderStats?.avg_delivery_time || 0) / 60),
      overdue_tasks: Number(overdueTasks?.count || 0),
      shortage_total: Number(shortages?.total || 0),
      low_stock_items: lowStockItems,
      overdue_aggregators: Number(pendingAggregators?.count || 0),
      branches: branchKpis,
      notifications: recentNotifications,
    };

    await setCache(cacheKey, data, 300);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi', detail: err.message });
  }
});

// Branch manager dashboard
router.get('/branch/:branchId', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { branchId } = req.params;
    if (req.user!.role !== 'owner' && req.user!.role !== 'accountant' && req.user!.branch_id !== branchId) {
      res.status(403).json({ error: 'Ruxsat yo\'q' });
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    const [kpi, activeShift, staffOnline, pendingTasks, lowStock] = await Promise.all([
      queryOne<any>(`SELECT * FROM kpi_daily WHERE branch_id = $1 AND date = $2`, [branchId, today]),
      queryOne<any>(`SELECT * FROM work_shifts WHERE branch_id = $1 AND status = 'open' ORDER BY opened_at DESC LIMIT 1`, [branchId]),
      query<any>(`
        SELECT u.id, u.full_name, u.role, a.check_in
        FROM attendance a JOIN users u ON u.id = a.user_id
        WHERE a.branch_id = $1 AND DATE(a.check_in) = $2 AND a.check_out IS NULL`, [branchId, today]),
      query<any>(`
        SELECT id, title, priority, due_date FROM tasks
        WHERE branch_id = $1 AND status IN ('new', 'in_progress', 'overdue')
        ORDER BY due_date ASC LIMIT 10`, [branchId]),
      query<any>(`
        SELECT p.name, s.quantity, p.min_stock, p.unit
        FROM stock s JOIN products p ON p.id = s.product_id
        WHERE s.branch_id = $1 AND s.quantity <= p.min_stock AND p.is_active = true`, [branchId]),
    ]);

    res.json({ kpi, active_shift: activeShift, staff_online: staffOnline, pending_tasks: pendingTasks, low_stock: lowStock });
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi', detail: err.message });
  }
});

// Analytics - revenue chart
router.get('/analytics/revenue', authenticate, requireRole('owner', 'accountant'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { period = '7d', branch_id } = req.query;
    const days = period === '30d' ? 30 : period === '90d' ? 90 : 7;
    const dateFrom = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];

    const branchFilter = branch_id ? `AND branch_id = '${branch_id}'` : '';

    const data = await query<any>(`
      SELECT date, SUM(amount) as revenue, COUNT(*) as transactions
      FROM revenues
      WHERE date >= $1 ${branchFilter}
      GROUP BY date ORDER BY date`, [dateFrom]);

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

export default router;
