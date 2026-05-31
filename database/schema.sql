-- ============================================================
-- PIZZA CHAIN MANAGEMENT SYSTEM - DATABASE SCHEMA
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- BRANCHES (FILIALLAR)
-- ============================================================
CREATE TABLE branches (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(100) NOT NULL,
  address       TEXT NOT NULL,
  phone         VARCHAR(20),
  iiko_id       VARCHAR(50) UNIQUE,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- USERS (FOYDALANUVCHILAR)
-- ============================================================
CREATE TYPE user_role AS ENUM ('owner', 'accountant', 'manager', 'courier', 'cashier', 'cook');

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name       VARCHAR(150) NOT NULL,
  phone           VARCHAR(20) UNIQUE NOT NULL,
  email           VARCHAR(150) UNIQUE,
  password_hash   TEXT NOT NULL,
  role            user_role NOT NULL,
  branch_id       UUID REFERENCES branches(id) ON DELETE SET NULL,
  telegram_id     BIGINT UNIQUE,
  telegram_username VARCHAR(100),
  avatar_url      TEXT,
  is_active       BOOLEAN DEFAULT true,
  last_login      TIMESTAMP WITH TIME ZONE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- REFRESH TOKENS
-- ============================================================
CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- WORK SHIFTS (ISH SMENALARI)
-- ============================================================
CREATE TYPE shift_status AS ENUM ('open', 'closed');

CREATE TABLE work_shifts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id     UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  manager_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  opened_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  closed_at     TIMESTAMP WITH TIME ZONE,
  status        shift_status DEFAULT 'open',
  opening_cash  DECIMAL(12,2) DEFAULT 0,
  closing_cash  DECIMAL(12,2),
  notes         TEXT,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- ATTENDANCE (DAVOMIYLIK)
-- ============================================================
CREATE TABLE attendance (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  branch_id     UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  shift_id      UUID REFERENCES work_shifts(id) ON DELETE SET NULL,
  check_in      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  check_out     TIMESTAMP WITH TIME ZONE,
  late_minutes  INTEGER DEFAULT 0,
  early_leave   INTEGER DEFAULT 0,
  notes         TEXT,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- FINANCE - REVENUES (DAROMADLAR)
-- ============================================================
CREATE TABLE revenues (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id     UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  shift_id      UUID REFERENCES work_shifts(id) ON DELETE SET NULL,
  amount        DECIMAL(15,2) NOT NULL,
  source        VARCHAR(50) DEFAULT 'cash', -- cash, card, aggregator, iiko
  aggregator    VARCHAR(50), -- yandex, uzfood, wolt, etc.
  iiko_order_id VARCHAR(100),
  recorded_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  notes         TEXT,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- FINANCE - EXPENSES (XARAJATLAR)
-- ============================================================
CREATE TYPE expense_category AS ENUM (
  'salary', 'ingredients', 'packaging', 'utilities',
  'rent', 'maintenance', 'marketing', 'delivery', 'other'
);

CREATE TABLE expenses (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id     UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  shift_id      UUID REFERENCES work_shifts(id) ON DELETE SET NULL,
  category      expense_category NOT NULL,
  amount        DECIMAL(15,2) NOT NULL,
  description   TEXT NOT NULL,
  receipt_url   TEXT,
  document_url  TEXT,
  recorded_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- AGGREGATOR PAYMENTS (AGREGATORLAR)
-- ============================================================
CREATE TYPE aggregator_name AS ENUM ('yandex_eats', 'uzfood', 'wolt', 'express24', 'other');
CREATE TYPE payment_status AS ENUM ('pending', 'received', 'overdue', 'partial');

CREATE TABLE aggregator_payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  aggregator      aggregator_name NOT NULL,
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  expected_amount DECIMAL(15,2) NOT NULL,
  received_amount DECIMAL(15,2) DEFAULT 0,
  expected_date   DATE NOT NULL,
  received_date   DATE,
  status          payment_status DEFAULT 'pending',
  notes           TEXT,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- SALARIES (MAOSHLAR)
-- ============================================================
CREATE TYPE salary_type AS ENUM ('fixed', 'hourly', 'delivery_based');

CREATE TABLE salary_settings (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  salary_type   salary_type NOT NULL,
  base_amount   DECIMAL(12,2) NOT NULL DEFAULT 0,
  hourly_rate   DECIMAL(10,2),
  delivery_rate DECIMAL(10,2),
  effective_from DATE NOT NULL,
  effective_to   DATE,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE salary_records (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  branch_id     UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  period_month  INTEGER NOT NULL,
  period_year   INTEGER NOT NULL,
  base_salary   DECIMAL(12,2) NOT NULL DEFAULT 0,
  bonuses       DECIMAL(12,2) DEFAULT 0,
  penalties     DECIMAL(12,2) DEFAULT 0,
  advance       DECIMAL(12,2) DEFAULT 0,
  total         DECIMAL(12,2) NOT NULL,
  paid_at       TIMESTAMP WITH TIME ZONE,
  paid_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  notes         TEXT,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- PENALTIES & BONUSES (JARIMALAR VA MUKOFOTLAR)
-- ============================================================
CREATE TYPE adjustment_type AS ENUM ('penalty', 'bonus');

CREATE TABLE salary_adjustments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  branch_id   UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  type        adjustment_type NOT NULL,
  amount      DECIMAL(12,2) NOT NULL,
  reason      TEXT NOT NULL,
  applied_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- WAREHOUSE - PRODUCTS (OMBOR - MAHSULOTLAR)
-- ============================================================
CREATE TABLE products (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(200) NOT NULL,
  unit          VARCHAR(20) NOT NULL, -- kg, litre, piece, etc.
  iiko_id       VARCHAR(100),
  category      VARCHAR(100),
  min_stock     DECIMAL(10,3) DEFAULT 0,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- WAREHOUSE - STOCK (OMBOR QOLDIQLARI)
-- ============================================================
CREATE TABLE stock (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  branch_id   UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  quantity    DECIMAL(12,3) NOT NULL DEFAULT 0,
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, branch_id)
);

-- ============================================================
-- WAREHOUSE - RECEIPTS (TOVAR QABUL QILISH)
-- ============================================================
CREATE TYPE receipt_status AS ENUM ('pending', 'confirmed', 'rejected');

CREATE TABLE stock_receipts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id     UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  received_by   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  supplier      VARCHAR(200),
  invoice_number VARCHAR(100),
  invoice_url   TEXT,
  photo_url     TEXT,
  total_amount  DECIMAL(15,2),
  status        receipt_status DEFAULT 'pending',
  confirmed_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  confirmed_at  TIMESTAMP WITH TIME ZONE,
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  notes         TEXT,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE stock_receipt_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receipt_id  UUID NOT NULL REFERENCES stock_receipts(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity    DECIMAL(12,3) NOT NULL,
  unit_price  DECIMAL(12,2),
  total_price DECIMAL(15,2)
);

-- ============================================================
-- WAREHOUSE - WRITE-OFFS (HISOBDAN CHIQARISH)
-- ============================================================
CREATE TYPE writeoff_reason AS ENUM ('spoilage', 'expired', 'damaged', 'inventory_loss', 'other');

CREATE TABLE stock_writeoffs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id   UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity    DECIMAL(12,3) NOT NULL,
  reason      writeoff_reason NOT NULL,
  description TEXT,
  written_off_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- INVENTORY (INVENTARIZATSIYA)
-- ============================================================
CREATE TYPE inventory_status AS ENUM ('in_progress', 'completed', 'approved');

CREATE TABLE inventories (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id     UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  started_by    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  approved_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  status        inventory_status DEFAULT 'in_progress',
  shortage_total DECIMAL(15,2) DEFAULT 0,
  surplus_total  DECIMAL(15,2) DEFAULT 0,
  notes         TEXT,
  started_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at  TIMESTAMP WITH TIME ZONE,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE inventory_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_id    UUID NOT NULL REFERENCES inventories(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  expected_qty    DECIMAL(12,3) NOT NULL DEFAULT 0,
  actual_qty      DECIMAL(12,3) NOT NULL,
  difference      DECIMAL(12,3) GENERATED ALWAYS AS (actual_qty - expected_qty) STORED,
  unit_price      DECIMAL(12,2) DEFAULT 0,
  shortage_amount DECIMAL(15,2) DEFAULT 0,
  surplus_amount  DECIMAL(15,2) DEFAULT 0
);

-- ============================================================
-- TASKS (VAZIFALAR)
-- ============================================================
CREATE TYPE task_status AS ENUM ('new', 'in_progress', 'done', 'overdue', 'cancelled');
CREATE TYPE task_priority AS ENUM ('low', 'normal', 'high', 'urgent');

CREATE TABLE tasks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           VARCHAR(300) NOT NULL,
  description     TEXT,
  created_by      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_to     UUID REFERENCES users(id) ON DELETE SET NULL,
  branch_id       UUID REFERENCES branches(id) ON DELETE CASCADE,
  status          task_status DEFAULT 'new',
  priority        task_priority DEFAULT 'normal',
  due_date        TIMESTAMP WITH TIME ZONE,
  completed_at    TIMESTAMP WITH TIME ZONE,
  requires_photo  BOOLEAN DEFAULT false,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE task_photos (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  photo_url   TEXT NOT NULL,
  caption     TEXT,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE task_comments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- REMINDERS (ESLATMALAR)
-- ============================================================
CREATE TYPE reminder_type AS ENUM ('meeting', 'call', 'personal', 'task', 'payment');

CREATE TABLE reminders (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         VARCHAR(300) NOT NULL,
  description   TEXT,
  type          reminder_type DEFAULT 'personal',
  remind_at     TIMESTAMP WITH TIME ZONE NOT NULL,
  is_sent       BOOLEAN DEFAULT false,
  is_dismissed  BOOLEAN DEFAULT false,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- DELIVERIES (YETKAZIB BERISH)
-- ============================================================
CREATE TYPE delivery_status AS ENUM (
  'new', 'assigned', 'picked_up', 'on_way', 'delivered', 'cancelled', 'returned'
);

CREATE TABLE deliveries (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id         UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  courier_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  iiko_order_id     VARCHAR(100),
  customer_address  TEXT,
  customer_phone    VARCHAR(20),
  order_amount      DECIMAL(12,2),
  delivery_fee      DECIMAL(10,2) DEFAULT 0,
  status            delivery_status DEFAULT 'new',
  assigned_at       TIMESTAMP WITH TIME ZONE,
  picked_up_at      TIMESTAMP WITH TIME ZONE,
  delivered_at      TIMESTAMP WITH TIME ZONE,
  estimated_time    INTEGER, -- minutes
  actual_time       INTEGER, -- minutes
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- IIKO SYNC DATA (IIKO INTEGRATSIYA)
-- ============================================================
CREATE TABLE iiko_sync_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id     UUID REFERENCES branches(id) ON DELETE SET NULL,
  sync_type     VARCHAR(50) NOT NULL,
  status        VARCHAR(20) NOT NULL, -- success, error
  records_count INTEGER DEFAULT 0,
  error_message TEXT,
  synced_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE iiko_orders (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id         UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  iiko_id           VARCHAR(100) NOT NULL,
  order_number      VARCHAR(50),
  order_type        VARCHAR(50),
  total_amount      DECIMAL(12,2),
  payment_method    VARCHAR(50),
  cooking_time      INTEGER, -- seconds
  delivery_time     INTEGER, -- seconds
  courier_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  status            VARCHAR(50),
  created_at_iiko   TIMESTAMP WITH TIME ZONE,
  synced_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(iiko_id, branch_id)
);

-- ============================================================
-- NOTIFICATIONS (BILDIRISHNOMALAR)
-- ============================================================
CREATE TYPE notification_type AS ENUM (
  'task_new', 'task_overdue', 'task_done',
  'shortage', 'surplus', 'low_stock',
  'payment_due', 'payment_received',
  'delivery_assigned', 'delivery_late',
  'shift_open', 'shift_close',
  'ai_alert', 'system'
);

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        notification_type NOT NULL,
  title       VARCHAR(300) NOT NULL,
  body        TEXT,
  data        JSONB,
  is_read     BOOLEAN DEFAULT false,
  sent_telegram BOOLEAN DEFAULT false,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- AI REPORTS (SUN'IY INTELLEKT HISOBOTLARI)
-- ============================================================
CREATE TABLE ai_reports (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id   UUID REFERENCES branches(id) ON DELETE SET NULL,
  report_type VARCHAR(50) NOT NULL, -- daily, weekly, alert
  content     TEXT NOT NULL,
  data        JSONB,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE ai_conversations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question    TEXT NOT NULL,
  answer      TEXT NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- CLEANING REPORTS (TOZALASH HISOBOTLARI)
-- ============================================================
CREATE TYPE cleaning_type AS ENUM ('daily', 'weekly', 'monthly', 'general');

CREATE TABLE cleaning_reports (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id     UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  cleaning_type cleaning_type NOT NULL,
  performed_by  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  verified_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  photo_urls    TEXT[],
  notes         TEXT,
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- KPI METRICS (KPI KO'RSATKICHLAR)
-- ============================================================
CREATE TABLE kpi_daily (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id           UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  date                DATE NOT NULL,
  total_revenue       DECIMAL(15,2) DEFAULT 0,
  total_orders        INTEGER DEFAULT 0,
  avg_check           DECIMAL(12,2) DEFAULT 0,
  avg_cooking_time    DECIMAL(8,2) DEFAULT 0,
  avg_delivery_time   DECIMAL(8,2) DEFAULT 0,
  total_expenses      DECIMAL(15,2) DEFAULT 0,
  shortage_amount     DECIMAL(15,2) DEFAULT 0,
  surplus_amount      DECIMAL(15,2) DEFAULT 0,
  tasks_completed     INTEGER DEFAULT 0,
  tasks_overdue       INTEGER DEFAULT 0,
  customer_complaints INTEGER DEFAULT 0,
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(branch_id, date)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_branch ON users(branch_id);
CREATE INDEX idx_attendance_user_date ON attendance(user_id, check_in);
CREATE INDEX idx_revenues_branch_date ON revenues(branch_id, date);
CREATE INDEX idx_expenses_branch_date ON expenses(branch_id, date);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to, status);
CREATE INDEX idx_tasks_branch ON tasks(branch_id, status);
CREATE INDEX idx_deliveries_courier ON deliveries(courier_id, status);
CREATE INDEX idx_deliveries_branch ON deliveries(branch_id, created_at);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_iiko_orders_branch ON iiko_orders(branch_id, created_at_iiko);
CREATE INDEX idx_kpi_daily_branch_date ON kpi_daily(branch_id, date);
CREATE INDEX idx_stock_branch ON stock(branch_id);
CREATE INDEX idx_reminders_user_time ON reminders(user_id, remind_at, is_sent);

-- ============================================================
-- TRIGGERS - updated_at auto-update
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_branches_updated_at BEFORE UPDATE ON branches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_deliveries_updated_at BEFORE UPDATE ON deliveries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_aggregator_updated_at BEFORE UPDATE ON aggregator_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TRIGGER - auto mark tasks as overdue
-- ============================================================
CREATE OR REPLACE FUNCTION check_task_overdue()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.due_date < NOW() AND NEW.status NOT IN ('done', 'cancelled') THEN
    NEW.status = 'overdue';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_task_overdue BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION check_task_overdue();
