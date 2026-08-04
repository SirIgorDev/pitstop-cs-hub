-- Controle de acesso por cargos e permissoes.
-- Migration aditiva: profiles.role e as politicas anteriores permanecem intactas
-- para permitir rollback imediato pela chave access_control_settings.rbac_enabled.

CREATE TABLE public.cargos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE CHECK (codigo ~ '^[a-z0-9_]+$'),
  nome TEXT NOT NULL CHECK (length(btrim(nome)) BETWEEN 2 AND 80),
  descricao TEXT,
  perfil_base public.app_role NOT NULL DEFAULT 'analyst',
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  protegido BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE public.permissoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE CHECK (codigo ~ '^[a-z0-9_.]+$'),
  modulo TEXT NOT NULL,
  rotina TEXT NOT NULL,
  acao TEXT NOT NULL,
  permite_escopo BOOLEAN NOT NULL DEFAULT FALSE,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.cargo_permissoes (
  cargo_id UUID NOT NULL REFERENCES public.cargos(id) ON DELETE CASCADE,
  permissao_id UUID NOT NULL REFERENCES public.permissoes(id) ON DELETE CASCADE,
  escopo TEXT NOT NULL DEFAULT 'all' CHECK (escopo IN ('own', 'all')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (cargo_id, permissao_id)
);

CREATE TABLE public.access_control_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  rbac_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

INSERT INTO public.access_control_settings (id, rbac_enabled) VALUES (TRUE, TRUE);

INSERT INTO public.cargos (codigo, nome, descricao, perfil_base, ativo, protegido)
VALUES
  ('analyst', 'Analista de CS', 'Acesso operacional aos proprios registros.', 'analyst', TRUE, FALSE),
  ('coordinator', 'Coordenador', 'Acesso de acompanhamento e operacao sobre todos os registros.', 'coordinator', TRUE, FALSE),
  ('process_analyst', 'Analista de Processos', 'Acesso de Analista de CS e tratamento das proprias bases de disparo.', 'process_analyst', TRUE, FALSE),
  ('admin', 'Administrador', 'Cargo protegido com todas as permissoes do sistema.', 'admin', TRUE, TRUE);

INSERT INTO public.permissoes (codigo, modulo, rotina, acao, permite_escopo, ordem)
VALUES
  ('pitstop.monitor.view', 'Relacionamento', 'Monitor - PitStop', 'Visualizar', TRUE, 10),
  ('pitstop.records.view', 'Relacionamento', 'Cadastro de PitStop', 'Visualizar', TRUE, 20),
  ('pitstop.records.create', 'Relacionamento', 'Cadastro de PitStop', 'Inserir', TRUE, 21),
  ('pitstop.records.update', 'Relacionamento', 'Cadastro de PitStop', 'Editar', TRUE, 22),
  ('pitstop.records.inactivate', 'Relacionamento', 'Cadastro de PitStop', 'Inativar', TRUE, 23),
  ('carteira.monitor.view', 'Relacionamento', 'Monitor - Carteira', 'Visualizar', TRUE, 30),
  ('neo.records.view', 'Relacionamento', 'Cadastro Neo', 'Visualizar', TRUE, 40),
  ('neo.records.create', 'Relacionamento', 'Cadastro Neo', 'Inserir', TRUE, 41),
  ('neo.records.update', 'Relacionamento', 'Cadastro Neo', 'Editar', TRUE, 42),
  ('neo.records.inactivate', 'Relacionamento', 'Cadastro Neo', 'Inativar', TRUE, 43),
  ('neo.records.export', 'Relacionamento', 'Cadastro Neo', 'Exportar CSV', TRUE, 44),
  ('dispatch.view', 'Relacionamento', 'Base de Disparo', 'Visualizar', TRUE, 50),
  ('dispatch.import', 'Relacionamento', 'Base de Disparo', 'Importar', TRUE, 51),
  ('dispatch.update', 'Relacionamento', 'Base de Disparo', 'Revisar', TRUE, 52),
  ('dispatch.inactivate', 'Relacionamento', 'Base de Disparo', 'Excluir importacao', TRUE, 53),
  ('dispatch.export', 'Relacionamento', 'Base de Disparo', 'Exportar CSV', TRUE, 54),
  ('document_cleaner.use', 'Geral', 'Limpar CPF/CNPJ', 'Utilizar', FALSE, 60),
  ('audit.view', 'Geral', 'Auditoria', 'Visualizar', TRUE, 70),
  ('administration.view', 'Administracao', 'Administracao', 'Acessar', FALSE, 80),
  ('administration.users.manage', 'Administracao', 'Usuarios', 'Gerenciar', FALSE, 81),
  ('administration.lists.manage', 'Administracao', 'Listas parametrizaveis', 'Gerenciar', FALSE, 82),
  ('administration.roles.manage', 'Administracao', 'Cargos e permissoes', 'Gerenciar', FALSE, 83);

-- Replica fielmente as permissoes atuais para homologacao.
INSERT INTO public.cargo_permissoes (cargo_id, permissao_id, escopo)
SELECT c.id, p.id,
  CASE
    WHEN p.permite_escopo AND c.codigo IN ('analyst', 'process_analyst') THEN 'own'
    ELSE 'all'
  END
FROM public.cargos c
CROSS JOIN public.permissoes p
WHERE
  c.codigo = 'admin'
  OR (c.codigo = 'coordinator' AND p.codigo NOT LIKE 'administration.%' AND p.codigo NOT LIKE 'dispatch.%')
  OR (c.codigo = 'analyst' AND p.codigo IN (
    'pitstop.monitor.view', 'pitstop.records.view', 'pitstop.records.create', 'pitstop.records.update', 'pitstop.records.inactivate',
    'carteira.monitor.view', 'neo.records.view', 'neo.records.create', 'neo.records.update',
    'neo.records.inactivate', 'neo.records.export', 'document_cleaner.use'
  ))
  OR (c.codigo = 'process_analyst' AND p.codigo IN (
    'pitstop.monitor.view', 'pitstop.records.view', 'pitstop.records.create', 'pitstop.records.update', 'pitstop.records.inactivate',
    'carteira.monitor.view', 'neo.records.view', 'neo.records.create', 'neo.records.update',
    'neo.records.inactivate', 'neo.records.export', 'dispatch.view', 'dispatch.import', 'dispatch.update',
    'dispatch.inactivate', 'dispatch.export', 'document_cleaner.use'
  ));

ALTER TABLE public.profiles
  ADD COLUMN cargo_id UUID REFERENCES public.cargos(id) ON DELETE RESTRICT;

UPDATE public.profiles p
SET cargo_id = c.id
FROM public.cargos c
WHERE c.codigo = p.role::TEXT;

CREATE INDEX idx_profiles_cargo_id ON public.profiles(cargo_id);
CREATE INDEX idx_cargo_permissoes_permissao_id ON public.cargo_permissoes(permissao_id);

CREATE OR REPLACE FUNCTION public.rbac_enabled()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE((SELECT s.rbac_enabled FROM public.access_control_settings s WHERE s.id), FALSE)
$$;

CREATE OR REPLACE FUNCTION public.current_user_has_permission(permission_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles pr
    JOIN public.cargos c ON c.id = pr.cargo_id AND c.ativo
    JOIN public.cargo_permissoes cp ON cp.cargo_id = c.id
    JOIN public.permissoes pe ON pe.id = cp.permissao_id
    WHERE pr.id = (SELECT auth.uid())
      AND pr.ativo
      AND pr.deleted_at IS NULL
      AND pe.codigo = permission_code
  )
$$;

CREATE OR REPLACE FUNCTION public.current_permission_scope(permission_code TEXT)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  scope_value TEXT;
  legacy_role public.app_role;
BEGIN
  IF COALESCE((SELECT s.rbac_enabled FROM public.access_control_settings s WHERE s.id), FALSE) THEN
    SELECT cp.escopo INTO scope_value
    FROM public.profiles pr
    JOIN public.cargos c ON c.id = pr.cargo_id AND c.ativo
    JOIN public.cargo_permissoes cp ON cp.cargo_id = c.id
    JOIN public.permissoes pe ON pe.id = cp.permissao_id
    WHERE pr.id = (SELECT auth.uid()) AND pr.ativo AND pr.deleted_at IS NULL
      AND pe.codigo = permission_code;
    RETURN scope_value;
  END IF;

  SELECT role INTO legacy_role FROM public.profiles
  WHERE id = (SELECT auth.uid()) AND ativo AND deleted_at IS NULL;
  IF legacy_role = 'admin' THEN RETURN 'all'; END IF;
  IF legacy_role = 'coordinator' AND permission_code NOT LIKE 'administration.%'
     AND permission_code NOT LIKE 'dispatch.%' THEN RETURN 'all'; END IF;
  IF legacy_role IN ('analyst', 'process_analyst') AND permission_code IN (
    'pitstop.monitor.view', 'pitstop.records.view', 'pitstop.records.create', 'pitstop.records.update', 'pitstop.records.inactivate',
    'carteira.monitor.view', 'neo.records.view', 'neo.records.create', 'neo.records.update',
    'neo.records.inactivate', 'neo.records.export', 'document_cleaner.use'
  ) THEN RETURN 'own'; END IF;
  IF legacy_role = 'process_analyst' AND permission_code LIKE 'dispatch.%' THEN RETURN 'own'; END IF;
  IF legacy_role = 'coordinator' AND permission_code = 'audit.view' THEN RETURN 'all'; END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_user_access()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'rbac_enabled', COALESCE((SELECT s.rbac_enabled FROM public.access_control_settings s WHERE s.id), FALSE),
    'cargo', CASE WHEN c.id IS NULL THEN NULL ELSE jsonb_build_object(
      'id', c.id, 'codigo', c.codigo, 'nome', c.nome, 'protegido', c.protegido
    ) END,
    'permissions', COALESCE(jsonb_object_agg(pe.codigo, cp.escopo) FILTER (WHERE pe.codigo IS NOT NULL), '{}'::jsonb)
  ) INTO result
  FROM public.profiles pr
  LEFT JOIN public.cargos c ON c.id = pr.cargo_id AND c.ativo
  LEFT JOIN public.cargo_permissoes cp ON cp.cargo_id = c.id
  LEFT JOIN public.permissoes pe ON pe.id = cp.permissao_id
  WHERE pr.id = (SELECT auth.uid()) AND pr.ativo AND pr.deleted_at IS NULL
  GROUP BY c.id, c.codigo, c.nome, c.protegido;

  RETURN COALESCE(result, jsonb_build_object('rbac_enabled', FALSE, 'cargo', NULL, 'permissions', '{}'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_save_cargo(
  target_cargo_id UUID,
  cargo_name TEXT,
  cargo_description TEXT,
  base_role public.app_role,
  cargo_active BOOLEAN,
  permission_entries JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  saved_id UUID;
  generated_code TEXT;
BEGIN
  IF NOT public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
     OR NOT public.is_active((SELECT auth.uid())) THEN
    RAISE EXCEPTION 'Apenas administradores ativos podem gerenciar cargos';
  END IF;

  IF target_cargo_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.cargos WHERE id = target_cargo_id AND protegido
  ) THEN
    RAISE EXCEPTION 'O cargo Administrador e protegido e nao pode ser alterado';
  END IF;

  IF NOT cargo_active AND target_cargo_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles WHERE cargo_id = target_cargo_id AND ativo AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Nao e possivel inativar um cargo que possui usuarios ativos';
  END IF;

  IF length(btrim(cargo_name)) < 2 THEN
    RAISE EXCEPTION 'Informe um nome valido para o cargo';
  END IF;
  IF base_role = 'admin'::public.app_role THEN
    RAISE EXCEPTION 'O perfil de compatibilidade Administrador e exclusivo do cargo protegido';
  END IF;

  IF target_cargo_id IS NULL THEN
    generated_code := 'custom_' || replace(gen_random_uuid()::TEXT, '-', '');
    INSERT INTO public.cargos (codigo, nome, descricao, perfil_base, ativo, created_by, updated_by)
    VALUES (generated_code, btrim(cargo_name), nullif(btrim(cargo_description), ''), base_role,
      cargo_active, (SELECT auth.uid()), (SELECT auth.uid()))
    RETURNING id INTO saved_id;
  ELSE
    UPDATE public.cargos
    SET nome = btrim(cargo_name), descricao = nullif(btrim(cargo_description), ''),
        perfil_base = base_role, ativo = cargo_active, updated_at = now(), updated_by = (SELECT auth.uid())
    WHERE id = target_cargo_id
    RETURNING id INTO saved_id;
  END IF;

  DELETE FROM public.cargo_permissoes WHERE cargo_id = saved_id;
  INSERT INTO public.cargo_permissoes (cargo_id, permissao_id, escopo, updated_by)
  SELECT saved_id, p.id,
    CASE WHEN p.permite_escopo AND e.escopo = 'own' THEN 'own' ELSE 'all' END,
    (SELECT auth.uid())
  FROM jsonb_to_recordset(COALESCE(permission_entries, '[]'::jsonb)) AS e(codigo TEXT, escopo TEXT)
  JOIN public.permissoes p ON p.codigo = e.codigo;

  INSERT INTO public.audit_logs (action, entity, entity_id, user_id, after_data)
  VALUES (CASE WHEN target_cargo_id IS NULL THEN 'INSERT' ELSE 'UPDATE' END,
    'cargos', saved_id, (SELECT auth.uid()),
    jsonb_build_object('nome', btrim(cargo_name), 'ativo', cargo_active,
      'perfil_base', base_role, 'permissoes', permission_entries));

  RETURN saved_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_assign_user_cargo(
  target_user_id UUID,
  next_cargo_id UUID,
  next_active BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  next_base_role public.app_role;
  current_is_admin BOOLEAN;
  next_is_admin BOOLEAN;
  active_admin_count INTEGER;
BEGIN
  IF NOT public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
     OR NOT public.is_active((SELECT auth.uid())) THEN
    RAISE EXCEPTION 'Apenas administradores ativos podem atualizar usuarios';
  END IF;

  SELECT perfil_base, codigo = 'admin' INTO next_base_role, next_is_admin
  FROM public.cargos WHERE id = next_cargo_id AND ativo;
  IF next_base_role IS NULL THEN RAISE EXCEPTION 'Cargo inexistente ou inativo'; END IF;

  SELECT c.codigo = 'admin' INTO current_is_admin
  FROM public.profiles p LEFT JOIN public.cargos c ON c.id = p.cargo_id
  WHERE p.id = target_user_id;

  SELECT count(*) INTO active_admin_count
  FROM public.profiles p JOIN public.cargos c ON c.id = p.cargo_id
  WHERE c.codigo = 'admin' AND p.ativo AND p.deleted_at IS NULL;

  IF COALESCE(current_is_admin, FALSE) AND active_admin_count <= 1
     AND (NOT next_active OR NOT next_is_admin) THEN
    RAISE EXCEPTION 'E necessario manter pelo menos um administrador ativo';
  END IF;

  UPDATE public.profiles
  SET cargo_id = next_cargo_id, role = next_base_role, ativo = next_active, updated_at = now()
  WHERE id = target_user_id AND deleted_at IS NULL;

  INSERT INTO public.audit_logs (action, entity, entity_id, user_id, after_data)
  VALUES ('UPDATE', 'profiles', target_user_id, (SELECT auth.uid()),
    jsonb_build_object('cargo_id', next_cargo_id, 'ativo', next_active, 'role', next_base_role));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_rbac_enabled(next_enabled BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
     OR NOT public.is_active((SELECT auth.uid())) THEN
    RAISE EXCEPTION 'Apenas administradores ativos podem alterar o modo de acesso';
  END IF;
  UPDATE public.access_control_settings
  SET rbac_enabled = next_enabled, updated_at = now(), updated_by = (SELECT auth.uid())
  WHERE id;
  INSERT INTO public.audit_logs (action, entity, user_id, after_data)
  VALUES ('UPDATE', 'access_control_settings', (SELECT auth.uid()),
    jsonb_build_object('rbac_enabled', next_enabled));
END;
$$;

ALTER TABLE public.cargos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cargo_permissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_control_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY cargos_read_own_or_admin ON public.cargos FOR SELECT TO authenticated
USING (
  id = (SELECT p.cargo_id FROM public.profiles p WHERE p.id = (SELECT auth.uid()))
  OR (SELECT public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
);
CREATE POLICY permissoes_read_authenticated ON public.permissoes FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY cargo_permissoes_read_own_or_admin ON public.cargo_permissoes FOR SELECT TO authenticated
USING (
  cargo_id = (SELECT p.cargo_id FROM public.profiles p WHERE p.id = (SELECT auth.uid()))
  OR (SELECT public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
);
CREATE POLICY access_settings_read_authenticated ON public.access_control_settings FOR SELECT TO authenticated USING (TRUE);

REVOKE ALL ON TABLE public.cargos, public.permissoes, public.cargo_permissoes, public.access_control_settings FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.cargos, public.permissoes, public.cargo_permissoes, public.access_control_settings TO authenticated;

REVOKE ALL ON FUNCTION public.rbac_enabled(), public.current_user_has_permission(TEXT),
  public.current_user_access(), public.admin_save_cargo(UUID, TEXT, TEXT, public.app_role, BOOLEAN, JSONB),
  public.admin_assign_user_cargo(UUID, UUID, BOOLEAN), public.admin_set_rbac_enabled(BOOLEAN)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rbac_enabled(), public.current_user_has_permission(TEXT),
  public.current_user_access(), public.admin_save_cargo(UUID, TEXT, TEXT, public.app_role, BOOLEAN, JSONB),
  public.admin_assign_user_cargo(UUID, UUID, BOOLEAN), public.admin_set_rbac_enabled(BOOLEAN)
TO authenticated;
GRANT EXECUTE ON FUNCTION public.rbac_enabled(), public.current_user_has_permission(TEXT),
  public.current_user_access(), public.admin_save_cargo(UUID, TEXT, TEXT, public.app_role, BOOLEAN, JSONB),
  public.admin_assign_user_cargo(UUID, UUID, BOOLEAN), public.admin_set_rbac_enabled(BOOLEAN)
TO service_role;

COMMENT ON TABLE public.access_control_settings IS
  'Rollback operacional: definir rbac_enabled=false faz o frontend usar profiles.role imediatamente.';

-- As politicas passam a consultar a matriz. Com rbac_enabled=false, a funcao
-- acima reproduz as regras legadas, portanto o rollback nao exige nova migration.
DROP POLICY IF EXISTS gargalos_select_own ON public.gargalos;
DROP POLICY IF EXISTS gargalos_select_priv ON public.gargalos;
DROP POLICY IF EXISTS gargalos_insert ON public.gargalos;
DROP POLICY IF EXISTS gargalos_update_own ON public.gargalos;
DROP POLICY IF EXISTS gargalos_update_priv ON public.gargalos;
DROP POLICY IF EXISTS gargalos_delete_admin ON public.gargalos;
CREATE POLICY gargalos_select_rbac ON public.gargalos FOR SELECT TO authenticated USING (
  (SELECT public.current_permission_scope('pitstop.records.view')) = 'all'
  OR ((SELECT public.current_permission_scope('pitstop.records.view')) = 'own'
      AND (responsavel_id = (SELECT auth.uid()) OR created_by = (SELECT auth.uid())))
);
CREATE POLICY gargalos_insert_rbac ON public.gargalos FOR INSERT TO authenticated WITH CHECK (
  (SELECT public.is_active((SELECT auth.uid()))) AND (
    (SELECT public.current_permission_scope('pitstop.records.create')) = 'all'
    OR ((SELECT public.current_permission_scope('pitstop.records.create')) = 'own'
        AND responsavel_id = (SELECT auth.uid()))
  )
);
CREATE POLICY gargalos_update_rbac ON public.gargalos FOR UPDATE TO authenticated USING (
  (SELECT public.current_permission_scope('pitstop.records.update')) = 'all'
  OR ((SELECT public.current_permission_scope('pitstop.records.update')) = 'own'
      AND responsavel_id = (SELECT auth.uid()))
) WITH CHECK (
  (SELECT public.current_permission_scope('pitstop.records.update')) = 'all'
  OR ((SELECT public.current_permission_scope('pitstop.records.update')) = 'own'
      AND responsavel_id = (SELECT auth.uid()))
);
CREATE POLICY gargalos_delete_rbac ON public.gargalos FOR DELETE TO authenticated USING (
  (SELECT public.current_permission_scope('pitstop.records.inactivate')) = 'all'
  OR ((SELECT public.current_permission_scope('pitstop.records.inactivate')) = 'own'
      AND responsavel_id = (SELECT auth.uid()))
);

DROP POLICY IF EXISTS registros_neo_select_own ON public.registros_neo;
DROP POLICY IF EXISTS registros_neo_select_priv ON public.registros_neo;
DROP POLICY IF EXISTS registros_neo_insert ON public.registros_neo;
DROP POLICY IF EXISTS registros_neo_update_own ON public.registros_neo;
DROP POLICY IF EXISTS registros_neo_update_priv ON public.registros_neo;
DROP POLICY IF EXISTS registros_neo_delete_admin ON public.registros_neo;
CREATE POLICY registros_neo_select_rbac ON public.registros_neo FOR SELECT TO authenticated USING (
  (SELECT public.current_permission_scope('neo.records.view')) = 'all'
  OR ((SELECT public.current_permission_scope('neo.records.view')) = 'own'
      AND (responsavel_id = (SELECT auth.uid()) OR created_by = (SELECT auth.uid())))
);
CREATE POLICY registros_neo_insert_rbac ON public.registros_neo FOR INSERT TO authenticated WITH CHECK (
  (SELECT public.is_active((SELECT auth.uid()))) AND (
    (SELECT public.current_permission_scope('neo.records.create')) = 'all'
    OR ((SELECT public.current_permission_scope('neo.records.create')) = 'own'
        AND responsavel_id = (SELECT auth.uid()))
  )
);
CREATE POLICY registros_neo_update_rbac ON public.registros_neo FOR UPDATE TO authenticated USING (
  (SELECT public.current_permission_scope('neo.records.update')) = 'all'
  OR ((SELECT public.current_permission_scope('neo.records.update')) = 'own'
      AND responsavel_id = (SELECT auth.uid()))
) WITH CHECK (
  (SELECT public.current_permission_scope('neo.records.update')) = 'all'
  OR ((SELECT public.current_permission_scope('neo.records.update')) = 'own'
      AND responsavel_id = (SELECT auth.uid()))
);
CREATE POLICY registros_neo_delete_rbac ON public.registros_neo FOR DELETE TO authenticated USING (
  (SELECT public.current_permission_scope('neo.records.inactivate')) = 'all'
  OR ((SELECT public.current_permission_scope('neo.records.inactivate')) = 'own'
      AND responsavel_id = (SELECT auth.uid()))
);

DROP POLICY IF EXISTS process_imports_select ON public.process_imports;
DROP POLICY IF EXISTS process_imports_insert ON public.process_imports;
DROP POLICY IF EXISTS process_imports_update ON public.process_imports;
DROP POLICY IF EXISTS process_imports_delete ON public.process_imports;
CREATE POLICY process_imports_select_rbac ON public.process_imports FOR SELECT TO authenticated USING (
  (SELECT public.current_permission_scope('dispatch.view')) = 'all'
  OR ((SELECT public.current_permission_scope('dispatch.view')) = 'own' AND owner_id = (SELECT auth.uid()))
);
CREATE POLICY process_imports_insert_rbac ON public.process_imports FOR INSERT TO authenticated WITH CHECK (
  (SELECT public.current_permission_scope('dispatch.import')) IS NOT NULL AND owner_id = (SELECT auth.uid())
);
CREATE POLICY process_imports_update_rbac ON public.process_imports FOR UPDATE TO authenticated USING (
  (SELECT public.current_permission_scope('dispatch.update')) = 'all'
  OR ((SELECT public.current_permission_scope('dispatch.update')) = 'own' AND owner_id = (SELECT auth.uid()))
) WITH CHECK (
  (SELECT public.current_permission_scope('dispatch.update')) = 'all'
  OR ((SELECT public.current_permission_scope('dispatch.update')) = 'own' AND owner_id = (SELECT auth.uid()))
);
CREATE POLICY process_imports_delete_rbac ON public.process_imports FOR DELETE TO authenticated USING (
  (SELECT public.current_permission_scope('dispatch.inactivate')) = 'all'
  OR ((SELECT public.current_permission_scope('dispatch.inactivate')) = 'own' AND owner_id = (SELECT auth.uid()))
);

REVOKE ALL ON FUNCTION public.current_permission_scope(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_permission_scope(TEXT) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
