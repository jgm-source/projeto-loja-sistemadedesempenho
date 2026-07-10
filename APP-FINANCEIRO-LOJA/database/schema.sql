-- =============================================================================
-- APP FINANCEIRO LOJA — SCHEMA SUPABASE
-- =============================================================================

-- 1. TABELA: closing_items
-- Armazena cada item lançado no fechamento do dia (ex: Salgados, Bebidas)
CREATE TABLE IF NOT EXISTS closing_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date              DATE NOT NULL,
  item_name         VARCHAR(255) NOT NULL,
  amount            DECIMAL(10,2) NOT NULL,
  is_inconsistency  BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para buscar fechamentos por data e usuário
CREATE INDEX IF NOT EXISTS idx_closing_items_user_date
  ON closing_items(user_id, date);

-- 2. TABELA: daily_closings
-- Resumo do fechamento do dia (guarda manual_total se digitado manualmente)
CREATE TABLE IF NOT EXISTS daily_closings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date              DATE NOT NULL,
  manual_total      DECIMAL(10,2),
  calculated_total  DECIMAL(10,2) NOT NULL,
  inconsistency     DECIMAL(10,2) DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_closings_user_date
  ON daily_closings(user_id, date);

-- 3. POLÍTICAS DE SEGURANÇA (RLS)
-- Habilitar RLS nas tabelas
ALTER TABLE closing_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_closings ENABLE ROW LEVEL SECURITY;

-- Política: usuário só vê seus próprios dados
DROP POLICY IF EXISTS "Usuários podem ver seus próprios closing_items" ON closing_items;
CREATE POLICY "Usuários podem ver seus próprios closing_items"
  ON closing_items FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem inserir seus próprios closing_items" ON closing_items;
CREATE POLICY "Usuários podem inserir seus próprios closing_items"
  ON closing_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem ver seus próprios daily_closings" ON daily_closings;
CREATE POLICY "Usuários podem ver seus próprios daily_closings"
  ON daily_closings FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem inserir seus próprios daily_closings" ON daily_closings;
CREATE POLICY "Usuários podem inserir seus próprios daily_closings"
  ON daily_closings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios daily_closings" ON daily_closings;
CREATE POLICY "Usuários podem atualizar seus próprios daily_closings"
  ON daily_closings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Políticas DELETE (necessárias para edição com mudança de data)
DROP POLICY IF EXISTS "Usuários podem deletar seus próprios closing_items" ON closing_items;
CREATE POLICY "Usuários podem deletar seus próprios closing_items"
  ON closing_items FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem deletar seus próprios daily_closings" ON daily_closings;
CREATE POLICY "Usuários podem deletar seus próprios daily_closings"
  ON daily_closings FOR DELETE
  USING (auth.uid() = user_id);
