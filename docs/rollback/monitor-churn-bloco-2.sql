-- Rollback manual do Bloco 2 do Monitor de Churn.
-- ATENCAO: remove os dados de importacao de churn criados apos a migration.

BEGIN;

DELETE FROM public.audit_logs WHERE entity = 'churn_imports';

DROP TABLE IF EXISTS public.churn_records;
DROP TABLE IF EXISTS public.churn_summary;
DROP TABLE IF EXISTS public.churn_files;
DROP TABLE IF EXISTS public.churn_imports;

DROP FUNCTION IF EXISTS public.tg_churn_import_audit();
DROP FUNCTION IF EXISTS public.tg_churn_import_guard();
DROP FUNCTION IF EXISTS public.tg_churn_set_updated_at();

-- Restaura o fallback legado anterior ao Monitor de Churn.
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

COMMIT;
