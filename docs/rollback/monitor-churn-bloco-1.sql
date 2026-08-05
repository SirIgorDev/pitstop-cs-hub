-- Rollback manual do Bloco 1 do Monitor de Churn.
-- As vinculacoes em cargo_permissoes sao removidas por ON DELETE CASCADE.

BEGIN;

DELETE FROM public.permissoes
WHERE codigo IN (
  'churn.view',
  'churn.import',
  'churn.process',
  'churn.update',
  'churn.inactivate',
  'churn.export'
);

COMMIT;
