CREATE OR REPLACE FUNCTION public.review_process_document(
  target_import_id UUID,
  target_selected_row_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  selected_document TEXT;
  previous_row_id UUID;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  PERFORM 1
  FROM public.process_imports AS process_import
  WHERE process_import.id = target_import_id
    AND process_import.status = 'ready'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Importação pronta não encontrada';
  END IF;

  SELECT process_row.document_normalized
  INTO selected_document
  FROM public.process_import_rows AS process_row
  WHERE process_row.id = target_selected_row_id
    AND process_row.import_id = target_import_id
    AND process_row.document_normalized IS NOT NULL
    AND process_row.whatsapp IS NOT NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registro selecionado não é uma opção válida';
  END IF;

  SELECT process_row.id
  INTO previous_row_id
  FROM public.process_import_rows AS process_row
  WHERE process_row.import_id = target_import_id
    AND process_row.document_normalized = selected_document
    AND process_row.outcome = 'generated'
  FOR UPDATE;

  IF previous_row_id = target_selected_row_id THEN
    RETURN;
  END IF;

  IF previous_row_id IS NULL THEN
    RAISE EXCEPTION 'Registro atualmente selecionado não encontrado';
  END IF;

  UPDATE public.process_review_decisions AS previous_decision
  SET undone_at = now(),
      undone_by = current_user_id
  WHERE previous_decision.import_id = target_import_id
    AND previous_decision.document_normalized = selected_document
    AND previous_decision.undone_at IS NULL;

  UPDATE public.process_import_rows
  SET outcome = 'discarded_duplicate'
  WHERE id = previous_row_id;

  UPDATE public.process_import_rows
  SET outcome = 'generated'
  WHERE id = target_selected_row_id;

  INSERT INTO public.process_review_decisions (
    import_id,
    document_normalized,
    previous_row_id,
    selected_row_id,
    decision,
    decided_by
  )
  VALUES (
    target_import_id,
    selected_document,
    previous_row_id,
    target_selected_row_id,
    'select',
    current_user_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.undo_process_review(target_decision_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  active_decision public.process_review_decisions%ROWTYPE;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  SELECT decision.*
  INTO active_decision
  FROM public.process_review_decisions AS decision
  WHERE decision.id = target_decision_id
    AND decision.undone_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Decisão ativa não encontrada';
  END IF;

  UPDATE public.process_import_rows
  SET outcome = 'discarded_duplicate'
  WHERE id = active_decision.selected_row_id
    AND import_id = active_decision.import_id;

  UPDATE public.process_import_rows
  SET outcome = 'generated'
  WHERE id = active_decision.previous_row_id
    AND import_id = active_decision.import_id;

  UPDATE public.process_review_decisions
  SET undone_at = now(),
      undone_by = current_user_id
  WHERE id = active_decision.id;
END;
$$;

REVOKE ALL ON FUNCTION public.review_process_document(UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.undo_process_review(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_process_document(UUID, UUID)
TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.undo_process_review(UUID)
TO authenticated, service_role;
