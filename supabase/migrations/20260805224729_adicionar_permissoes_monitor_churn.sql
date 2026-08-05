-- Bloco 1 do Monitor de Churn: registra a rotina na matriz de cargos.
-- Migration aditiva e reversivel pelo script docs/rollback/monitor-churn-bloco-1.sql.

INSERT INTO public.permissoes (codigo, modulo, rotina, acao, permite_escopo, ordem)
VALUES
  ('churn.view', 'Relacionamento', 'Monitor de Churn', 'Visualizar', TRUE, 55),
  ('churn.import', 'Relacionamento', 'Monitor de Churn', 'Importar', TRUE, 56),
  ('churn.process', 'Relacionamento', 'Monitor de Churn', 'Processar', TRUE, 57),
  ('churn.update', 'Relacionamento', 'Monitor de Churn', 'Editar importacao', TRUE, 58),
  ('churn.inactivate', 'Relacionamento', 'Monitor de Churn', 'Inativar importacao', TRUE, 59),
  ('churn.export', 'Relacionamento', 'Monitor de Churn', 'Exportar CSV', TRUE, 60)
ON CONFLICT (codigo) DO UPDATE
SET modulo = EXCLUDED.modulo,
    rotina = EXCLUDED.rotina,
    acao = EXCLUDED.acao,
    permite_escopo = EXCLUDED.permite_escopo,
    ordem = EXCLUDED.ordem;

-- Replica a matriz aprovada para homologacao:
-- Administrador e Coordenador acessam todos; Analista de Processos, somente os proprios.
INSERT INTO public.cargo_permissoes (cargo_id, permissao_id, escopo)
SELECT c.id, p.id,
  CASE WHEN c.codigo = 'process_analyst' THEN 'own' ELSE 'all' END
FROM public.cargos c
CROSS JOIN public.permissoes p
WHERE c.ativo
  AND c.codigo IN ('admin', 'coordinator', 'process_analyst')
  AND p.codigo IN (
    'churn.view',
    'churn.import',
    'churn.process',
    'churn.update',
    'churn.inactivate',
    'churn.export'
  )
ON CONFLICT (cargo_id, permissao_id) DO UPDATE
SET escopo = EXCLUDED.escopo,
    updated_at = now();
