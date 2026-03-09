-- ==============================================================================
-- SCRIPT DE RESTAURAÇÃO: VERSÃO ESTÁVEL V1 (SCHEMA PUBLIC)
-- Instruções: 
-- 1. Vá no SQL Editor do seu Supabase EasyPanel
-- 2. Cole este código inteiro e clique em RUN
-- ==============================================================================

-- 1. Tabela de Negócios
CREATE TABLE IF NOT EXISTS public.businesses (
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
CREATE TABLE IF NOT EXISTS public.business_hours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  weekday INTEGER NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
  open_time TIME NOT NULL,
  close_time TIME NOT NULL,
  is_closed BOOLEAN DEFAULT false,
  UNIQUE(business_id, weekday)
);

-- 3. Tabela de Profissionais (Funcionários)
CREATE TABLE IF NOT EXISTS public.professionals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
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

-- 4. Tabela de Serviços
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  price NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabela de Relacionamento (Quais profissionais fazem quais serviços)
CREATE TABLE IF NOT EXISTS public.professional_services (
  professional_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (professional_id, service_id)
);

-- 6. Tabela de Agendamentos (com suporte a profissional e servicos criados)
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  client_email TEXT NOT NULL,
  notes TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  professional_id UUID REFERENCES public.professionals(id) ON DELETE SET NULL,
  attended BOOLEAN,
  final_price NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Tabela de Horários Bloqueados
CREATE TABLE IF NOT EXISTS public.blocked_times (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 8. ÍNDICES DE PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_businesses_slug ON public.businesses(slug);
CREATE INDEX IF NOT EXISTS idx_appointments_business_date ON public.appointments(business_id, start_time);
CREATE INDEX IF NOT EXISTS idx_blocked_business_date ON public.blocked_times(business_id, start_time);

-- ==============================================================================
-- 9. ROW LEVEL SECURITY (RLS) E POLÍTICAS BÁSICAS
-- ==============================================================================
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_services ENABLE ROW LEVEL SECURITY;

-- As permissões default são abertas usando a chave anon pra garantir que não quebre:
-- O usuário autenticado e até o deslogado vai ler pra renderizar a UI.
-- (Em um cenário real refinaríamos, mas estamos voltando para a versão que funciona lisa):

CREATE POLICY "Acesso público e total (fallback temporario)" ON public.businesses FOR ALL USING (true);
CREATE POLICY "Acesso público e total (fallback temporario)" ON public.business_hours FOR ALL USING (true);
CREATE POLICY "Acesso público e total (fallback temporario)" ON public.appointments FOR ALL USING (true);
CREATE POLICY "Acesso público e total (fallback temporario)" ON public.blocked_times FOR ALL USING (true);
CREATE POLICY "Acesso público e total (fallback temporario)" ON public.professionals FOR ALL USING (true);
CREATE POLICY "Acesso público e total (fallback temporario)" ON public.services FOR ALL USING (true);
CREATE POLICY "Acesso público e total (fallback temporario)" ON public.professional_services FOR ALL USING (true);
