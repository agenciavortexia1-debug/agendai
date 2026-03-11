-- ==============================================================================
-- SCRIPT DE EMERGÊNCIA: FORÇAR CRIAÇÃO DO SCHEMA STORAGE
-- ==============================================================================
-- Se o seu Supabase no Easypanel falhou ao rodar a migração do Storage nativo,
-- a API do Storage (tela onde deu erro) vai quebrar.
-- Este script força a criação do esquema básico para a API conseguir ligar.

-- 1. Cria o schema storage
CREATE SCHEMA IF NOT EXISTS storage;

-- 2. Concede as permissões básicas para o banco gerenciar
GRANT USAGE ON SCHEMA storage TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA storage TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA storage TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA storage TO postgres, anon, authenticated, service_role;

-- 3. Cria a tabela de Buckets
CREATE TABLE IF NOT EXISTS storage.buckets (
    id text NOT NULL PRIMARY KEY,
    name text NOT NULL,
    owner uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[]
);

-- 4. Cria a tabela de Objetos (Arquivos)
CREATE TABLE IF NOT EXISTS storage.objects (
    id uuid NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    bucket_id text REFERENCES storage.buckets(id),
    name text,
    owner uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    last_accessed_at timestamptz DEFAULT now(),
    metadata jsonb,
    version text
);

-- 5. Criação do Bucket de Storage (agendai-uploads)
INSERT INTO storage.buckets (id, name, public)
VALUES ('agendai-uploads', 'agendai-uploads', true)
ON CONFLICT (id) DO NOTHING;
