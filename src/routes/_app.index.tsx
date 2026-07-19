import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useMockRole } from "@/lib/mock-role";

export const Route = createFileRoute("/_app/")({
  component: VisaoGeral,
  head: () => ({ meta: [{ title: "Visão Geral — PitStop CS" }] }),
});

interface KpiProps {
  label: string;
  value: string;
  delta?: string;
  icon: typeof Clock;
  tone?: "default" | "primary" | "success";
}

function Kpi({ label, value, delta, icon: Icon, tone = "default" }: KpiProps) {
  const toneClass =
    tone === "primary"
      ? "text-primary"
      : tone === "success"
      ? "text-success"
      : "text-foreground";
  return (
    <div className="rounded-md border border-border bg-background p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${toneClass}`} />
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-foreground">{value}</span>
        {delta && <span className="text-xs text-muted-foreground">{delta}</span>}
      </div>
    </div>
  );
}

function VisaoGeral() {
  const { user, role } = useMockRole();
  const escopo =
    role === "analista"
      ? "Resumo dos seus registros do mês."
      : "Resumo consolidado do time no mês.";

  return (
    <>
      <PageHeader
        title={`Olá, ${user.nome.split(" ")[0]}`}
        description={escopo}
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Gargalos abertos" value="0" icon={Clock} tone="primary" />
        <Kpi label="Em andamento" value="0" icon={TrendingUp} />
        <Kpi label="Resolvidos no mês" value="0" icon={CheckCircle2} tone="success" />
        <Kpi label="Atendimentos Neo" value="0" icon={ArrowUpRight} />
      </section>

      <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-md border border-border bg-background lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-foreground">Últimas atividades</h2>
            <span className="text-xs text-muted-foreground">Atualizado agora</span>
          </div>
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            Nenhuma atividade registrada.
          </div>
        </div>

        <div className="rounded-md border border-border bg-background">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-foreground">Distribuição por segmento</h2>
          </div>
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            Sem dados para exibir.
          </div>
        </div>
      </section>
    </>
  );
}
