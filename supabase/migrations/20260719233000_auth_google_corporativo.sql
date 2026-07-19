-- Restringe novas contas (senha ou OAuth) ao domínio corporativo.
-- O parâmetro `hd` enviado ao Google melhora a seleção de conta, mas esta
-- validação no banco é a barreira de segurança efetiva.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role public.app_role;
  _is_first_user BOOLEAN;
  _nome TEXT;
BEGIN
  IF NEW.email IS NULL
     OR lower(split_part(NEW.email, '@', 2)) <> 'fortestecnologia.com.br' THEN
    RAISE EXCEPTION 'Acesso permitido somente para e-mails @fortestecnologia.com.br';
  END IF;

  SELECT NOT EXISTS (SELECT 1 FROM public.profiles) INTO _is_first_user;

  _role := CASE
    WHEN _is_first_user THEN 'admin'::public.app_role
    ELSE 'analyst'::public.app_role
  END;

  _nome := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'nome', ''),
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'name', ''),
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.profiles (id, nome, email, role, ativo)
  VALUES (NEW.id, _nome, lower(NEW.email), _role, true);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
