-- Rollback manual da exclusao definitiva do Monitor de Churn.
-- O filtro de unidade e a correcao de competencia sao apenas alteracoes de frontend.

BEGIN;

DROP POLICY IF EXISTS churn_imports_delete ON public.churn_imports;
REVOKE DELETE ON TABLE public.churn_imports FROM authenticated;

UPDATE public.permissoes
SET codigo = 'churn.inactivate',
    acao = 'Inativar importacao',
    updated_at = now()
WHERE codigo = 'churn.delete';

COMMIT;
