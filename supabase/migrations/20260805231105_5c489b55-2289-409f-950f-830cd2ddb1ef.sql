-- Bloco 2 do Monitor de Churn: persistencia, integridade e seguranca.
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
  IF legacy_role = 'process_analyst' AND permission_code LIKE 'churn.%' THEN RETURN 'own'; END IF;
  IF legacy_role = 'coordinator' AND permission_code = 'audit.view' THEN RETURN 'all'; END IF;
  RETURN NULL;
END;
$$;

CREATE TABLE public.churn_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  competencia DATE NOT NULL CHECK (EXTRACT(DAY FROM competencia) = 1),
  versao INTEGER NOT NULL DEFAULT 1 CHECK (versao > 0),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'ready', 'partial', 'failed')),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  UNIQUE (owner_id, competencia, versao)
);

CREATE INDEX churn_imports_owner_created_idx
  ON public.churn_imports (owner_id, created_at DESC);
CREATE INDEX churn_imports_active_competencia_idx
  ON public.churn_imports (competencia DESC, created_at DESC)
  WHERE ativo;
CREATE INDEX churn_imports_status_idx
  ON public.churn_imports (status)
  WHERE ativo;

CREATE TABLE public.churn_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES public.churn_imports(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('summary', 'detail')),
  file_name TEXT NOT NULL CHECK (length(btrim(file_name)) > 0),
  macro_reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'valid', 'invalid')),
  imported_rows INTEGER NOT NULL DEFAULT 0 CHECK (imported_rows >= 0),
  valid_rows INTEGER NOT NULL DEFAULT 0 CHECK (valid_rows >= 0),
  invalid_rows INTEGER NOT NULL DEFAULT 0 CHECK (invalid_rows >= 0),
  error_message TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT churn_files_macro_reason_check CHECK (
    (tipo = 'summary' AND macro_reason IS NULL)
    OR (tipo = 'detail' AND length(btrim(macro_reason)) > 0)
  ),
  UNIQUE (id, import_id)
);

CREATE INDEX churn_files_import_created_idx
  ON public.churn_files (import_id, created_at DESC);
CREATE INDEX churn_files_created_by_idx
  ON public.churn_files (created_by);
CREATE UNIQUE INDEX churn_files_one_active_summary_idx
  ON public.churn_files (import_id)
  WHERE tipo = 'summary' AND ativo;
CREATE UNIQUE INDEX churn_files_one_active_detail_reason_idx
  ON public.churn_files (import_id, macro_reason)
  WHERE tipo = 'detail' AND ativo;

CREATE TABLE public.churn_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES public.churn_imports(id) ON DELETE CASCADE,
  file_id UUID NOT NULL,
  macro_reason TEXT NOT NULL CHECK (length(btrim(macro_reason)) > 0),
  churn_value NUMERIC(18, 6) NOT NULL CHECK (churn_value >= 0),
  churn_quantity INTEGER NOT NULL CHECK (churn_quantity >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT churn_summary_file_fk
    FOREIGN KEY (file_id, import_id)
    REFERENCES public.churn_files(id, import_id)
    ON DELETE CASCADE,
  UNIQUE (file_id, macro_reason)
);

CREATE INDEX churn_summary_import_reason_idx
  ON public.churn_summary (import_id, macro_reason);
CREATE INDEX churn_summary_file_id_idx
  ON public.churn_summary (file_id);

CREATE TABLE public.churn_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES public.churn_imports(id) ON DELETE CASCADE,
  file_id UUID NOT NULL,
  source_row INTEGER NOT NULL CHECK (source_row > 0),
  client_id TEXT NOT NULL CHECK (length(btrim(client_id)) > 0),
  client_name TEXT NOT NULL DEFAULT '',
  unit_name TEXT,
  acquisition_date DATE,
  modality TEXT,
  market TEXT,
  service_product TEXT NOT NULL DEFAULT '',
  plan_name TEXT,
  cancellation_date DATE,
  macro_reason TEXT NOT NULL CHECK (length(btrim(macro_reason)) > 0),
  cancellation_reason TEXT,
  cancellation_value NUMERIC(18, 6) NOT NULL DEFAULT 0
    CHECK (cancellation_value >= 0),
  revenue_type TEXT,
  churn_type TEXT CHECK (churn_type IN ('Churn', 'Downgrade')),
  client_status TEXT,
  observation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT churn_records_file_fk
    FOREIGN KEY (file_id, import_id)
    REFERENCES public.churn_files(id, import_id)
    ON DELETE CASCADE,
  UNIQUE (file_id, source_row)
);

CREATE INDEX churn_records_import_client_idx
  ON public.churn_records (import_id, client_id);
CREATE INDEX churn_records_import_reason_idx
  ON public.churn_records (import_id, macro_reason);
CREATE INDEX churn_records_import_cancellation_idx
  ON public.churn_records (import_id, cancellation_date DESC);
CREATE INDEX churn_records_file_id_idx
  ON public.churn_records (file_id);
CREATE INDEX churn_records_import_churn_type_idx
  ON public.churn_records (import_id, churn_type);

CREATE OR REPLACE FUNCTION public.tg_churn_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER churn_imports_set_updated_at
BEFORE UPDATE ON public.churn_imports
FOR EACH ROW EXECUTE FUNCTION public.tg_churn_set_updated_at();

CREATE TRIGGER churn_files_set_updated_at
BEFORE UPDATE ON public.churn_files
FOR EACH ROW EXECUTE FUNCTION public.tg_churn_set_updated_at();

CREATE OR REPLACE FUNCTION public.tg_churn_import_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  required_permission TEXT;
  granted_scope TEXT;
BEGIN
  IF current_user = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    RAISE EXCEPTION 'O responsavel pela importacao nao pode ser alterado';
  END IF;

  required_permission := CASE
    WHEN OLD.ativo AND NOT NEW.ativo THEN 'churn.inactivate'
    ELSE 'churn.update'
  END;
  granted_scope := public.current_permission_scope(required_permission);

  IF granted_scope IS NULL
    OR (granted_scope = 'own' AND OLD.owner_id <> (SELECT auth.uid()))
  THEN
    RAISE EXCEPTION 'Sem permissao para atualizar esta importacao';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER churn_imports_guard
BEFORE UPDATE ON public.churn_imports
FOR EACH ROW EXECUTE FUNCTION public.tg_churn_import_guard();

CREATE OR REPLACE FUNCTION public.tg_churn_import_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, action, entity, entity_id, after_data)
    VALUES (
      (SELECT auth.uid()),
      'insert',
      'churn_imports',
      NEW.id,
      jsonb_build_object('competencia', NEW.competencia, 'versao', NEW.versao)
    );
  ELSIF OLD.ativo AND NOT NEW.ativo THEN
    INSERT INTO public.audit_logs (user_id, action, entity, entity_id, before_data)
    VALUES (
      (SELECT auth.uid()),
      'inactivate',
      'churn_imports',
      OLD.id,
      jsonb_build_object(
        'competencia', OLD.competencia,
        'versao', OLD.versao,
        'status', OLD.status
      )
    );
  ELSIF OLD.status IS DISTINCT FROM NEW.status
    AND NEW.status IN ('ready', 'partial')
  THEN
    INSERT INTO public.audit_logs (user_id, action, entity, entity_id, after_data)
    VALUES (
      (SELECT auth.uid()),
      'import',
      'churn_imports',
      NEW.id,
      jsonb_build_object(
        'competencia', NEW.competencia,
        'versao', NEW.versao,
        'status', NEW.status,
        'processed_at', NEW.processed_at
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER churn_imports_audit
AFTER INSERT OR UPDATE OF status, ativo ON public.churn_imports
FOR EACH ROW EXECUTE FUNCTION public.tg_churn_import_audit();

REVOKE ALL ON FUNCTION public.tg_churn_set_updated_at(),
  public.tg_churn_import_guard(), public.tg_churn_import_audit()
  FROM PUBLIC, anon, authenticated;

REVOKE ALL ON TABLE public.churn_imports, public.churn_files,
  public.churn_summary, public.churn_records FROM PUBLIC, anon;

GRANT SELECT, INSERT ON TABLE public.churn_imports, public.churn_files,
  public.churn_summary, public.churn_records TO authenticated;
GRANT UPDATE (competencia, versao, status, ativo, error_message, processed_at)
  ON TABLE public.churn_imports TO authenticated;
GRANT UPDATE (status, imported_rows, valid_rows, invalid_rows, error_message, ativo)
  ON TABLE public.churn_files TO authenticated;
GRANT ALL ON TABLE public.churn_imports, public.churn_files,
  public.churn_summary, public.churn_records TO service_role;

ALTER TABLE public.churn_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.churn_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.churn_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.churn_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY churn_imports_select
ON public.churn_imports FOR SELECT TO authenticated
USING (
  (SELECT public.is_active(auth.uid()))
  AND (
    (SELECT public.current_permission_scope('churn.view')) = 'all'
    OR (
      (SELECT public.current_permission_scope('churn.view')) = 'own'
      AND owner_id = (SELECT auth.uid())
    )
  )
);

CREATE POLICY churn_imports_insert
ON public.churn_imports FOR INSERT TO authenticated
WITH CHECK (
  owner_id = (SELECT auth.uid())
  AND (SELECT public.is_active(auth.uid()))
  AND (SELECT public.current_permission_scope('churn.import')) IS NOT NULL
);

CREATE POLICY churn_imports_update
ON public.churn_imports FOR UPDATE TO authenticated
USING (
  (SELECT public.is_active(auth.uid()))
  AND (
    (SELECT public.current_permission_scope('churn.update')) = 'all'
    OR (SELECT public.current_permission_scope('churn.inactivate')) = 'all'
    OR (
      owner_id = (SELECT auth.uid())
      AND (
        (SELECT public.current_permission_scope('churn.update')) = 'own'
        OR (SELECT public.current_permission_scope('churn.inactivate')) = 'own'
      )
    )
  )
)
WITH CHECK (
  (SELECT public.is_active(auth.uid()))
  AND (
    (SELECT public.current_permission_scope('churn.update')) = 'all'
    OR (SELECT public.current_permission_scope('churn.inactivate')) = 'all'
    OR (
      owner_id = (SELECT auth.uid())
      AND (
        (SELECT public.current_permission_scope('churn.update')) = 'own'
        OR (SELECT public.current_permission_scope('churn.inactivate')) = 'own'
      )
    )
  )
);

CREATE POLICY churn_files_select
ON public.churn_files FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.churn_imports AS parent
    WHERE parent.id = churn_files.import_id
  )
);

CREATE POLICY churn_files_insert
ON public.churn_files FOR INSERT TO authenticated
WITH CHECK (
  created_by = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.churn_imports AS parent
    WHERE parent.id = churn_files.import_id
      AND (
        (SELECT public.current_permission_scope('churn.import')) = 'all'
        OR (
          (SELECT public.current_permission_scope('churn.import')) = 'own'
          AND parent.owner_id = (SELECT auth.uid())
        )
      )
  )
);

CREATE POLICY churn_files_update
ON public.churn_files FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.churn_imports AS parent
    WHERE parent.id = churn_files.import_id
      AND (
        (SELECT public.current_permission_scope('churn.update')) = 'all'
        OR (
          (SELECT public.current_permission_scope('churn.update')) = 'own'
          AND parent.owner_id = (SELECT auth.uid())
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.churn_imports AS parent
    WHERE parent.id = churn_files.import_id
      AND (
        (SELECT public.current_permission_scope('churn.update')) = 'all'
        OR (
          (SELECT public.current_permission_scope('churn.update')) = 'own'
          AND parent.owner_id = (SELECT auth.uid())
        )
      )
  )
);

CREATE POLICY churn_summary_select
ON public.churn_summary FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.churn_imports AS parent
    WHERE parent.id = churn_summary.import_id
  )
);

CREATE POLICY churn_summary_insert
ON public.churn_summary FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.churn_imports AS parent
    JOIN public.churn_files AS source_file
      ON source_file.id = churn_summary.file_id
      AND source_file.import_id = parent.id
    WHERE parent.id = churn_summary.import_id
      AND source_file.tipo = 'summary'
      AND source_file.ativo
      AND (
        (SELECT public.current_permission_scope('churn.import')) = 'all'
        OR (
          (SELECT public.current_permission_scope('churn.import')) = 'own'
          AND parent.owner_id = (SELECT auth.uid())
        )
      )
  )
);

CREATE POLICY churn_records_select
ON public.churn_records FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.churn_imports AS parent
    WHERE parent.id = churn_records.import_id
  )
);

CREATE POLICY churn_records_insert
ON public.churn_records FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.churn_imports AS parent
    JOIN public.churn_files AS source_file
      ON source_file.id = churn_records.file_id
      AND source_file.import_id = parent.id
    WHERE parent.id = churn_records.import_id
      AND source_file.tipo = 'detail'
      AND source_file.ativo
      AND source_file.macro_reason = churn_records.macro_reason
      AND (
        (SELECT public.current_permission_scope('churn.import')) = 'all'
        OR (
          (SELECT public.current_permission_scope('churn.import')) = 'own'
          AND parent.owner_id = (SELECT auth.uid())
        )
      )
  )
);