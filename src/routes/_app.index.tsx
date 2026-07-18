import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
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

const ULTIMAS = [
  {
    tipo: "Gargalo",
    cliente: "Construtora Vale Verde",
    resumo: "Integração contábil aguardando resposta do time de produto",
    quando: "há 12 min",
    status: "Em andamento",
  },
  {
    tipo: "Atendimento",
    cliente: "Rede Farma Bem",
    resumo: "Dúvida sobre folha de pagamento — canal Neo",
    quando: "há 47 min",
    status: "Resolvido",
  },
  {
    tipo: "Gargalo",
    cliente: "Transportes Sul Norte",
    resumo: "Falha ao emitir NFS-e — replicando em ambiente de teste",
    quando: "há 2 h",
    status: "Aberto",
  },
  {
    tipo: "Atendimento",
    cliente: "Escritório Prado & Associados",
    resumo: "Treinamento de novo colaborador — módulo fiscal",
    quando: "há 3 h",
    status: "Resolvido",
  },
];

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
        <Kpi label="Gargalos abertos" value="14" delta="+3 vs. semana anterior" icon={Clock} tone="primary" />
        <Kpi label="Em andamento" value="8" delta="prazo médio 3d" icon={TrendingUp} />
        <Kpi label="Resolvidos no mês" value="42" delta="+18% vs. mês anterior" icon={CheckCircle2} tone="success" />
        <Kpi label="Atendimentos Neo" value="127" delta="média 6/dia" icon={ArrowUpRight} />
      </section>

      <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-md border border-border bg-background lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-foreground">Últimas atividades</h2>
            <span className="text-xs text-muted-foreground">Atualizado agora</span>
          </div>
          <ul className="divide-y divide-border">
            {ULTIMAS.map((a, i) => (
              <li key={i} className="flex items-start gap-4 px-5 py-4">
                <div className="mt-0.5 shrink-0">
                  <Badge
                    variant="outline"
                    className={
                      a.tipo === "Gargalo"
                        ? "border-primary/30 bg-primary/5 text-primary"
                        : "border-border bg-muted text-muted-foreground"
                    }
                  >
                    {a.tipo}
                  </Badge>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{a.cliente}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">{a.quando}</span>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">{a.resumo}</p>
                </div>
                <span
                  className={
                    "shrink-0 self-center rounded-full px-2 py-0.5 text-xs " +
                    (a.status === "Aberto"
                      ? "bg-primary/10 text-primary"
                      : a.status === "Em andamento"
                      ? "bg-muted text-foreground"
                      : "bg-success/10 text-success")
                  }
                >
                  {a.status}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-md border border-border bg-background">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-foreground">Distribuição por segmento</h2>
          </div>
          <ul className="space-y-3 px-5 py-4 text-sm">
            {[
              { nome: "Construção Civil", pct: 34 },
              { nome: "Varejo Farma", pct: 22 },
              { nome: "Transporte e Logística", pct: 18 },
              { nome: "Escritórios Contábeis", pct: 14 },
              { nome: "Indústria", pct: 12 },
            ].map((s) => (
              <li key={s.nome}>
                <div className="flex items-center justify-between">
                  <span className="text-foreground">{s.nome}</span>
                  <span className="text-muted-foreground">{s.pct}%</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded bg-muted">
                  <div className="h-full bg-primary" style={{ width: `${s.pct}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
