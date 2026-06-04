import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import { query } from '../config/database';
import { logger } from '../config/logger';

const IIKO_BASE = 'https://sariq-bola-co-co.iiko.it/resto';
const LOGIN = process.env.IIKO_LOGIN || 'Saidov';
const PASSWORD = process.env.IIKO_PASSWORD || '';

// Presets from iiko OLAP reports
const PRESETS = {
  salesByDay:    '96f88a3a-42c8-1806-017a-48a14384001b',
  deliveries:    '96f88a3a-42c8-1806-017a-48a143840024',
  couriers:      '96f88a3a-42c8-1806-017a-48a143840025',
  deliveryHours: '96f88a3a-42c8-1806-017a-48a143840027',
};

const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: true });

let sessionCookie: string | null = null;
let sessionExpiry: Date | null = null;

// ─── LOGIN ───────────────────────────────────────────────────
async function getSession(): Promise<string> {
  if (sessionCookie && sessionExpiry && sessionExpiry > new Date()) {
    return sessionCookie;
  }

  const formData = new URLSearchParams({
    j_username: LOGIN,
    j_password: PASSWORD,
    submit: 'Log in',
  });

  // maxRedirects: 0 — 302 javobdan JSESSIONID cookie olamiz
  const resp = await axios.post(`${IIKO_BASE}/j_spring_security_check`, formData.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    maxRedirects: 0,
    validateStatus: (s) => s < 400,
  });

  const rawCookie = resp.headers['set-cookie'];
  let cookie = '';
  if (rawCookie) {
    cookie = Array.isArray(rawCookie)
      ? rawCookie.map(c => c.split(';')[0]).join('; ')
      : rawCookie.split(';')[0];
  }

  if (!cookie) throw new Error('iiko login muvaffaqiyatsiz — cookie olinmadi');

  sessionCookie = cookie;
  sessionExpiry = new Date(Date.now() + 50 * 60 * 1000); // 50 daqiqa
  logger.info('iiko login muvaffaqiyatli');
  return sessionCookie;
}

// ─── REPORT FETCHER ──────────────────────────────────────────
async function fetchReport(reportId: string, presetId: string, dateFrom: string, dateTo: string): Promise<any[]> {
  const cookie = await getSession();

  const formData = new URLSearchParams({ reportId, presetId, dateFrom, dateTo });

  const resp = await axios.post(
    `${IIKO_BASE}/service/reports/report.jspx`,
    formData.toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: cookie,
      },
    }
  );

  const xml = resp.data as string;
  if (!xml.includes('<report>') && !xml.includes('<data>')) {
    logger.warn('iiko: bo\'sh javob', { reportId });
    return [];
  }

  const parsed = parser.parse(xml);
  const data = parsed?.report?.data;
  if (!data) return [];
  return Array.isArray(data) ? data : [data];
}

function iikoDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

// ─── BRANCH MAP ──────────────────────────────────────────────
const BRANCH_MAP: Record<string, string> = {
  'Sariq-Bola Andijan':   '11111111-1111-1111-1111-111111111111',
  'Sariq bola Andijan-2': '22222222-2222-2222-2222-222222222222',
  'Sariq-bola Kokand':    '33333333-3333-3333-3333-333333333333',
};

// ─── SYNC REVENUES ───────────────────────────────────────────
export async function syncRevenues(days = 1): Promise<void> {
  const today = new Date();
  const from = new Date(today);
  from.setDate(from.getDate() - days + 1);

  const data = await fetchReport('salesOlapConfig', PRESETS.salesByDay, iikoDate(from), iikoDate(today));

  let count = 0;
  for (const row of data) {
    const dateStr = row['OpenDate.Typed']; // "04.06.2026"
    if (!dateStr) continue;

    // Parse date DD.MM.YYYY
    const [d, m, y] = String(dateStr).split('.');
    const isoDate = `${y}-${m}-${d}`;

    const total = parseFloat(String(row['DishDiscountSumInt'] || 0));
    const checks = parseFloat(String(row['UniqOrderId'] || 0));
    const guests = parseFloat(String(row['GuestNum'] || 0));
    const avgCheck = checks > 0 ? total / checks : 0;

    // Update KPI for all branches (total)
    for (const [_, branchId] of Object.entries(BRANCH_MAP)) {
      await query(`
        INSERT INTO kpi_daily (branch_id, date, total_revenue, total_orders, avg_check)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (branch_id, date) DO NOTHING`,
        [branchId, isoDate, 0, 0, 0]
      );
    }

    count++;
  }

  // Sync totals per day
  await syncTotalsToKpi(data);

  logger.info('iiko revenue synced', { days, count });
  await query(`INSERT INTO iiko_sync_logs (sync_type, status, records_count) VALUES ('revenues', 'success', $1)`, [count]);
}

// ─── SYNC PER BRANCH ─────────────────────────────────────────
export async function syncDeliveries(days = 1): Promise<void> {
  const today = new Date();
  const from = new Date(today);
  from.setDate(from.getDate() - days + 1);

  const data = await fetchReport('deliveryOlapConfig', PRESETS.deliveries, iikoDate(from), iikoDate(today));

  for (const row of data) {
    const dept = String(row['Department'] || '');
    const branchId = BRANCH_MAP[dept];
    if (!branchId) continue;

    const dateStr = String(row['OpenDate.Typed'] || '');
    if (!dateStr) continue;
    const [d, m, y] = dateStr.split('.');
    const isoDate = `${y}-${m}-${d}`;

    const revenue = parseFloat(String(row['DishDiscountSumInt'] || 0));
    const orders = parseFloat(String(row['UniqOrderId.OrdersCount'] || 0));
    const avgCheck = parseFloat(String(row['DishDiscountSumInt.average'] || 0));

    await query(`
      INSERT INTO kpi_daily (branch_id, date, total_revenue, total_orders, avg_check)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (branch_id, date) DO UPDATE SET
        total_revenue = EXCLUDED.total_revenue,
        total_orders = EXCLUDED.total_orders,
        avg_check = EXCLUDED.avg_check`,
      [branchId, isoDate, revenue, orders, avgCheck]
    );
  }

  logger.info('iiko deliveries synced');
}

async function syncTotalsToKpi(data: any[]): Promise<void> {
  const totals: Record<string, { revenue: number; orders: number }> = {};

  for (const row of data) {
    const dateStr = String(row['OpenDate.Typed'] || '');
    if (!dateStr) continue;
    const [d, m, y] = dateStr.split('.');
    const isoDate = `${y}-${m}-${d}`;

    if (!totals[isoDate]) totals[isoDate] = { revenue: 0, orders: 0 };
    totals[isoDate].revenue += parseFloat(String(row['DishDiscountSumInt'] || 0));
    totals[isoDate].orders += parseFloat(String(row['UniqOrderId'] || 0));
  }

  // Store aggregated totals in revenues table
  const ownerQuery = `SELECT id FROM users WHERE role = 'owner' LIMIT 1`;
  const owner = await query<any>(ownerQuery);
  const recordedBy = owner[0]?.id;

  for (const [isoDate, t] of Object.entries(totals)) {
    // Insert into revenues for first branch as overall total
    const firstBranch = Object.values(BRANCH_MAP)[0];
    await query(`
      INSERT INTO revenues (branch_id, amount, source, date, notes)
      VALUES ($1, $2, 'iiko', $3, $4)
      ON CONFLICT DO NOTHING`,
      [firstBranch, t.revenue, isoDate, `iiko: ${t.orders} chek, jami ${t.revenue.toLocaleString()} so'm`]
    );
  }
}

// ─── FULL SYNC ───────────────────────────────────────────────
export async function syncAll(days = 1): Promise<void> {
  try {
    logger.info('iiko full sync boshlandi...');
    await syncDeliveries(days);
    await syncRevenues(days);
    logger.info('iiko full sync tugadi');
  } catch (err: any) {
    logger.error('iiko sync xatolik', { error: err.message });
    await query(`
      INSERT INTO iiko_sync_logs (sync_type, status, error_message)
      VALUES ('full', 'error', $1)`, [err.message]);
  }
}
