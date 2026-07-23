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
DECLARE
  current_role public.app_role;
  current_active BOOLEAN;
  active_admin_count BIGINT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') OR NOT public.is_active(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores ativos podem alterar usuários';
  END IF;

  LOCK TABLE public.profiles IN SHARE ROW EXCLUSIVE MODE;

  SELECT role, ativo
  INTO current_role, current_active
  FROM public.profiles
  WHERE id = target_user_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  IF current_role = 'admin'::public.app_role
     AND current_active
     AND (next_role <> 'admin'::public.app_role OR NOT next_active) THEN
    SELECT count(*)
    INTO active_admin_count
    FROM public.profiles
    WHERE role = 'admin'::public.app_role
      AND ativo
      AND deleted_at IS NULL;

    IF active_admin_count <= 1 THEN
      RAISE EXCEPTION 'É necessário manter pelo menos um administrador ativo';
    END IF;
  END IF;

  UPDATE public.profiles
  SET role = next_role, ativo = next_active
  WHERE id = target_user_id
    AND deleted_at IS NULL;

  DELETE FROM public.user_roles WHERE user_id = target_user_id;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, next_role);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_user(UUID, public.app_role, BOOLEAN)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_user(UUID, public.app_role, BOOLEAN)
TO authenticated, service_role;