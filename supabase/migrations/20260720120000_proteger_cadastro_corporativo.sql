-- Restringe o autocadastro ao domínio corporativo e impede que o cliente
-- escolha o próprio perfil por meio de raw_user_meta_data.
-- Usuários e administradores existentes não são alterados.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _nome TEXT;
  _role public.app_role := 'analyst'::public.app_role;
BEGIN
  IF NEW.email IS NULL
     OR lower(split_part(trim(NEW.email), '@', 2)) <> 'fortestecnologia.com.br' THEN
    RAISE EXCEPTION 'Acesso permitido somente para e-mails @fortestecnologia.com.br';
  END IF;

  _nome := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'nome'), ''),
    split_part(lower(trim(NEW.email)), '@', 1)
  );

  INSERT INTO public.profiles (id, nome, email, role, ativo)
  VALUES (
    NEW.id,
    _nome,
    lower(trim(NEW.email)),
    _role,
    true
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user()
  FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
