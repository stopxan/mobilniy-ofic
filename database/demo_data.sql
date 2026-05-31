INSERT INTO tasks (title, created_by, branch_id, status, priority, due_date) VALUES
  ('Muzlatgichni tekshirish', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'new', 'high', NOW() + INTERVAL '2 hours'),
  ('Tozalash hisoboti', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'in_progress', 'normal', NOW() + INTERVAL '4 hours'),
  ('Tovar qabul qilish', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'new', 'urgent', NOW() + INTERVAL '1 hour'),
  ('Smena hisoboti kechikdi', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'overdue', 'high', NOW() - INTERVAL '2 hours');

INSERT INTO deliveries (branch_id, courier_id, customer_address, order_amount, status) VALUES
  ('11111111-1111-1111-1111-111111111111', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Chilonzor 9-kvartal, 45-uy', 89000, 'delivered'),
  ('11111111-1111-1111-1111-111111111111', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Chilonzor 5-kvartal, 12-uy', 120000, 'on_way'),
  ('22222222-2222-2222-2222-222222222222', NULL, 'Yunusobod 7-blok, 33-uy', 95000, 'new');

INSERT INTO iiko_orders (branch_id, iiko_id, order_number, total_amount, cooking_time, delivery_time, status, created_at_iiko) VALUES
  ('11111111-1111-1111-1111-111111111111', 'ord-001', '1001', 89000, 900, 2700, 'Closed', NOW() - INTERVAL '1 hour'),
  ('11111111-1111-1111-1111-111111111111', 'ord-002', '1002', 120000, 1200, 3000, 'Closed', NOW() - INTERVAL '2 hours'),
  ('22222222-2222-2222-2222-222222222222', 'ord-003', '2001', 95000, 800, 2400, 'Closed', NOW() - INTERVAL '30 minutes'),
  ('33333333-3333-3333-3333-333333333333', 'ord-004', '3001', 75000, 700, 2100, 'Closed', NOW() - INTERVAL '90 minutes'),
  ('44444444-4444-4444-4444-444444444444', 'ord-005', '4001', 110000, 1100, 2800, 'Closed', NOW() - INTERVAL '45 minutes');

INSERT INTO kpi_daily (branch_id, date, total_revenue, total_orders, avg_check, avg_cooking_time, avg_delivery_time)
VALUES
  ('11111111-1111-1111-1111-111111111111', CURRENT_DATE, 11700000, 47, 248936, 945, 2850),
  ('22222222-2222-2222-2222-222222222222', CURRENT_DATE, 7100000, 31, 229032, 820, 2550),
  ('33333333-3333-3333-3333-333333333333', CURRENT_DATE, 5400000, 24, 225000, 780, 2400),
  ('44444444-4444-4444-4444-444444444444', CURRENT_DATE, 4200000, 18, 233333, 850, 2700)
ON CONFLICT (branch_id, date) DO UPDATE SET total_revenue = EXCLUDED.total_revenue, total_orders = EXCLUDED.total_orders;

INSERT INTO attendance (user_id, branch_id, check_in) VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '5 hours'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '4 hours'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', NOW() - INTERVAL '6 hours')
ON CONFLICT DO NOTHING;
