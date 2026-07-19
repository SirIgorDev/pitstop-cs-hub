-- A tela de Auditoria é acessível a coordenadores e administradores.
-- Mantém analistas sem acesso aos eventos consolidados.
DROP POLICY IF EXISTS audit_logs_select_admin ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_select_management ON public.audit_logs;

CREATE POLICY audit_logs_select_management
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
  public.is_active(auth.uid())
  AND (
    public.has_role(auth.uid(), 'coordinator'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

NOTIFY pgrst, 'reload schema';
