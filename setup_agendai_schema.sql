-- ==============================================================================
-- SCRIPT DE CONFIGURAÇÃO: SCHEMA 'agendai' (PARA SUPABASE SELF-HOSTED)
-- ==============================================================================

-- 1. Criar o Schema
CREATE SCHEMA IF NOT EXISTS agendai;

-- 2. Habilitar extensões necessárias no schema extensions (ou public)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;

-- 3. Tabela de Negócios
CREATE TABLE IF NOT EXISTS agendai.businesses (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#5A5A40',
  font_family TEXT DEFAULT 'font-sans',
  bg_color TEXT DEFAULT '#f5f5f0',
  text_color TEXT DEFAULT '#141414',
  appointment_duration_minutes INTEGER DEFAULT 30,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT DEFAULT 'trialing' CHECK (subscription_status IN ('active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete')),
  plan_type TEXT DEFAULT 'free',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela de Horários de Funcionamento
CREATE TABLE IF NOT EXISTS agendai.business_hours (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  business_id UUID REFERENCES agendai.businesses(id) ON DELETE CASCADE NOT NULL,
  weekday INTEGER NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
  open_time TIME NOT NULL,
  close_time TIME NOT NULL,
  is_closed BOOLEAN DEFAULT false,
  UNIQUE(business_id, weekday)
);

-- 5. Tabela de Profissionais
CREATE TABLE IF NOT EXISTS agendai.professionals (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  business_id UUID REFERENCES agendai.businesses(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  bio TEXT,
  role TEXT DEFAULT 'employee',
  access_screens TEXT[] DEFAULT ARRAY['agenda']::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Tabela de Serviços
CREATE TABLE IF NOT EXISTS agendai.services (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  business_id UUID REFERENCES agendai.businesses(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  price NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Tabela de Relacionamento (Profissional-Serviço)
CREATE TABLE IF NOT EXISTS agendai.professional_services (
  professional_id UUID REFERENCES agendai.professionals(id) ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES agendai.services(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (professional_id, service_id)
);

-- 8. Tabela de Agendamentos
CREATE TABLE IF NOT EXISTS agendai.appointments (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  business_id UUID REFERENCES agendai.businesses(id) ON DELETE CASCADE NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  client_email TEXT NOT NULL,
  notes TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  service_id UUID REFERENCES agendai.services(id) ON DELETE SET NULL,
  professional_id UUID REFERENCES agendai.professionals(id) ON DELETE SET NULL,
  attended BOOLEAN,
  final_price NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Tabela de Horários Bloqueados
CREATE TABLE IF NOT EXISTS agendai.blocked_times (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  business_id UUID REFERENCES agendai.businesses(id) ON DELETE CASCADE NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Índices
CREATE INDEX IF NOT EXISTS idx_businesses_slug ON agendai.businesses(slug);
CREATE INDEX IF NOT EXISTS idx_appointments_business_date ON agendai.appointments(business_id, start_time);
CREATE INDEX IF NOT EXISTS idx_blocked_business_date ON agendai.blocked_times(business_id, start_time);

-- 11. RLS (Segurança)
ALTER TABLE agendai.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendai.business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendai.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendai.blocked_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendai.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendai.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendai.professional_services ENABLE ROW LEVEL SECURITY;

-- Políticas Simplificadas (Acesso para Dono e Público)
CREATE POLICY "Leitura pública" ON agendai.businesses FOR SELECT USING (true);
CREATE POLICY "Dono gerencia tudo" ON agendai.businesses FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Leitura pública" ON agendai.services FOR SELECT USING (true);
CREATE POLICY "Dono gerencia tudo" ON agendai.services FOR ALL USING (business_id IN (SELECT id FROM agendai.businesses WHERE user_id = auth.uid()));

CREATE POLICY "Leitura pública" ON agendai.business_hours FOR SELECT USING (true);
CREATE POLICY "Dono gerencia tudo" ON agendai.business_hours FOR ALL USING (business_id IN (SELECT id FROM agendai.businesses WHERE user_id = auth.uid()));

CREATE POLICY "Leitura pública" ON agendai.professionals FOR SELECT USING (true);
CREATE POLICY "Dono gerencia tudo" ON agendai.professionals FOR ALL USING (business_id IN (SELECT id FROM agendai.businesses WHERE user_id = auth.uid()));

CREATE POLICY "Leitura pública" ON agendai.professional_services FOR SELECT USING (true);
CREATE POLICY "Dono gerencia tudo" ON agendai.professional_services FOR ALL USING (professional_id IN (SELECT id FROM agendai.professionals WHERE business_id IN (SELECT id FROM agendai.businesses WHERE user_id = auth.uid())));

CREATE POLICY "Público agenda e Dono vê" ON agendai.appointments FOR ALL USING (
    business_id IN (SELECT id FROM agendai.businesses WHERE user_id = auth.uid()) 
    OR true -- Simplificando para teste, depois restringimos o INSERT
);

CREATE POLICY "Leitura pública" ON agendai.blocked_times FOR SELECT USING (true);
CREATE POLICY "Dono gerencia tudo" ON agendai.blocked_times FOR ALL USING (business_id IN (SELECT id FROM agendai.businesses WHERE user_id = auth.uid()));

-- ==============================================================================
-- 12. PERMISSÕES DE API (CRÍTICO PARA SELF-HOSTED)
-- Se o seu Supabase usar o PostgREST no schema 'public' por padrão, 
-- você precisa dar permissão para o papel 'anon' e 'authenticated' lerem o schema 'agendai'.
-- ==============================================================================
GRANT USAGE ON SCHEMA agendai TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA agendai TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA agendai TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA agendai TO anon, authenticated;
