-- ==============================================================================
-- SCRIPT DE CONFIGURAÇÃO DE BANCO DE DADOS: AGENTDAI (SUPABASE)
-- Esquema: Agenda2
-- ==============================================================================

-- 1. Criação do Schema e Extensões
CREATE SCHEMA IF NOT EXISTS "Agenda2";
-- Utilizamos gen_random_uuid() nativa do Postgres, dispensando a extensão uuid-ossp

-- Define o schema de busca padrão para esta sessão
SET search_path TO "Agenda2", public;

-- ==============================================================================
-- CRIAÇÃO DAS TABELAS (Schema: Agenda2)
-- ==============================================================================

-- 1.5. Limpando tabelas antigas se existirem (para evitar erros de conflito de tipos de testes anteriores)
DROP TABLE IF EXISTS "Agenda2".appointments CASCADE;
DROP TABLE IF EXISTS "Agenda2".blocked_times CASCADE;
DROP TABLE IF EXISTS "Agenda2".professional_services CASCADE;
DROP TABLE IF EXISTS "Agenda2".services CASCADE;
DROP TABLE IF EXISTS "Agenda2".professionals CASCADE;
DROP TABLE IF EXISTS "Agenda2".business_hours CASCADE;
DROP TABLE IF EXISTS "Agenda2".businesses CASCADE;

-- 2. Tabela de Negócios
CREATE TABLE IF NOT EXISTS "Agenda2".businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#5A5A40',
  font_family TEXT DEFAULT 'font-sans',
  bg_color TEXT DEFAULT '#f5f5f0',
  text_color TEXT DEFAULT '#141414',
  appointment_duration_minutes INTEGER DEFAULT 30,
  services TEXT[], 
  show_address BOOLEAN DEFAULT false,
  show_reference BOOLEAN DEFAULT false,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT DEFAULT 'trialing' CHECK (subscription_status IN ('active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete')),
  plan_type TEXT DEFAULT 'free',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de Horários de Funcionamento
CREATE TABLE IF NOT EXISTS "Agenda2".business_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES "Agenda2".businesses(id) ON DELETE CASCADE NOT NULL,
  weekday INTEGER NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
  open_time TIME NOT NULL,
  close_time TIME NOT NULL,
  is_closed BOOLEAN DEFAULT false,
  UNIQUE(business_id, weekday)
);

-- 4. Tabela de Serviços
CREATE TABLE IF NOT EXISTS "Agenda2".services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES "Agenda2".businesses(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  price NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabela de Profissionais
CREATE TABLE IF NOT EXISTS "Agenda2".professionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES "Agenda2".businesses(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT DEFAULT 'employee',
  avatar_url TEXT,
  bio TEXT,
  access_screens TEXT[] DEFAULT ARRAY['agenda']::TEXT[],
  login_user TEXT,
  login_pass TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Tabela de Relacionamento (Profissional-Serviço)
CREATE TABLE IF NOT EXISTS "Agenda2".professional_services (
  professional_id UUID REFERENCES "Agenda2".professionals(id) ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES "Agenda2".services(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (professional_id, service_id)
);

-- 7. Tabela de Agendamentos
CREATE TABLE IF NOT EXISTS "Agenda2".appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES "Agenda2".businesses(id) ON DELETE CASCADE NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  client_email TEXT NOT NULL,
  notes TEXT,
  service TEXT, 
  client_id TEXT,
  address TEXT,
  reference TEXT,
  reference_image_url TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  service_id UUID REFERENCES "Agenda2".services(id) ON DELETE SET NULL,
  professional_id UUID REFERENCES "Agenda2".professionals(id) ON DELETE SET NULL,
  attended BOOLEAN,
  final_price NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Tabela de Horários Bloqueados
CREATE TABLE IF NOT EXISTS "Agenda2".blocked_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES "Agenda2".businesses(id) ON DELETE CASCADE NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- ÍNDICES DE PERFORMANCE (Schema: Agenda2)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_businesses_slug ON "Agenda2".businesses(slug);
CREATE INDEX IF NOT EXISTS idx_appointments_business_date ON "Agenda2".appointments(business_id, start_time);
CREATE INDEX IF NOT EXISTS idx_blocked_business_date ON "Agenda2".blocked_times(business_id, start_time);
CREATE INDEX IF NOT EXISTS idx_services_business_id ON "Agenda2".services(business_id);
CREATE INDEX IF NOT EXISTS idx_professionals_business_id ON "Agenda2".professionals(business_id);
CREATE INDEX IF NOT EXISTS idx_business_hours_business_id ON "Agenda2".business_hours(business_id);
CREATE INDEX IF NOT EXISTS idx_prof_serv_prof_id ON "Agenda2".professional_services(professional_id);
CREATE INDEX IF NOT EXISTS idx_prof_serv_serv_id ON "Agenda2".professional_services(service_id);

-- ==============================================================================
-- HABILITAR ROW LEVEL SECURITY (RLS) E SEGURANÇA
-- ==============================================================================

-- Conceder acesso de uso ao schema para roles autenticadas e anônimas
GRANT USAGE ON SCHEMA "Agenda2" TO authenticated, anon, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA "Agenda2" TO authenticated, anon, service_role;

ALTER TABLE "Agenda2".businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Agenda2".business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Agenda2".services ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Agenda2".professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Agenda2".professional_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Agenda2".blocked_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Agenda2".appointments ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- POLÍTICAS DE ACESSO OTIMIZADAS (RLS)
-- ==============================================================================

-- 9. Negócios
CREATE POLICY "RLS_Optimized_Businesses_All" ON "Agenda2".businesses
    FOR ALL USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Leitura pública para negócios ativos" ON "Agenda2".businesses
    FOR SELECT USING (true);

-- 10. Horários de Funcionamento
CREATE POLICY "RLS_Optimized_BusinessHours_All" ON "Agenda2".business_hours
    FOR ALL USING (business_id IN (SELECT id FROM "Agenda2".businesses WHERE user_id = auth.uid()));

CREATE POLICY "RLS_Optimized_BusinessHours_Select" ON "Agenda2".business_hours
    FOR SELECT USING (true);

-- 11. Serviços
CREATE POLICY "RLS_Optimized_Services_All" ON "Agenda2".services
    FOR ALL USING (business_id IN (SELECT id FROM "Agenda2".businesses WHERE user_id = auth.uid()));

CREATE POLICY "Leitura publica de servicos" ON "Agenda2".services
    FOR SELECT USING (true);

-- 12. Profissionais
CREATE POLICY "RLS_Optimized_Professionals_All" ON "Agenda2".professionals
    FOR ALL USING (business_id IN (SELECT id FROM "Agenda2".businesses WHERE user_id = auth.uid()));

CREATE POLICY "Leitura publica de profissionais" ON "Agenda2".professionals
    FOR SELECT USING (true);

-- 13. Relacionamento Profissional-Serviço
CREATE POLICY "RLS_Optimized_ProfServices_All" ON "Agenda2".professional_services
    FOR ALL USING (
        professional_id IN (
            SELECT id FROM "Agenda2".professionals WHERE business_id IN (SELECT id FROM "Agenda2".businesses WHERE user_id = auth.uid())
        )
    );

CREATE POLICY "Leitura publica de prof_servicos" ON "Agenda2".professional_services
    FOR SELECT USING (true);

-- 14. Horários Bloqueados
CREATE POLICY "RLS_Optimized_BlockedTimes_All" ON "Agenda2".blocked_times
    FOR ALL USING (business_id IN (SELECT id FROM "Agenda2".businesses WHERE user_id = auth.uid()));

CREATE POLICY "RLS_Optimized_BlockedTimes_Select" ON "Agenda2".blocked_times
    FOR SELECT USING (true);

-- 15. Agendamentos
CREATE POLICY "RLS_Optimized_Appointments_Manager" ON "Agenda2".appointments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM "Agenda2".businesses 
            WHERE "Agenda2".businesses.id = "Agenda2".appointments.business_id 
            AND "Agenda2".businesses.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM "Agenda2".professionals
            WHERE "Agenda2".professionals.id = "Agenda2".appointments.professional_id
            AND "Agenda2".professionals.user_id = auth.uid()
        )
    );

CREATE POLICY "Permitir leitura pública na agenda para exibição e login custom" ON "Agenda2".appointments
    FOR SELECT USING (true);

CREATE POLICY "Permitir criacao publica de agendamentos" ON "Agenda2".appointments
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Leitura publica update em agendamentos" ON "Agenda2".appointments
    FOR UPDATE USING (true);
