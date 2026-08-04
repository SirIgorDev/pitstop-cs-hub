-- Permite controlar a exibicao dos grupos-pai da navegacao pela matriz de cargos.
INSERT INTO public.permissoes (codigo, modulo, rotina, acao, permite_escopo, ordem)
VALUES
  ('relationship.view', 'Navegacao', 'Relacionamento', 'Visualizar', FALSE, 1),
  ('technical_support.view', 'Navegacao', 'Suporte Tecnico', 'Visualizar', FALSE, 2)
ON CONFLICT (codigo) DO UPDATE
SET modulo = EXCLUDED.modulo,
    rotina = EXCLUDED.rotina,
    acao = EXCLUDED.acao,
    permite_escopo = EXCLUDED.permite_escopo,
    ordem = EXCLUDED.ordem;

-- Preserva a navegacao atual. O administrador pode retirar as permissoes depois,
-- exceto do cargo protegido Administrador.
INSERT INTO public.cargo_permissoes (cargo_id, permissao_id, escopo)
SELECT c.id, p.id, 'all'
FROM public.cargos c
CROSS JOIN public.permissoes p
WHERE c.ativo
  AND p.codigo IN ('relationship.view', 'technical_support.view')
ON CONFLICT (cargo_id, permissao_id) DO NOTHING;
