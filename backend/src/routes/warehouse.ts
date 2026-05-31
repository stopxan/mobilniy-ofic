import { Router, Request, Response } from 'express';
import { query, queryOne, transaction } from '../config/database';
import { authenticate } from '../middleware/auth';
import { notifyUser } from '../services/notifications';

const router = Router();

// Ombor qoldiqlari
router.get('/stock', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { branch_id, low_stock } = req.query;
    let filter = 'WHERE p.is_active = true';
    const params: any[] = [];
    let idx = 1;

    const branchFilter = req.user!.role === 'owner' || req.user!.role === 'accountant'
      ? branch_id ? ` AND s.branch_id = $${idx++}` : ''
      : ` AND s.branch_id = $${idx++}`;

    if (branchFilter.includes('$')) {
      params.push(req.user!.role === 'owner' && branch_id ? branch_id : req.user!.branch_id);
    }

    if (low_stock === 'true') filter += ` AND s.quantity <= p.min_stock`;

    const stocks = await query<any>(`
      SELECT s.*, p.name, p.unit, p.category, p.min_stock,
             b.name as branch_name,
             CASE WHEN s.quantity <= p.min_stock THEN true ELSE false END as is_low
      FROM stock s
      JOIN products p ON p.id = s.product_id
      JOIN branches b ON b.id = s.branch_id
      ${filter} ${branchFilter}
      ORDER BY p.category, p.name`, params);

    res.json(stocks);
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi', detail: err.message });
  }
});

// Tovar qabul qilish
router.post('/receipts', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { branch_id, supplier, invoice_number, total_amount, items, notes } = req.body;

    if (!branch_id || !items?.length) {
      res.status(400).json({ error: 'Filial va mahsulotlar kerak' }); return;
    }

    const receipt = await transaction(async (client) => {
      const [rec] = await client.query(`
        INSERT INTO stock_receipts (branch_id, received_by, supplier, invoice_number, total_amount, notes)
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [branch_id, req.user!.id, supplier, invoice_number, total_amount, notes]);

      for (const item of items) {
        await client.query(`
          INSERT INTO stock_receipt_items (receipt_id, product_id, quantity, unit_price, total_price)
          VALUES ($1, $2, $3, $4, $5)`,
          [rec.rows[0].id, item.product_id, item.quantity, item.unit_price, item.total_price]);

        await client.query(`
          INSERT INTO stock (product_id, branch_id, quantity) VALUES ($1, $2, $3)
          ON CONFLICT (product_id, branch_id)
          DO UPDATE SET quantity = stock.quantity + EXCLUDED.quantity, updated_at = NOW()`,
          [item.product_id, branch_id, item.quantity]);
      }

      return rec.rows[0];
    });

    res.status(201).json(receipt);
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi', detail: err.message });
  }
});

// Inventarizatsiya
router.post('/inventory', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { branch_id, items, notes } = req.body;
    if (!branch_id || !items?.length) {
      res.status(400).json({ error: 'Filial va mahsulotlar kerak' }); return;
    }

    const inventory = await transaction(async (client) => {
      let shortageTotal = 0;
      let surplusTotal = 0;

      const [inv] = (await client.query(`
        INSERT INTO inventories (branch_id, started_by, notes)
        VALUES ($1, $2, $3) RETURNING *`,
        [branch_id, req.user!.id, notes])).rows;

      for (const item of items) {
        const stock = await client.query(
          `SELECT quantity FROM stock WHERE product_id = $1 AND branch_id = $2`,
          [item.product_id, branch_id]
        );
        const expected = Number(stock.rows[0]?.quantity || 0);
        const actual = Number(item.actual_qty);
        const diff = actual - expected;

        const shortageAmt = diff < 0 ? Math.abs(diff) * (item.unit_price || 0) : 0;
        const surplusAmt = diff > 0 ? diff * (item.unit_price || 0) : 0;
        shortageTotal += shortageAmt;
        surplusTotal += surplusAmt;

        await client.query(`
          INSERT INTO inventory_items (inventory_id, product_id, expected_qty, actual_qty, unit_price, shortage_amount, surplus_amount)
          VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [inv.id, item.product_id, expected, actual, item.unit_price || 0, shortageAmt, surplusAmt]);

        await client.query(`
          UPDATE stock SET quantity = $1, updated_at = NOW()
          WHERE product_id = $2 AND branch_id = $3`,
          [actual, item.product_id, branch_id]);
      }

      await client.query(`
        UPDATE inventories SET status = 'completed', shortage_total = $1, surplus_total = $2, completed_at = NOW()
        WHERE id = $3`,
        [shortageTotal, surplusTotal, inv.id]);

      return { ...inv, shortage_total: shortageTotal, surplus_total: surplusTotal };
    });

    if (inventory.shortage_total > 0) {
      const ownerRow = await queryOne<any>(`SELECT id FROM users WHERE role = 'owner' LIMIT 1`);
      if (ownerRow) {
        await notifyUser(ownerRow.id, 'shortage',
          `Kamomad aniqlandi!`,
          `Filialda ${inventory.shortage_total.toLocaleString()} so'm kamomad aniqlandi.`,
          { inventory_id: inventory.id, branch_id });
      }
    }

    res.status(201).json(inventory);
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi', detail: err.message });
  }
});

// Mahsulotlar ro'yxati
router.get('/products', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const products = await query<any>(`SELECT * FROM products WHERE is_active = true ORDER BY category, name`);
    res.json(products);
  } catch (err: any) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

export default router;
