-- ============================================================
-- SEED DATA - Test ma'lumotlar
-- ============================================================

-- Branches
INSERT INTO branches (id, name, address, phone, iiko_id) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Filial №1 - Chilonzor', 'Toshkent, Chilonzor tumani, 9-kvartal', '+998901234561', 'BRANCH_001'),
  ('22222222-2222-2222-2222-222222222222', 'Filial №2 - Yunusobod', 'Toshkent, Yunusobod tumani, 7-blok', '+998901234562', 'BRANCH_002'),
  ('33333333-3333-3333-3333-333333333333', 'Filial №3 - Mirzo Ulug''bek', 'Toshkent, Mirzo Ulug''bek tumani', '+998901234563', 'BRANCH_003'),
  ('44444444-4444-4444-4444-444444444444', 'Filial №4 - Sergeli', 'Toshkent, Sergeli tumani, 8-massiv', '+998901234564', 'BRANCH_004');

-- Users (passwords are hashed version of "password123")
INSERT INTO users (id, full_name, phone, email, password_hash, role, branch_id, telegram_id) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Alisher Karimov', '+998901000001', 'owner@pizza.uz',
   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBpj1KZbcw8Eem', 'owner', NULL, 123456789),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Malika Yusupova', '+998901000002', 'accountant@pizza.uz',
   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBpj1KZbcw8Eem', 'accountant', NULL, 987654321),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Bobur Rahimov', '+998901000003', 'manager1@pizza.uz',
   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBpj1KZbcw8Eem', 'manager', '11111111-1111-1111-1111-111111111111', NULL),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Sarvar Nazarov', '+998901000004', 'manager2@pizza.uz',
   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBpj1KZbcw8Eem', 'manager', '22222222-2222-2222-2222-222222222222', NULL),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Jasur Toshmatov', '+998901000005', 'courier1@pizza.uz',
   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBpj1KZbcw8Eem', 'courier', '11111111-1111-1111-1111-111111111111', NULL);

-- Products
INSERT INTO products (name, unit, category, min_stock) VALUES
  ('Mozzarella pishloq', 'kg', 'Dairy', 10),
  ('Pomidor sousi', 'litre', 'Sauces', 5),
  ('Kolbasa', 'kg', 'Meat', 8),
  ('Un', 'kg', 'Flour', 50),
  ('Zaytun moyi', 'litre', 'Oils', 3),
  ('Qo''ziqorin', 'kg', 'Vegetables', 5),
  ('Qalampir', 'kg', 'Vegetables', 3),
  ('Pizza qutilar', 'piece', 'Packaging', 200),
  ('Stakanchalar', 'piece', 'Packaging', 100);
