import { createFileRoute } from "@tanstack/react-router";
import { CalendarRange, Download } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/neo/dashboard")({
  component: NeoDashboardPage,
  head: () => ({ meta: [{ title: "Dashboard Neo — PitStop CS" }] }),
});

const KPIS = [
  { label: "Atendimentos no mês", value: "1.284", delta: "+12% vs. mês anterior" },
  { label: "Tempo médio de atendimento", value: "14 min", delta: "-2 min vs. mês anterior" },
  { label: "Resolução no 1º contato", value: "78%", delta: "+4 pp" },
  { label: "Satisfação (CSAT)", value: "4,6", delta: "de 5,0" },
];

const CANAIS = [
  { nome: "Chat Neo", pct: 58 },
  { nome: "Telefone", pct: 27 },
  { nome: "E-mail", pct: 15 },
];

const MOTIVOS = [
  { nome: "Configuração fiscal", qtd: 214 },
  { nome: "Folha de pagamento", qtd: 178 },
  { nome: "Emissão de nota", qtd: 152 },
  { nome: "Treinamento", qtd: 121 },
  { nome: "Relatórios gerenciais", qtd: 96 },
];

const SEMANAS = [
  { rot: "S1", val: 62 },
  { rot: "S2", val: 78 },
  { rot: "S3", val: 55 },
  { rot: "S4", val: 90 },
];

function NeoDashboardPage() {
  const maxSemana = Math.max(...SEMANAS.map((s) => s.val));
  return (
    <>
      <PageHeader
        title="Dashboard Neo"
        description="Indicadores consolidados dos atendimentos Neo."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline">
              <CalendarRange className="mr-2 h-4 w-4" /> Julho / 2026
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" /> Exportar
            </Button>
          </div>
        }
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((k) => (
          <div key={k.label} className="rounded-md border border-border bg-background p-5">
            <div className="text-sm text-muted-foreground">{k.label}</div>
            <div className="mt-2 text-2xl font-semibold text-foreground">{k.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{k.delta}</div>
          </div>
        ))}
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-md border border-border bg-background lg:col-span-2">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-foreground">Volume por semana</h2>
            <p className="text-xs text-muted-foreground">Atendimentos concluídos por semana em julho.</p>
          </div>
          <div className="flex h-56 items-end gap-6 px-6 pb-6 pt-8">
            {SEMANAS.map((s) => (
              <div key={s.rot} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t bg-primary/80"
                  style={{ height: `${(s.val / maxSemana) * 100}%` }}
                />
                <div className="text-xs text-muted-foreground">{s.rot}</div>
                <div className="text-xs font-medium text-foreground">{s.val * 5}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-border bg-background">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-foreground">Distribuição por canal</h2>
          </div>
          <ul className="space-y-3 px-5 py-4">
            {CANAIS.map((c) => (
              <li key={c.nome}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{c.nome}</span>
                  <span className="text-muted-foreground">{c.pct}%</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded bg-muted">
                  <div className="h-full bg-primary" style={{ width: `${c.pct}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-6 rounded-md border border-border bg-background">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">Principais motivos</h2>
          <p className="text-xs text-muted-foreground">Top 5 motivos de contato no período.</p>
        </div>
        <ul className="divide-y divide-border">
          {MOTIVOS.map((m) => (
            <li key={m.nome} className="flex items-center justify-between px-5 py-3 text-sm">
              <span className="text-foreground">{m.nome}</span>
              <span className="text-muted-foreground">{m.qtd} atendimentos</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
