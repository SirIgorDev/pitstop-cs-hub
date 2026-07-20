-- Transforma Esteira Neo em lista parametrizável, preservando os valores existentes.

CREATE TABLE public.esteira_neo_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ
);

INSERT INTO public.esteira_neo_options (nome, ordem)
SELECT value::TEXT, (ordinality * 10)::INT
FROM unnest(enum_range(NULL::public.esteira_neo)) WITH ORDINALITY AS options(value, ordinality)
ON CONFLICT (nome) DO NOTHING;

GRANT SELECT, INSERT, UPDATE ON public.esteira_neo_options TO authenticated;
GRANT ALL ON public.esteira_neo_options TO service_role;

ALTER TABLE public.esteira_neo_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY esteira_neo_select
ON public.esteira_neo_options FOR SELECT TO authenticated
USING (true);

CREATE POLICY esteira_neo_insert_admin
ON public.esteira_neo_options FOR INSERT TO authenticated
WITH CHECK (
  public.is_active(auth.uid())
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY esteira_neo_update_admin
ON public.esteira_neo_options FOR UPDATE TO authenticated
USING (
  public.is_active(auth.uid())
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  public.is_active(auth.uid())
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE TRIGGER trg_esteira_neo_updated_at
BEFORE UPDATE ON public.esteira_neo_options
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TRIGGER esteira_neo_options_audit
AFTER INSERT OR UPDATE ON public.esteira_neo_options
FOR EACH ROW EXECUTE FUNCTION public.tg_audit();

ALTER TABLE public.registros_neo
  ALTER COLUMN esteira TYPE TEXT USING esteira::TEXT;

ALTER TABLE public.registros_neo
  ADD CONSTRAINT registros_neo_esteira_option_fk
  FOREIGN KEY (esteira)
  REFERENCES public.esteira_neo_options(nome)
  ON UPDATE CASCADE
  ON DELETE RESTRICT;

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
    'esteira_neo_options',
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
    WHEN 'esteira_neo_options' THEN
      SELECT count(*) INTO usage_count
      FROM public.registros_neo
      WHERE esteira = option_name;
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