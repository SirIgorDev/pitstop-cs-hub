
-- ==========================================================================
-- ENUM de papéis
-- ==========================================================================
CREATE TYPE public.app_role AS ENUM ('analyst', 'coordinator', 'admin');

-- ==========================================================================
-- Tabela: profiles
-- ==========================================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role public.app_role NOT NULL DEFAULT 'analyst',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ==========================================================================
-- Tabela: user_roles (fonte-verdade de papel, separada por segurança)
-- ==========================================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ==========================================================================
-- Função has_role (SECURITY DEFINER, evita recursão nas RLS)
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- ==========================================================================
-- Função is_active (bloqueia usuários inativos)
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.is_active(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT ativo AND deleted_at IS NULL FROM public.profiles WHERE id = _user_id),
    false
  )
$$;

-- ==========================================================================
-- Trigger: updated_at
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ==========================================================================
-- Trigger: criar profile automaticamente ao criar usuário no auth
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role public.app_role;
  _is_first_user BOOLEAN;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles) INTO _is_first_user;

  _role := CASE
    WHEN _is_first_user THEN 'admin'::public.app_role
    ELSE COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'analyst'::public.app_role)
  END;

  INSERT INTO public.profiles (id, nome, email, role, ativo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    _role,
    true
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================================================
-- RLS: profiles
-- ==========================================================================
-- Usuários ativos podem ver o próprio perfil
CREATE POLICY "profiles_select_own"
ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid());

-- Coordenadores e admins podem ver todos
CREATE POLICY "profiles_select_all_privileged"
ON public.profiles FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'coordinator')
  OR public.has_role(auth.uid(), 'admin')
);

-- Usuário pode atualizar o próprio perfil (campos básicos)
CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid() AND public.is_active(auth.uid()))
WITH CHECK (id = auth.uid());

-- Apenas admins podem atualizar qualquer perfil
CREATE POLICY "profiles_update_admin"
ON public.profiles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Apenas admins podem inserir/excluir perfis manualmente
CREATE POLICY "profiles_insert_admin"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "profiles_delete_admin"
ON public.profiles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ==========================================================================
-- RLS: user_roles
-- ==========================================================================
CREATE POLICY "user_roles_select_own"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "user_roles_select_admin"
ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Escrita em user_roles apenas via service_role/admin (bloqueada por padrão)
-- (nenhuma policy de INSERT/UPDATE/DELETE = negado para authenticated)

-- ==========================================================================
-- Tabela: audit_logs
-- ==========================================================================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  before_data JSONB,
  after_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX audit_logs_entity_idx ON public.audit_logs (entity, entity_id);
CREATE INDEX audit_logs_user_idx ON public.audit_logs (user_id);
CREATE INDEX audit_logs_created_at_idx ON public.audit_logs (created_at DESC);

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ler auditoria
CREATE POLICY "audit_logs_select_admin"
ON public.audit_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Qualquer autenticado ativo pode inserir logs (registros das suas ações)
CREATE POLICY "audit_logs_insert_own"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND public.is_active(auth.uid()));

-- ==========================================================================
-- Trigger genérico de auditoria
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.tg_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _action TEXT;
  _entity_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    _action := 'create';
    _entity_id := NEW.id;
    INSERT INTO public.audit_logs (user_id, action, entity, entity_id, before_data, after_data)
    VALUES (auth.uid(), _action, TG_TABLE_NAME, _entity_id, NULL, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.deleted_at IS DISTINCT FROM OLD.deleted_at AND NEW.deleted_at IS NOT NULL THEN
      _action := 'soft_delete';
    ELSIF TG_TABLE_NAME = 'profiles' AND (NEW.ativo IS DISTINCT FROM OLD.ativo OR NEW.role IS DISTINCT FROM OLD.role) THEN
      _action := 'admin_change';
    ELSE
      _action := 'update';
    END IF;
    _entity_id := NEW.id;
    INSERT INTO public.audit_logs (user_id, action, entity, entity_id, before_data, after_data)
    VALUES (auth.uid(), _action, TG_TABLE_NAME, _entity_id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    _entity_id := OLD.id;
    INSERT INTO public.audit_logs (user_id, action, entity, entity_id, before_data, after_data)
    VALUES (auth.uid(), 'delete', TG_TABLE_NAME, _entity_id, to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER profiles_audit
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.tg_audit();
