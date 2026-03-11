-- ==============================================================================
-- SCRIPT DE CONFIGURAÇÃO DE BANCO DE DADOS: AGENTDAI (SUPABASE)
-- Esquema padrão: public
-- ==============================================================================

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Limpar políticas e tabelas (se existirem, para garantir uma instalação limpa)
-- Cuidado: Isso não apaga os dados se a tabela existir, mas é uma boa prática
-- DROP TABLE IF EXISTS professional_services CASCADE;
-- DROP TABLE IF EXISTS appointments CASCADE;
-- DROP TABLE IF EXISTS blocked_times CASCADE;
-- DROP TABLE IF EXISTS services CASCADE;
-- DROP TABLE IF EXISTS professionals CASCADE;
-- DROP TABLE IF EXISTS business_hours CASCADE;
-- DROP TABLE IF EXISTS businesses CASCADE;

-- ==============================================================================
-- CRIAÇÃO DAS TABELAS
-- ==============================================================================

-- 3. Tabela de Negócios
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#5A5A40',
  font_family TEXT DEFAULT 'font-sans',
  bg_color TEXT DEFAULT '#f5f5f0',
  text_color TEXT DEFAULT '#141414',
  appointment_duration_minutes INTEGER DEFAULT 30,
  services TEXT[], -- Para compatibilidade com string[] no frontend antigo (legado)
  show_address BOOLEAN DEFAULT false,
  show_reference BOOLEAN DEFAULT false,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT DEFAULT 'trialing' CHECK (subscription_status IN ('active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete')),
  plan_type TEXT DEFAULT 'free',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela de Horários de Funcionamento
CREATE TABLE IF NOT EXISTS business_hours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  weekday INTEGER NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
  open_time TIME NOT NULL,
  close_time TIME NOT NULL,
  is_closed BOOLEAN DEFAULT false,
  UNIQUE(business_id, weekday)
);

-- 5. Tabela de Serviços
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  price NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Tabela de Profissionais
CREATE TABLE IF NOT EXISTS professionals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
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

-- 7. Tabela de Relacionamento (Profissional-Serviço)
CREATE TABLE IF NOT EXISTS professional_services (
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (professional_id, service_id)
);

-- 8. Tabela de Agendamentos
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  client_email TEXT NOT NULL,
  notes TEXT,
  service TEXT, -- Campo texto legado
  client_id TEXT,
  address TEXT,
  reference TEXT,
  reference_image_url TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  professional_id UUID REFERENCES professionals(id) ON DELETE SET NULL,
  attended BOOLEAN,
  final_price NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Tabela de Horários Bloqueados
CREATE TABLE IF NOT EXISTS blocked_times (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- ÍNDICES DE PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_businesses_slug ON businesses(slug);
CREATE INDEX IF NOT EXISTS idx_appointments_business_date ON appointments(business_id, start_time);
CREATE INDEX IF NOT EXISTS idx_blocked_business_date ON blocked_times(business_id, start_time);
CREATE INDEX IF NOT EXISTS idx_services_business_id ON services(business_id);
CREATE INDEX IF NOT EXISTS idx_professionals_business_id ON professionals(business_id);
CREATE INDEX IF NOT EXISTS idx_business_hours_business_id ON business_hours(business_id);
CREATE INDEX IF NOT EXISTS idx_prof_serv_prof_id ON professional_services(professional_id);
CREATE INDEX IF NOT EXISTS idx_prof_serv_serv_id ON professional_services(service_id);

-- ==============================================================================
-- HABILITAR ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- POLÍTICAS DE ACESSO OTIMIZADAS
-- ==============================================================================

-- 10. Negócios
CREATE POLICY "RLS_Optimized_Businesses_All" ON businesses
    FOR ALL USING (user_id = (SELECT auth.uid()))
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Leitura pública para negócios ativos" ON businesses
    FOR SELECT USING (true);

-- 11. Horários de Funcionamento
CREATE POLICY "RLS_Optimized_BusinessHours_All" ON business_hours
    FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "RLS_Optimized_BusinessHours_Select" ON business_hours
    FOR SELECT USING (true);

-- 12. Serviços
CREATE POLICY "RLS_Optimized_Services_All" ON services
    FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "Leitura publica de servicos" ON services
    FOR SELECT USING (true);

-- 13. Profissionais
CREATE POLICY "RLS_Optimized_Professionals_All" ON professionals
    FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "Leitura publica de profissionais" ON professionals
    FOR SELECT USING (true);

-- 14. Relacionamento Profissional-Serviço
CREATE POLICY "RLS_Optimized_ProfServices_All" ON professional_services
    FOR ALL USING (
        professional_id IN (
            SELECT id FROM professionals WHERE business_id IN (SELECT id FROM businesses WHERE user_id = (SELECT auth.uid()))
        )
    );

CREATE POLICY "Leitura publica de prof_servicos" ON professional_services
    FOR SELECT USING (true);

-- 15. Horários Bloqueados
CREATE POLICY "RLS_Optimized_BlockedTimes_All" ON blocked_times
    FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "RLS_Optimized_BlockedTimes_Select" ON blocked_times
    FOR SELECT USING (true);

-- 16. Agendamentos
CREATE POLICY "RLS_Optimized_Appointments_Manager" ON appointments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM businesses 
            WHERE businesses.id = appointments.business_id 
            AND businesses.user_id = (SELECT auth.uid())
        )
        OR
        EXISTS (
            SELECT 1 FROM professionals
            WHERE professionals.id = appointments.professional_id
            AND professionals.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Permitir leitura pública na agenda para exibição e login custom" ON appointments
    FOR SELECT USING (true);

CREATE POLICY "Permitir criacao publica de agendamentos" ON appointments
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Leitura publica update em agendamentos" ON appointments
    FOR UPDATE USING (true);
