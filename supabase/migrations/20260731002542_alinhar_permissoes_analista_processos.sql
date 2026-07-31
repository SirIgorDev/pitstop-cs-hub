-- Analista de Processos herda as permissões operacionais do Analista de CS:
-- acessa e altera somente os próprios registros. Coordenadores e
-- administradores mantêm as políticas privilegiadas já existentes.

DROP POLICY IF EXISTS gargalos_select_own ON public.gargalos;
CREATE POLICY gargalos_select_own
ON public.gargalos
FOR SELECT
TO authenticated
USING (
  public.is_active(auth.uid())
  AND (
    public.has_role(auth.uid(), 'analyst'::public.app_role)
    OR public.has_role(auth.uid(), 'process_analyst'::public.app_role)
  )
  AND (responsavel_id = auth.uid() OR created_by = auth.uid())
);

DROP POLICY IF EXISTS gargalos_insert ON public.gargalos;
CREATE POLICY gargalos_insert
ON public.gargalos
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_active(auth.uid())
  AND (
    (
      responsavel_id = auth.uid()
      AND (
        public.has_role(auth.uid(), 'analyst'::public.app_role)
        OR public.has_role(auth.uid(), 'process_analyst'::public.app_role)
      )
    )
    OR public.has_role(auth.uid(), 'coordinator'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

DROP POLICY IF EXISTS gargalos_update_own ON public.gargalos;
CREATE POLICY gargalos_update_own
ON public.gargalos
FOR UPDATE
TO authenticated
USING (
  responsavel_id = auth.uid()
  AND public.is_active(auth.uid())
  AND (
    public.has_role(auth.uid(), 'analyst'::public.app_role)
    OR public.has_role(auth.uid(), 'process_analyst'::public.app_role)
  )
)
WITH CHECK (
  responsavel_id = auth.uid()
  AND public.is_active(auth.uid())
  AND (
    public.has_role(auth.uid(), 'analyst'::public.app_role)
    OR public.has_role(auth.uid(), 'process_analyst'::public.app_role)
  )
);

DROP POLICY IF EXISTS registros_neo_select_own ON public.registros_neo;
CREATE POLICY registros_neo_select_own
ON public.registros_neo
FOR SELECT
TO authenticated
USING (
  public.is_active(auth.uid())
  AND (
    public.has_role(auth.uid(), 'analyst'::public.app_role)
    OR public.has_role(auth.uid(), 'process_analyst'::public.app_role)
  )
  AND (responsavel_id = auth.uid() OR created_by = auth.uid())
);

DROP POLICY IF EXISTS registros_neo_insert ON public.registros_neo;
CREATE POLICY registros_neo_insert
ON public.registros_neo
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_active(auth.uid())
  AND (
    (
      responsavel_id = auth.uid()
      AND (
        public.has_role(auth.uid(), 'analyst'::public.app_role)
        OR public.has_role(auth.uid(), 'process_analyst'::public.app_role)
      )
    )
    OR public.has_role(auth.uid(), 'coordinator'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

DROP POLICY IF EXISTS registros_neo_update_own ON public.registros_neo;
CREATE POLICY registros_neo_update_own
ON public.registros_neo
FOR UPDATE
TO authenticated
USING (
  responsavel_id = auth.uid()
  AND public.is_active(auth.uid())
  AND (
    public.has_role(auth.uid(), 'analyst'::public.app_role)
    OR public.has_role(auth.uid(), 'process_analyst'::public.app_role)
  )
)
WITH CHECK (
  responsavel_id = auth.uid()
  AND public.is_active(auth.uid())
  AND (
    public.has_role(auth.uid(), 'analyst'::public.app_role)
    OR public.has_role(auth.uid(), 'process_analyst'::public.app_role)
  )
);

NOTIFY pgrst, 'reload schema';
