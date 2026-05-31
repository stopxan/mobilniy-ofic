import axios from 'axios';
import { query, queryOne } from '../config/database';
import { logger } from '../config/logger';
import { notifyOwners } from './notifications';

const iikoApi = axios.create({
  baseURL: process.env.IIKO_API_URL || 'https://api-ru.iiko.services',
  timeout: 30000,
});

let iikoToken: string | null = null;
let tokenExpiresAt: Date | null = null;

async function getToken(): Promise<string> {
  if (iikoToken && tokenExpiresAt && tokenExpiresAt > new Date()) {
    return iikoToken;
  }

  const response = await iikoApi.post('/api/1/access_token', {
    apiLogin: process.env.IIKO_API_KEY,
  });

  iikoToken = response.data.token;
  tokenExpiresAt = new Date(Date.now() + 55 * 60 * 1000); // 55 minutes
  return iikoToken!;
}

export async function syncOrders(branchId: string, iikoOrgId: string): Promise<void> {
  try {
    const token = await getToken();
    const dateFrom = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    const response = await iikoApi.post(
      '/api/1/deliveries/by_delivery_date_and_status',
      { organizationId: iikoOrgId, deliveryDateFrom: dateFrom },
      { headers: { Authorization: token } }
    );

    const orders = response.data?.ordersByOrganizations?.[0]?.deliveries || [];
    let synced = 0;

    for (const order of orders) {
      await query(`
        INSERT INTO iiko_orders (branch_id, iiko_id, order_number, order_type, total_amount,
          payment_method, cooking_time, delivery_time, status, created_at_iiko)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (iiko_id, branch_id) DO UPDATE SET
          status = EXCLUDED.status,
          delivery_time = EXCLUDED.delivery_time,
          synced_at = NOW()`,
        [
          branchId,
          order.id,
          order.number,
          order.orderType?.name,
          order.sum,
          order.paymentItems?.[0]?.paymentType?.name,
          order.cookingDuration,
          order.deliveryDuration,
          order.status,
          order.createdAt,
        ]
      );
      synced++;
    }

    await updateKpiDaily(branchId);
    await query(`
      INSERT INTO iiko_sync_logs (branch_id, sync_type, status, records_count)
      VALUES ($1, 'orders', 'success', $2)`, [branchId, synced]);

    logger.info('iiko orders synced', { branchId, count: synced });
  } catch (err: any) {
    logger.error('iiko sync error', { error: err.message, branchId });
    await query(`
      INSERT INTO iiko_sync_logs (branch_id, sync_type, status, error_message)
      VALUES ($1, 'orders', 'error', $2)`, [branchId, err.message]);
  }
}

async function updateKpiDaily(branchId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  await query(`
    INSERT INTO kpi_daily (branch_id, date, total_orders, avg_check, avg_cooking_time, avg_delivery_time)
    SELECT $1, $2,
      COUNT(*),
      COALESCE(AVG(total_amount), 0),
      COALESCE(AVG(cooking_time), 0),
      COALESCE(AVG(delivery_time), 0)
    FROM iiko_orders
    WHERE branch_id = $1 AND DATE(created_at_iiko) = $2
    ON CONFLICT (branch_id, date) DO UPDATE SET
      total_orders = EXCLUDED.total_orders,
      avg_check = EXCLUDED.avg_check,
      avg_cooking_time = EXCLUDED.avg_cooking_time,
      avg_delivery_time = EXCLUDED.avg_delivery_time`,
    [branchId, today]);
}

export async function syncAllBranches(): Promise<void> {
  const branches = await query<any>(`SELECT id, iiko_id FROM branches WHERE is_active = true AND iiko_id IS NOT NULL`);
  await Promise.allSettled(branches.map(b => syncOrders(b.id, b.iiko_id)));
}
