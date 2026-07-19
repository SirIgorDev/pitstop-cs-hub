-- Exclusão lógica segura das listas parametrizáveis.
-- Somente administradores podem excluir e apenas opções nunca utilizadas.

ALTER TABLE public.categoria_gargalo_options
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.pitstop_options
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.status_neo_options
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.escalonou_para_options
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.admin_soft_delete_option(
  target_table TEXT,
  target_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  option_name TEXT;
  usage_count BIGINT := 0;
BEGIN
  IF NOT public.is_active(auth.uid())
     OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem excluir opções.';
  END IF;

  IF target_table NOT IN (
    'categoria_gargalo_options',
    'pitstop_options',
    'status_neo_options',
    'escalonou_para_options'
  ) THEN
    RAISE EXCEPTION 'Lista não permitida.';
  END IF;

  EXECUTE format(
    'SELECT nome FROM public.%I WHERE id = $1 AND deleted_at IS NULL',
    target_table
  )
  INTO option_name
  USING target_id;

  IF option_name IS NULL THEN
    RAISE EXCEPTION 'Opção não encontrada ou já excluída.';
  END IF;

  CASE target_table
    WHEN 'categoria_gargalo_options' THEN
      SELECT count(*) INTO usage_count
      FROM public.gargalos
      WHERE categoria = option_name;
    WHEN 'pitstop_options' THEN
      SELECT count(*) INTO usage_count
      FROM public.gargalos
      WHERE pitstop = option_name;
    WHEN 'status_neo_options' THEN
      SELECT count(*) INTO usage_count
      FROM public.registros_neo
      WHERE status = option_name;
    WHEN 'escalonou_para_options' THEN
      SELECT count(*) INTO usage_count
      FROM public.registros_neo
      WHERE escalonou_para = option_name;
  END CASE;

  IF usage_count > 0 THEN
    RAISE EXCEPTION
      'Esta opção já foi utilizada em % registro(s). Inative-a para preservar o histórico.',
      usage_count;
  END IF;

  EXECUTE format(
    'UPDATE public.%I
       SET ativo = false, deleted_at = now()
     WHERE id = $1 AND deleted_at IS NULL',
    target_table
  )
  USING target_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Não foi possível excluir a opção.';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_soft_delete_option(TEXT, UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_soft_delete_option(TEXT, UUID)
  TO authenticated;

NOTIFY pgrst, 'reload schema';
