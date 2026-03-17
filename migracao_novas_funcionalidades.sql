-- ============================================================
-- MIGRAÇÃO: Novas Funcionalidades AgendaI
-- Execute este script no Supabase SQL Editor
-- Data: Março 2026
-- ============================================================

-- ============================================================
-- 1. TABELA: businesses
-- Novos campos: WhatsApp (WAHA) + Pagamento (AbacatePay)
-- ============================================================

-- WhatsApp
ALTER TABLE "Agenda2".businesses
    ADD COLUMN IF NOT EXISTS whatsapp_habilitado BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS waha_url TEXT,
    ADD COLUMN IF NOT EXISTS waha_session TEXT,
    ADD COLUMN IF NOT EXISTS waha_api_key TEXT,
    ADD COLUMN IF NOT EXISTS msg_confirmacao TEXT,
    ADD COLUMN IF NOT EXISTS msg_lembrete TEXT,
    ADD COLUMN IF NOT EXISTS msg_cancelamento TEXT,
    ADD COLUMN IF NOT EXISTS msg_pos_atendimento TEXT,
    ADD COLUMN IF NOT EXISTS lembrete_horas_antes INTEGER[];

-- Pagamento AbacatePay
ALTER TABLE "Agenda2".businesses
    ADD COLUMN IF NOT EXISTS pagamento_habilitado BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS abacatepay_api_key TEXT,
    ADD COLUMN IF NOT EXISTS modo_cobranca TEXT CHECK (modo_cobranca IN ('total', 'sinal')),
    ADD COLUMN IF NOT EXISTS sinal_tipo TEXT CHECK (sinal_tipo IN ('percent', 'fixed')),
    ADD COLUMN IF NOT EXISTS sinal_valor NUMERIC,
    ADD COLUMN IF NOT EXISTS pagamento_expiracao_min INTEGER DEFAULT 60;

-- ============================================================
-- 2. TABELA: professionals
-- Novos campos: Comissionamento
-- ============================================================

ALTER TABLE "Agenda2".professionals
    ADD COLUMN IF NOT EXISTS commission_type TEXT DEFAULT 'none' CHECK (commission_type IN ('percent', 'fixed', 'none')),
    ADD COLUMN IF NOT EXISTS commission_value NUMERIC;

-- ============================================================
-- 3. TABELA: appointments
-- Novos campos: Controle de pagamento
-- ============================================================

ALTER TABLE "Agenda2".appointments
    ADD COLUMN IF NOT EXISTS status_pagamento TEXT DEFAULT 'isento' CHECK (status_pagamento IN ('pendente', 'pago', 'expirado', 'isento')),
    ADD COLUMN IF NOT EXISTS abacatepay_charge_id TEXT,
    ADD COLUMN IF NOT EXISTS valor_pago NUMERIC,
    ADD COLUMN IF NOT EXISTS pago_em TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS expira_em TIMESTAMP WITH TIME ZONE;

-- ============================================================
-- 4. ÍNDICES DE PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_appointments_status_pagamento
    ON "Agenda2".appointments (status_pagamento);

CREATE INDEX IF NOT EXISTS idx_appointments_expira_em
    ON "Agenda2".appointments (expira_em)
    WHERE status_pagamento = 'pendente';

CREATE INDEX IF NOT EXISTS idx_appointments_charge_id
    ON "Agenda2".appointments (abacatepay_charge_id)
    WHERE abacatepay_charge_id IS NOT NULL;

-- ============================================================
-- 5. FUNÇÃO: Expirar PIX vencidos automaticamente
-- Execute periodicamente via Supabase Cron ou pg_cron
-- ============================================================

CREATE OR REPLACE FUNCTION "Agenda2".expirar_pagamentos_pendentes()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE "Agenda2".appointments
    SET status_pagamento = 'expirado'
    WHERE
        status_pagamento = 'pendente'
        AND expira_em IS NOT NULL
        AND expira_em < NOW();
END;
$$;

-- Para agendar a função a cada 5 minutos via pg_cron (habilitar extensão pg_cron no Supabase):
-- SELECT cron.schedule('expirar-pix', '*/5 * * * *', $$SELECT "Agenda2".expirar_pagamentos_pendentes()$$);

-- ============================================================
-- 6. VERIFICAÇÃO FINAL
-- ============================================================

SELECT
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE
    table_schema = 'Agenda2'
    AND table_name IN ('businesses', 'professionals', 'appointments')
    AND column_name IN (
        'whatsapp_habilitado', 'waha_url', 'waha_session', 'waha_api_key',
        'msg_confirmacao', 'msg_lembrete', 'msg_cancelamento', 'msg_pos_atendimento', 'lembrete_horas_antes',
        'pagamento_habilitado', 'abacatepay_api_key', 'modo_cobranca', 'sinal_tipo', 'sinal_valor', 'pagamento_expiracao_min',
        'commission_type', 'commission_value',
        'status_pagamento', 'abacatepay_charge_id', 'valor_pago', 'pago_em', 'expira_em'
    )
ORDER BY table_name, column_name;
