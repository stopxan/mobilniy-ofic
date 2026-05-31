import Anthropic from '@anthropic-ai/sdk';
import { query, queryOne } from '../config/database';
import { logger } from '../config/logger';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function askAI(userId: string, question: string): Promise<string> {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Kontekst uchun ma'lumot to'planadi
    const [revenue, orders, overdueTasks, shortages, branchKpis] = await Promise.all([
      queryOne<any>(`SELECT COALESCE(SUM(amount), 0) as total FROM revenues WHERE date = $1`, [today]),
      queryOne<any>(`
        SELECT COUNT(*) as count, COALESCE(AVG(total_amount), 0) as avg_check,
               COALESCE(AVG(delivery_time), 0) as avg_delivery
        FROM iiko_orders WHERE DATE(created_at_iiko) = $1`, [today]),
      queryOne<any>(`SELECT COUNT(*) as count FROM tasks WHERE status = 'overdue'`),
      queryOne<any>(`SELECT COALESCE(SUM(shortage_total), 0) as total FROM inventories WHERE DATE(created_at) = $1`, [today]),
      query<any>(`
        SELECT b.name, k.total_revenue, k.total_orders, k.avg_delivery_time, k.shortage_amount
        FROM branches b LEFT JOIN kpi_daily k ON k.branch_id = b.id AND k.date = $1
        WHERE b.is_active = true ORDER BY k.total_revenue DESC NULLS LAST`, [today]),
    ]);

    const context = `
Bugungi sana: ${today}
Bugungi daromad: ${Number(revenue?.total || 0).toLocaleString()} so'm
Buyurtmalar soni: ${orders?.count || 0}
O'rtacha chek: ${Number(orders?.avg_check || 0).toFixed(0)} so'm
O'rtacha yetkazib berish vaqti: ${Math.round(Number(orders?.avg_delivery || 0) / 60)} daqiqa
Muddati o'tgan vazifalar: ${overdueTasks?.count || 0}
Bugungi kamomad: ${Number(shortages?.total || 0).toLocaleString()} so'm

Filiallar ko'rsatkichlari:
${branchKpis.map(b => `- ${b.name}: daromad=${Number(b.total_revenue || 0).toLocaleString()} so'm, buyurtmalar=${b.total_orders || 0}`).join('\n')}
    `.trim();

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      system: `Siz pizza restoran tarmoqini boshqarishda yordam beruvchi sun'iy intellekt yordamchisisiz.
Quyidagi ma'lumotlar asosida aniq, qisqa va foydali javoblar bering.
Javoblaringiz o'zbek tilida bo'lsin.
Raqamlarni o'zbek formatida (so'm) ko'rsating.
Muammolarni aniqlang va yechimlar taklif qiling.`,
      messages: [
        {
          role: 'user',
          content: `Joriy ma'lumotlar:\n${context}\n\nSavol: ${question}`,
        },
      ],
    });

    const answer = response.content[0].type === 'text' ? response.content[0].text : 'Javob olinmadi';

    await query(`
      INSERT INTO ai_conversations (user_id, question, answer) VALUES ($1, $2, $3)`,
      [userId, question, answer]);

    return answer;
  } catch (err: any) {
    logger.error('AI error', { error: err.message });
    throw new Error('AI xizmati vaqtincha mavjud emas');
  }
}

export async function generateDailySummary(): Promise<string> {
  const today = new Date().toISOString().split('T')[0];

  const [revenue, orders, tasks, shortages, branchKpis] = await Promise.all([
    queryOne<any>(`SELECT COALESCE(SUM(amount), 0) as total FROM revenues WHERE date = $1`, [today]),
    queryOne<any>(`SELECT COUNT(*) as count, COALESCE(AVG(total_amount), 0) as avg FROM iiko_orders WHERE DATE(created_at_iiko) = $1`, [today]),
    queryOne<any>(`SELECT COUNT(*) FILTER(WHERE status='done') as done, COUNT(*) FILTER(WHERE status='overdue') as overdue FROM tasks WHERE DATE(created_at) = $1`, [today]),
    queryOne<any>(`SELECT COALESCE(SUM(shortage_total), 0) as total FROM inventories WHERE DATE(created_at) = $1`, [today]),
    query<any>(`
      SELECT b.name, k.total_revenue, k.total_orders, k.avg_delivery_time, k.shortage_amount
      FROM branches b LEFT JOIN kpi_daily k ON k.branch_id = b.id AND k.date = $1
      WHERE b.is_active = true ORDER BY COALESCE(k.total_revenue, 0) DESC`, [today]),
  ]);

  const context = `
Bugungi hisobot - ${today}:
Jami daromad: ${Number(revenue?.total || 0).toLocaleString()} so'm
Buyurtmalar: ${orders?.count || 0} ta
O'rtacha chek: ${Number(orders?.avg || 0).toFixed(0)} so'm
Bajarilgan vazifalar: ${tasks?.done || 0}, Muddati o'tganlar: ${tasks?.overdue || 0}
Kamomad: ${Number(shortages?.total || 0).toLocaleString()} so'm

Filiallar:
${branchKpis.map(b => `- ${b.name}: ${Number(b.total_revenue || 0).toLocaleString()} so'm, ${b.total_orders || 0} buyurtma`).join('\n')}
  `.trim();

  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1500,
      system: `Pizza restoran tarmoqining kunlik analitik hisobotini tayyorlaydigan sun'iy intellektsiz.
Quyidagi ma'lumotlar asosida:
1. Muhim ko'rsatkichlarni ajratib ko'rsating
2. Muammolarni aniqlang
3. Eng yaxshi va eng yomon filiallarni belgilang
4. Tavsiyalar bering
Javob o'zbek tilida, emoji bilan, qisqa va aniq bo'lsin.`,
      messages: [{ role: 'user', content: context }],
    });

    const summary = response.content[0].type === 'text' ? response.content[0].text : context;

    await query(`
      INSERT INTO ai_reports (report_type, content, data)
      VALUES ('daily', $1, $2)`,
      [summary, JSON.stringify({ revenue: revenue?.total, orders: orders?.count })]);

    return summary;
  } catch (err: any) {
    logger.error('AI daily summary error', { error: err.message });
    return context;
  }
}
