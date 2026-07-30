ALTER TABLE public.process_import_rows
DROP CONSTRAINT process_import_rows_outcome_check;

ALTER TABLE public.process_import_rows
ADD CONSTRAINT process_import_rows_outcome_check
CHECK (
  outcome IN (
    'pending',
    'generated',
    'discarded_duplicate',
    'discarded_invalid_document',
    'discarded_no_whatsapp'
  )
);

-- Conclui a substituição da importação em uma única transação. A importação
-- anterior só é apagada depois que a nova já foi totalmente processada.
CREATE OR REPLACE FUNCTION public.finalize_process_import(target_import_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  current_user_id UUID := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  PERFORM 1
  FROM public.process_imports AS process_import
  WHERE process_import.id = target_import_id
    AND process_import.owner_id = current_user_id
    AND process_import.status = 'ready'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Importação pronta não encontrada para o usuário atual';
  END IF;

  UPDATE public.process_imports AS previous_import
  SET is_current = false
  WHERE previous_import.owner_id = current_user_id
    AND previous_import.id <> target_import_id
    AND previous_import.is_current;

  UPDATE public.process_imports AS current_import
  SET is_current = true
  WHERE current_import.id = target_import_id
    AND current_import.owner_id = current_user_id;

  DELETE FROM public.process_imports AS obsolete_import
  WHERE obsolete_import.owner_id = current_user_id
    AND obsolete_import.id <> target_import_id;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_process_import(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finalize_process_import(UUID)
TO authenticated, service_role;
