CREATE OR REPLACE FUNCTION public.tg_process_import_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  audit_user_id UUID := auth.uid();
BEGIN
  IF TG_OP = 'UPDATE'
    AND OLD.status IS DISTINCT FROM NEW.status
    AND NEW.status = 'ready'
  THEN
    INSERT INTO public.audit_logs (
      user_id,
      action,
      entity,
      entity_id,
      before_data,
      after_data
    )
    VALUES (
      audit_user_id,
      'import',
      'process_imports',
      NEW.id,
      NULL,
      jsonb_build_object(
        'file_name', NEW.file_name,
        'imported_rows', NEW.imported_rows,
        'duplicate_documents', NEW.duplicate_documents,
        'invalid_document_rows', NEW.invalid_document_rows,
        'documents_without_whatsapp', NEW.documents_without_whatsapp,
        'generated_rows', NEW.generated_rows,
        'processed_at', NEW.processed_at
      )
    );
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'ready' THEN
    INSERT INTO public.audit_logs (
      user_id,
      action,
      entity,
      entity_id,
      before_data,
      after_data
    )
    VALUES (
      audit_user_id,
      'delete',
      'process_imports',
      OLD.id,
      jsonb_build_object(
        'file_name', OLD.file_name,
        'imported_rows', OLD.imported_rows,
        'duplicate_documents', OLD.duplicate_documents,
        'invalid_document_rows', OLD.invalid_document_rows,
        'documents_without_whatsapp', OLD.documents_without_whatsapp,
        'generated_rows', OLD.generated_rows,
        'processed_at', OLD.processed_at
      ),
      NULL
    );
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.tg_process_import_audit() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS process_imports_audit ON public.process_imports;
CREATE TRIGGER process_imports_audit
AFTER UPDATE OF status OR DELETE ON public.process_imports
FOR EACH ROW
EXECUTE FUNCTION public.tg_process_import_audit();
