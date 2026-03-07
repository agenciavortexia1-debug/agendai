-- ==============================================================================
-- ATUALIZAÇÃO DO BANCO DE DADOS: GERENCIAMENTO DE EQUIPE, SERVIÇOS E FINANCEIRO
-- ==============================================================================

-- 1. Tabela de Profissionais (Funcionários)
CREATE TABLE professionals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Opcional, para login do funcionário
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  bio TEXT,
  role TEXT DEFAULT 'employee', -- 'owner' ou 'employee'
  access_screens TEXT[] DEFAULT ARRAY['agenda']::TEXT[], -- Permissões de tela (RBAC)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela de Serviços (Substituindo o antigo array de strings no business)
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  price NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de Relacionamento (Quais profissionais fazem quais serviços)
CREATE TABLE professional_services (
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (professional_id, service_id)
);

-- 4. Atualizar a tabela de Agendamentos (Appointments)
ALTER TABLE appointments
  ADD COLUMN service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  ADD COLUMN professional_id UUID REFERENCES professionals(id) ON DELETE SET NULL,
  ADD COLUMN attended BOOLEAN, -- null = pendente, true = compareceu, false = faltou
  ADD COLUMN final_price NUMERIC;

-- ==============================================================================
-- POLÍTICAS DE SEGURANÇA (RLS - ROW LEVEL SECURITY)
-- ==============================================================================

ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_services ENABLE ROW LEVEL SECURITY;

-- SERVIÇOS (Services)
CREATE POLICY "Público pode ver serviços" ON services
  FOR SELECT USING (true);

CREATE POLICY "Dono pode gerenciar serviços" ON services
  FOR ALL USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- RELAÇÃO PROFISSIONAL-SERVIÇO (Professional Services)
CREATE POLICY "Público pode ver professional services" ON professional_services
  FOR SELECT USING (true);

CREATE POLICY "Dono pode gerenciar professional_services" ON professional_services
  FOR ALL USING (
    professional_id IN (
      SELECT id FROM professionals WHERE business_id IN (
        SELECT id FROM businesses WHERE user_id = auth.uid()
      )
    )
  );

-- PROFISSIONAIS (Professionals)
CREATE POLICY "Público pode ver profissionais" ON professionals
  FOR SELECT USING (true);

CREATE POLICY "Dono pode gerenciar profissionais" ON professionals
  FOR ALL USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- AGENDAMENTOS (Appointments) - Atualização da política existente
-- Primeiro removemos a antiga política do dono
DROP POLICY IF EXISTS "Dono pode ver seus agendamentos" ON appointments;

-- Criamos uma nova onde: O dono vê tudo da sua loja, o funcionário vê só o dele
CREATE POLICY "Acesso aos agendamentos (Owner e Colaborador)" ON appointments
  FOR ALL USING (
    -- Se for o dono da loja
    EXISTS (
      SELECT 1 FROM businesses 
      WHERE businesses.id = appointments.business_id 
      AND businesses.user_id = auth.uid()
    )
    OR
    -- Se for o profissional atrelado a esse agendamento específico
    EXISTS (
      SELECT 1 FROM professionals
      WHERE professionals.id = appointments.professional_id
      AND professionals.user_id = auth.uid()
    )
  );
