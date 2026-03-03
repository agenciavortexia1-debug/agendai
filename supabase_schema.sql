-- SQL para Supabase (PostgreSQL)
-- Sistema de Agendamento SaaS

-- 1. Tabela de Negócios
CREATE TABLE businesses (
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
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT DEFAULT 'trialing' CHECK (subscription_status IN ('active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete')),
  plan_type TEXT DEFAULT 'free',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela de Horários de Funcionamento
CREATE TABLE business_hours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  weekday INTEGER NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
  open_time TIME NOT NULL,
  close_time TIME NOT NULL,
  is_closed BOOLEAN DEFAULT false,
  UNIQUE(business_id, weekday)
);

-- 3. Tabela de Agendamentos
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  client_email TEXT NOT NULL,
  notes TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela de Horários Bloqueados
CREATE TABLE blocked_times (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Índices para Performance
CREATE INDEX idx_businesses_slug ON businesses(slug);
CREATE INDEX idx_appointments_business_date ON appointments(business_id, start_time);
CREATE INDEX idx_blocked_business_date ON blocked_times(business_id, start_time);

-- 6. Row Level Security (RLS)

-- Habilitar RLS
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_times ENABLE ROW LEVEL SECURITY;

-- Políticas para Businesses
CREATE POLICY "Dono pode gerenciar seu próprio negócio" ON businesses
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Público pode ver informações básicas do negócio" ON businesses
  FOR SELECT USING (true);

-- Políticas para Business Hours
CREATE POLICY "Dono pode gerenciar seus horários" ON business_hours
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM businesses 
      WHERE businesses.id = business_hours.business_id 
      AND businesses.user_id = auth.uid()
    )
  );

CREATE POLICY "Público pode ver horários" ON business_hours
  FOR SELECT USING (true);

-- Políticas para Appointments
CREATE POLICY "Dono pode ver seus agendamentos" ON appointments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM businesses 
      WHERE businesses.id = appointments.business_id 
      AND businesses.user_id = auth.uid()
    )
  );

CREATE POLICY "Público pode criar agendamentos" ON appointments
  FOR INSERT WITH CHECK (true);

-- Políticas para Blocked Times
CREATE POLICY "Dono pode gerenciar bloqueios" ON blocked_times
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM businesses 
      WHERE businesses.id = blocked_times.business_id 
      AND businesses.user_id = auth.uid()
    )
  );

CREATE POLICY "Público pode ver bloqueios" ON blocked_times
  FOR SELECT USING (true);
