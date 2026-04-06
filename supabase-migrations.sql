-- ============================================================
-- GymApp — Migrações Supabase
-- Executar no SQL Editor do Supabase Dashboard
-- ============================================================

-- 1. GRUPOS FAMILIARES (sem dependências — criar primeiro)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS family_groups (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT NOT NULL,
  discount_per_member  NUMERIC(6,2) NOT NULL DEFAULT 5,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- 2. NOVOS CAMPOS NA TABELA MEMBERS (depende de family_groups)
-- -----------------------------------------------------------
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS emergency_contact_name  TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS address                 TEXT,
  ADD COLUMN IF NOT EXISTS postal_code             TEXT,
  ADD COLUMN IF NOT EXISTS city                    TEXT,
  ADD COLUMN IF NOT EXISTS billing_name            TEXT,
  ADD COLUMN IF NOT EXISTS billing_nif             TEXT,
  ADD COLUMN IF NOT EXISTS source                  TEXT,
  ADD COLUMN IF NOT EXISTS family_group_id         UUID REFERENCES family_groups(id) ON DELETE SET NULL;


-- 3. ESTADOS MENSAIS DE PAGAMENTO
-- -----------------------------------------------------------
-- Regista meses especiais: Skip, Férias, Oferta, Exit
-- Um override por membro por mês (unique constraint)
CREATE TABLE IF NOT EXISTS payment_month_overrides (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  month       TEXT NOT NULL,   -- formato YYYY-MM
  status      TEXT NOT NULL CHECK (status IN ('Skip', 'Ferias', 'Oferta', 'Exit')),
  note        TEXT,
  created_by  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (member_id, month)
);

-- Índice para queries por mês
CREATE INDEX IF NOT EXISTS idx_payment_month_overrides_month
  ON payment_month_overrides (month);

-- Índice para queries por membro
CREATE INDEX IF NOT EXISTS idx_payment_month_overrides_member
  ON payment_month_overrides (member_id);


-- 4. MÉTODOS DE PAGAMENTO ADICIONAIS
-- -----------------------------------------------------------
-- Se tiveres uma constraint CHECK na coluna method da tabela payments,
-- adicionar TB (transferência bancária) e MB (Multibanco):
-- ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_method_check;
-- ALTER TABLE payments ADD CONSTRAINT payments_method_check
--   CHECK (method IN ('DD', 'TPA_CARD', 'TPA_MBWAY', 'CASH', 'TB', 'MB'));
