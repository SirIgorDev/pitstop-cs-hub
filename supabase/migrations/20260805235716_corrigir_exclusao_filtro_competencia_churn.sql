-- Corrige a operacao do Monitor de Churn para exclusao definitiva.
-- A vinculacao existente nos cargos e preservada ao renomear a permissao.

UPDATE public.permissoes
SET codigo = 'churn.delete',
    acao = 'Excluir importacao definitivamente',
    updated_at = now()
WHERE codigo = 'churn.inactivate';

GRANT DELETE ON TABLE public.churn_imports TO authenticated;

DROP POLICY IF EXISTS churn_imports_delete ON public.churn_imports;
CREATE POLICY churn_imports_delete
ON public.churn_imports FOR DELETE TO authenticated
USING (
  (SELECT public.is_active(auth.uid()))
  AND (
    (SELECT public.current_permission_scope('churn.delete')) = 'all'
    OR (
      (SELECT public.current_permission_scope('churn.delete')) = 'own'
      AND owner_id = (SELECT auth.uid())
    )
  )
);

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
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (user_id, action, entity, entity_id, before_data)
    VALUES (
      (SELECT auth.uid()),
      'delete',
      'churn_imports',
      OLD.id,
      jsonb_build_object(
        'competencia', OLD.competencia,
        'versao', OLD.versao,
        'status', OLD.status,
        'owner_id', OLD.owner_id
      )
    );
    RETURN OLD;
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

DROP TRIGGER IF EXISTS churn_imports_audit ON public.churn_imports;
CREATE TRIGGER churn_imports_audit
AFTER INSERT OR UPDATE OF status, ativo OR DELETE ON public.churn_imports
FOR EACH ROW EXECUTE FUNCTION public.tg_churn_import_audit();

REVOKE ALL ON FUNCTION public.tg_churn_import_audit() FROM PUBLIC, anon, authenticated;
