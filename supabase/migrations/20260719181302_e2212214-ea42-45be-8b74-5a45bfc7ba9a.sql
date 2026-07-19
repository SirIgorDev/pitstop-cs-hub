
-- ===== ENUMS =====
CREATE TYPE public.segmento_gargalo AS ENUM ('Corporativo', 'Contábil');

CREATE TYPE public.categoria_gargalo AS ENUM (
  'Documentação / Processos',
  'Prazo de Atendimento / SLA',
  'Funcionalidades / Produto',
  'Legislação / Compliance Fiscal',
  'Comunicação / Relacionamento',
  'Treinamento / Capacitação',
  'Integração de Sistemas',
  'Financeiro / Cobrança',
  'Suporte Técnico / Sistema',
  'Onboarding / Implantação'
);

CREATE TYPE public.impacto_gargalo AS ENUM ('Baixo', 'Médio', 'Alto', 'Crítico');
CREATE TYPE public.urgencia_gargalo AS ENUM ('Baixa', 'Média', 'Alta', 'Crítica');
CREATE TYPE public.status_gargalo AS ENUM ('Aberto', 'Em Andamento', 'Monitorando', 'Resolvido');
CREATE TYPE public.risco_churn AS ENUM ('Baixo', 'Médio', 'Alto');
CREATE TYPE public.tipo_neo AS ENUM ('Proativo', 'Reativo');
CREATE TYPE public.esteira_neo AS ENUM (
  'Contato realizado',
  '1° Contato',
  '2° Contato',
  'Cliente Proativo',
  'Em acompanhamento',
  'Contato sem sucesso',
  'Onboarding',
  'Cliente ativo',
  'Tentativa',
  'Meet Agendada',
  'Visita'
);

-- ===== HELPER TRIGGER: created_by / updated_by =====
CREATE OR REPLACE FUNCTION public.tg_set_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.created_by = COALESCE(NEW.created_by, auth.uid());
  NEW.updated_by = COALESCE(NEW.updated_by, auth.uid());
  RETURN NEW;
END;
$$;

-- ===== LOOKUP TABLES =====
CREATE TABLE public.pitstop_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pitstop_options TO authenticated;
GRANT ALL ON public.pitstop_options TO service_role;
ALTER TABLE public.pitstop_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY pitstop_select ON public.pitstop_options FOR SELECT TO authenticated USING (true);
CREATE POLICY pitstop_admin_write ON public.pitstop_options FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_pitstop_updated_at BEFORE UPDATE ON public.pitstop_options
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.status_neo_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.status_neo_options TO authenticated;
GRANT ALL ON public.status_neo_options TO service_role;
ALTER TABLE public.status_neo_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY status_neo_select ON public.status_neo_options FOR SELECT TO authenticated USING (true);
CREATE POLICY status_neo_admin_write ON public.status_neo_options FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_status_neo_updated_at BEFORE UPDATE ON public.status_neo_options
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.escalonou_para_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.escalonou_para_options TO authenticated;
GRANT ALL ON public.escalonou_para_options TO service_role;
ALTER TABLE public.escalonou_para_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY escalonou_select ON public.escalonou_para_options FOR SELECT TO authenticated USING (true);
CREATE POLICY escalonou_admin_write ON public.escalonou_para_options FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_escalonou_updated_at BEFORE UPDATE ON public.escalonou_para_options
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ===== SEED: PitStop =====
INSERT INTO public.pitstop_options (nome, ordem) VALUES
  ('A definir', 0),
  ('Onboarding - Novo Acionamento', 10),
  ('Onboarding - 1° Monitoramento da Implantação', 20),
  ('Onboarding - 2° Monitoramento da Implantação', 30),
  ('Onboarding - Abertura/Boas Vindas', 40),
  ('Onboarding - Direcionado a unidade', 50),
  ('Onboarding - Em acompanhamento', 60),
  ('Onboarding - Finalização Bronze', 70),
  ('Onboarding - Reunião de acompanhamento', 80),
  ('Onboarding - Reunião de fechamento', 90),
  ('Onboarding - Cancelado', 100),
  ('Suporte Técnico / Sistemas', 110),
  ('Suporte Técnico / N2', 120),
  ('Suporte Técnico / Tecnologia', 130),
  ('Integração de Sistemas - Mesmo Ambiente', 140),
  ('Integração de Sistemas - Ambiente diferente', 150),
  ('Integração de Sistemas - Outros sistemas', 160),
  ('Treinamento / Capacitação', 170),
  ('Treinamento / Tira-dúvidas', 180),
  ('Produto / Desenvolvimento', 190),
  ('Produto / liberação de versão', 200),
  ('Produto / liberação de .exe', 210),
  ('Produto / Em acompanhamento', 220);

-- ===== SEED: Status Neo (valores iniciais razoáveis; admin ajusta) =====
INSERT INTO public.status_neo_options (nome, ordem) VALUES
  ('Aberto', 10),
  ('Em Andamento', 20),
  ('Aguardando Cliente', 30),
  ('Escalonado', 40),
  ('Resolvido', 50),
  ('Cancelado', 60);

-- ===== SEED: Escalonou Para (valores iniciais) =====
INSERT INTO public.escalonou_para_options (nome, ordem) VALUES
  ('Não escalonado', 0),
  ('Suporte N2', 10),
  ('Suporte Técnico', 20),
  ('Desenvolvimento', 30),
  ('Onboarding', 40),
  ('Financeiro', 50),
  ('Coordenação', 60);

-- ===== TABLE: gargalos =====
CREATE TABLE public.gargalos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data_registro DATE NOT NULL DEFAULT CURRENT_DATE,
  cliente TEXT NOT NULL,
  segmento public.segmento_gargalo NOT NULL,
  responsavel_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  categoria public.categoria_gargalo NOT NULL,
  pitstop TEXT,
  descricao TEXT NOT NULL,
  impacto_cliente public.impacto_gargalo NOT NULL,
  urgencia public.urgencia_gargalo NOT NULL,
  status public.status_gargalo NOT NULL DEFAULT 'Aberto',
  risco_churn public.risco_churn NOT NULL,
  acao_plano TEXT,
  data_prevista_resolucao DATE,
  data_resolucao DATE,
  tempo_resolucao_dias INT GENERATED ALWAYS AS (
    CASE WHEN data_resolucao IS NOT NULL THEN (data_resolucao - data_registro) END
  ) STORED,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gargalos TO authenticated;
GRANT ALL ON public.gargalos TO service_role;

ALTER TABLE public.gargalos ENABLE ROW LEVEL SECURITY;

CREATE POLICY gargalos_select_own ON public.gargalos FOR SELECT TO authenticated
  USING (responsavel_id = auth.uid() OR created_by = auth.uid());
CREATE POLICY gargalos_select_priv ON public.gargalos FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'coordinator'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY gargalos_insert ON public.gargalos FOR INSERT TO authenticated
  WITH CHECK (
    public.is_active(auth.uid())
    AND (
      responsavel_id = auth.uid()
      OR public.has_role(auth.uid(), 'coordinator'::app_role)
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  );
CREATE POLICY gargalos_update_own ON public.gargalos FOR UPDATE TO authenticated
  USING (responsavel_id = auth.uid() AND public.is_active(auth.uid()))
  WITH CHECK (responsavel_id = auth.uid());
CREATE POLICY gargalos_update_priv ON public.gargalos FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'coordinator'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'coordinator'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY gargalos_delete_admin ON public.gargalos FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_gargalos_created_by BEFORE INSERT ON public.gargalos
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_created_by();
CREATE TRIGGER trg_gargalos_updated_at BEFORE UPDATE ON public.gargalos
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_gargalos_audit AFTER INSERT OR UPDATE OR DELETE ON public.gargalos
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit();

CREATE INDEX idx_gargalos_responsavel ON public.gargalos(responsavel_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_gargalos_status ON public.gargalos(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_gargalos_data ON public.gargalos(data_registro DESC) WHERE deleted_at IS NULL;

-- ===== TABLE: registros_neo =====
CREATE TABLE public.registros_neo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  protocolo_neo TEXT NOT NULL,
  data_contato TIMESTAMPTZ NOT NULL DEFAULT now(),
  nome_cliente TEXT NOT NULL,
  telefone TEXT,
  tipo public.tipo_neo NOT NULL,
  esteira public.esteira_neo NOT NULL,
  status TEXT NOT NULL,
  escalonou_para TEXT,
  observacao TEXT,
  responsavel_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX ux_registros_neo_protocolo_ativo
  ON public.registros_neo (protocolo_neo)
  WHERE deleted_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.registros_neo TO authenticated;
GRANT ALL ON public.registros_neo TO service_role;

ALTER TABLE public.registros_neo ENABLE ROW LEVEL SECURITY;

CREATE POLICY registros_neo_select_own ON public.registros_neo FOR SELECT TO authenticated
  USING (responsavel_id = auth.uid() OR created_by = auth.uid());
CREATE POLICY registros_neo_select_priv ON public.registros_neo FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'coordinator'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY registros_neo_insert ON public.registros_neo FOR INSERT TO authenticated
  WITH CHECK (
    public.is_active(auth.uid())
    AND (
      responsavel_id = auth.uid()
      OR public.has_role(auth.uid(), 'coordinator'::app_role)
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  );
CREATE POLICY registros_neo_update_own ON public.registros_neo FOR UPDATE TO authenticated
  USING (responsavel_id = auth.uid() AND public.is_active(auth.uid()))
  WITH CHECK (responsavel_id = auth.uid());
CREATE POLICY registros_neo_update_priv ON public.registros_neo FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'coordinator'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'coordinator'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY registros_neo_delete_admin ON public.registros_neo FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_registros_neo_created_by BEFORE INSERT ON public.registros_neo
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_created_by();
CREATE TRIGGER trg_registros_neo_updated_at BEFORE UPDATE ON public.registros_neo
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_registros_neo_audit AFTER INSERT OR UPDATE OR DELETE ON public.registros_neo
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit();

CREATE INDEX idx_registros_neo_responsavel ON public.registros_neo(responsavel_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_registros_neo_data ON public.registros_neo(data_contato DESC) WHERE deleted_at IS NULL;
