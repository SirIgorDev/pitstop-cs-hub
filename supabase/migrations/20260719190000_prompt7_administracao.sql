-- Prompt 7: listas administrativas, gestão segura de usuários e auditoria.

CREATE TABLE public.categoria_gargalo_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

INSERT INTO public.categoria_gargalo_options (nome, ordem)
SELECT item.nome::TEXT, item.ordem::INT * 10
FROM unnest(enum_range(NULL::public.categoria_gargalo))
WITH ORDINALITY AS item(nome, ordem);

GRANT SELECT, INSERT, UPDATE ON public.categoria_gargalo_options TO authenticated;
GRANT ALL ON public.categoria_gargalo_options TO service_role;
ALTER TABLE public.categoria_gargalo_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY categoria_gargalo_options_select
ON public.categoria_gargalo_options FOR SELECT TO authenticated
USING (true);

CREATE POLICY categoria_gargalo_options_insert_admin
ON public.categoria_gargalo_options FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY categoria_gargalo_options_update_admin
ON public.categoria_gargalo_options FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER categoria_gargalo_options_updated_at
BEFORE UPDATE ON public.categoria_gargalo_options
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Categoria passa a ser texto parametrizável, preservando todos os registros.
ALTER TABLE public.gargalos
  ALTER COLUMN categoria TYPE TEXT USING categoria::TEXT;

ALTER TABLE public.gargalos
  ADD CONSTRAINT gargalos_categoria_option_fk
  FOREIGN KEY (categoria)
  REFERENCES public.categoria_gargalo_options(nome)
  ON UPDATE CASCADE
  ON DELETE RESTRICT;

-- As listas podem ser incluídas e atualizadas pelo admin, mas nunca removidas.
-- Isso preserva o histórico e obriga a inativação.
DROP POLICY IF EXISTS pitstop_admin_write ON public.pitstop_options;
DROP POLICY IF EXISTS status_neo_admin_write ON public.status_neo_options;
DROP POLICY IF EXISTS escalonou_admin_write ON public.escalonou_para_options;

ALTER TABLE public.pitstop_options
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE public.status_neo_options
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE public.escalonou_para_options
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

CREATE POLICY pitstop_insert_admin
ON public.pitstop_options FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY pitstop_update_admin
ON public.pitstop_options FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY status_neo_insert_admin
ON public.status_neo_options FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY status_neo_update_admin
ON public.status_neo_options FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY escalonou_insert_admin
ON public.escalonou_para_options FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY escalonou_update_admin
ON public.escalonou_para_options FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trilha de auditoria para todas as listas administrativas.
CREATE TRIGGER categoria_gargalo_options_audit
AFTER INSERT OR UPDATE ON public.categoria_gargalo_options
FOR EACH ROW EXECUTE FUNCTION public.tg_audit();
CREATE TRIGGER pitstop_options_audit
AFTER INSERT OR UPDATE ON public.pitstop_options
FOR EACH ROW EXECUTE FUNCTION public.tg_audit();
CREATE TRIGGER status_neo_options_audit
AFTER INSERT OR UPDATE ON public.status_neo_options
FOR EACH ROW EXECUTE FUNCTION public.tg_audit();
CREATE TRIGGER escalonou_para_options_audit
AFTER INSERT OR UPDATE ON public.escalonou_para_options
FOR EACH ROW EXECUTE FUNCTION public.tg_audit();

-- Atualiza perfil e fonte-verdade de papel de forma atômica.
CREATE OR REPLACE FUNCTION public.admin_update_user(
  target_user_id UUID,
  next_role public.app_role,
  next_active BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') OR NOT public.is_active(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores ativos podem alterar usuários';
  END IF;

  IF target_user_id = auth.uid() AND next_active = false THEN
    RAISE EXCEPTION 'O administrador não pode desativar a própria conta';
  END IF;

  UPDATE public.profiles
  SET role = next_role, ativo = next_active
  WHERE id = target_user_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  DELETE FROM public.user_roles WHERE user_id = target_user_id;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, next_role);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_user(UUID, public.app_role, BOOLEAN)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_user(UUID, public.app_role, BOOLEAN)
TO authenticated, service_role;
