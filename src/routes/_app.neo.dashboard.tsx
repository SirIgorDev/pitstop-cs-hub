import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, CheckCircle2, ClipboardList, GitBranch, MessageSquare } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { EmptyState, ErrorState, LoadingState } from "@/components/state-views";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/mock-role";

export const Route = createFileRoute("/_app/neo/dashboard")({
  component: NeoDashboardPage,
  head: () => ({ meta: [{ title: "Dashboard Neo — Controller CS" }] }),
});

type NeoRow = {
  data_contato: string;
  escalonou_para: string | null;
  esteira: string;
  nome_cliente: string;
  responsavel_id: string;
  status: string;
  tipo: string;
};

type ChartDatum = { nome: string; quantidade: number };

const barConfig = {
  quantidade: { label: "Registros", color: "var(--primary)" },
} satisfies ChartConfig;

const lineConfig = {
  quantidade: { label: "Registros", color: "var(--primary)" },
} satisfies ChartConfig;

const TYPE_COLORS: Record<string, string> = {
  Proativo: "#2563eb",
  Reativo: "#f97316",
};

function NeoDashboardPage() {
  const { role, user } = useAuth();
  const queryClient = useQueryClient();
  const [mes, setMes] = useState(currentMonth());
  const [analista, setAnalista] = useState("all");
  const canFilterAnalyst = role === "coordenador" || role === "administrador";

  const analystsQuery = useQuery({
    queryKey: ["dashboard-neo-analysts"],
    enabled: canFilterAnalyst,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome")
        .eq("role", "analyst")
        .eq("ativo", true)
        .is("deleted_at", null)
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const query = useQuery({
    queryKey: ["dashboard-neo", mes, canFilterAnalyst ? analista : "own"],
    enabled: Boolean(user.id),
    queryFn: async () => {
      let request = supabase
        .from("registros_neo")
        .select("data_contato, escalonou_para, esteira, nome_cliente, responsavel_id, status, tipo")
        .is("deleted_at", null);

      if (mes !== "all") {
        const { start, end } = monthBounds(mes);
        request = request.gte("data_contato", start).lt("data_contato", end);
      }

      if (canFilterAnalyst && analista !== "all") {
        request = request.eq("responsavel_id", analista);
      }

      const { data, error } = await request.order("data_contato", {
        ascending: true,
      });
      if (error) throw error;
      return (data ?? []) as NeoRow[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("dashboard-neo-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "registros_neo" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["dashboard-neo"] });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const rows = useMemo(() => query.data ?? [], [query.data]);
  const metrics = useMemo(() => calculateMetrics(rows), [rows]);
  const charts = useMemo(
    () => ({
      tipo: groupBy(rows, (row) => row.tipo),
      esteira: groupBy(rows, (row) => row.esteira),
      status: groupBy(rows, (row) => row.status),
      escalonamentos: groupBy(
        rows.filter(isEscalated),
        (row) => row.escalonou_para || "Não informado",
      ),
      evolucao: evolutionByMonth(rows),
    }),
    [rows],
  );
  const meses = useMemo(makeMonthOptions, []);

  if (query.isLoading) {
    return <LoadingState title="Carregando Dashboard Neo…" />;
  }

  if (query.isError) {
    return (
      <ErrorState
        title="Não foi possível carregar o Dashboard Neo"
        description={query.error.message}
        action={<Button onClick={() => query.refetch()}>Tentar novamente</Button>}
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Dashboard Neo"
        description={
          role === "analista"
            ? "Indicadores dos seus atendimentos Neo."
            : "Indicadores consolidados dos atendimentos Neo."
        }
        actions={
          <div className="flex flex-wrap items-end gap-3">
            {canFilterAnalyst && (
              <label className="grid min-w-52 gap-1.5 text-xs font-medium text-foreground">
                Analista
                <Select value={analista} onValueChange={setAnalista}>
                  <SelectTrigger aria-label="Analista">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os analistas</SelectItem>
                    {(analystsQuery.data ?? []).map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            )}
            <label className="grid min-w-52 gap-1.5 text-xs font-medium text-foreground">
              Mês
              <Select value={mes} onValueChange={setMes}>
                <SelectTrigger aria-label="Mês">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os meses</SelectItem>
                  {meses.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>
        }
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi label="Total de registros" value={metrics.total} icon={ClipboardList} />
        <Kpi label="Proativos" value={metrics.proativos} icon={ArrowUpRight} />
        <Kpi label="Reativos" value={metrics.reativos} icon={MessageSquare} />
        <Kpi label="Clientes ativos" value={metrics.clientesAtivos} icon={CheckCircle2} />
        <Kpi label="Registros escalonados" value={metrics.escalonados} icon={GitBranch} />
      </section>

      {rows.length === 0 ? (
        <EmptyState
          className="mt-6"
          title="Nenhum Registro Neo encontrado"
          description="Não existem registros para o mês selecionado."
        />
      ) : (
        <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <NeoBarChart title="Registros por tipo" data={charts.tipo} colorMap={TYPE_COLORS} />
          <NeoBarChart title="Registros por esteira" data={charts.esteira} />
          <NeoBarChart title="Registros por status" data={charts.status} />
          <NeoBarChart
            title="Escalonamentos"
            data={charts.escalonamentos}
            emptyMessage="Nenhum registro escalonado no período."
          />
          <EvolutionChart data={charts.evolucao} />
        </section>
      )}
    </>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof ClipboardList;
}) {
  return (
    <article className="rounded-md border border-border bg-background p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-4 text-2xl font-semibold tabular-nums text-foreground">
        {value.toLocaleString("pt-BR")}
      </p>
    </article>
  );
}

function NeoBarChart({
  title,
  data,
  colorMap,
  emptyMessage = "Sem dados para exibir.",
}: {
  title: string;
  data: ChartDatum[];
  colorMap?: Record<string, string>;
  emptyMessage?: string;
}) {
  if (!data.length) {
    return (
      <ChartCard title={title}>
        <p className="grid h-64 place-items-center text-sm text-muted-foreground">{emptyMessage}</p>
      </ChartCard>
    );
  }

  const height = Math.max(280, data.length * 34);
  const axisWidth = Math.min(
    190,
    Math.max(100, Math.max(...data.map((item) => item.nome.length)) * 6.3),
  );

  return (
    <ChartCard title={title}>
      <ChartContainer config={barConfig} className="w-full" style={{ height }}>
        <BarChart
          accessibilityLayer
          data={data}
          layout="vertical"
          margin={{ left: 4, right: 40, top: 4, bottom: 4 }}
        >
          <CartesianGrid horizontal={false} />
          <XAxis type="number" allowDecimals={false} hide />
          <YAxis
            type="category"
            dataKey="nome"
            width={axisWidth}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
          />
          <ChartTooltip
            cursor={{ fill: "var(--muted)" }}
            content={<ChartTooltipContent hideLabel />}
          />
          <Bar
            dataKey="quantidade"
            name="Registros"
            fill="var(--color-quantidade)"
            radius={[0, 4, 4, 0]}
          >
            <LabelList
              dataKey="quantidade"
              position="right"
              className="fill-foreground"
              fontSize={12}
            />
            {data.map((item) => (
              <Cell key={item.nome} fill={colorMap?.[item.nome] ?? "var(--color-quantidade)"} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}

function EvolutionChart({ data }: { data: ChartDatum[] }) {
  return (
    <ChartCard title="Evolução mensal" className="xl:col-span-2">
      <ChartContainer config={lineConfig} className="h-80 w-full">
        <LineChart
          accessibilityLayer
          data={data}
          margin={{ left: 8, right: 24, top: 16, bottom: 8 }}
        >
          <CartesianGrid vertical={false} />
          <XAxis dataKey="nome" tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} hide />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Line
            type="monotone"
            dataKey="quantidade"
            name="Registros"
            stroke="var(--color-quantidade)"
            strokeWidth={3}
            dot={{ fill: "var(--color-quantidade)" }}
          >
            <LabelList
              dataKey="quantidade"
              position="top"
              className="fill-foreground"
              fontSize={12}
            />
          </Line>
        </LineChart>
      </ChartContainer>
    </ChartCard>
  );
}

function ChartCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <article
      className={`overflow-hidden rounded-md border border-border bg-background ${className}`}
    >
      <header className="border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </header>
      <div className="p-4">{children}</div>
    </article>
  );
}

function calculateMetrics(rows: NeoRow[]) {
  const clientesAtivos = new Set(
    rows
      .filter((row) => row.esteira === "Cliente ativo")
      .map((row) => row.nome_cliente.trim().toLocaleLowerCase("pt-BR")),
  ).size;

  return {
    total: rows.length,
    proativos: rows.filter((row) => row.tipo === "Proativo").length,
    reativos: rows.filter((row) => row.tipo === "Reativo").length,
    clientesAtivos,
    escalonados: rows.filter(isEscalated).length,
  };
}

function isEscalated(row: NeoRow) {
  const value = row.escalonou_para?.trim().toLocaleLowerCase("pt-BR");
  return Boolean(value && value !== "não escalonado" && value !== "nao escalonado");
}

function groupBy(rows: NeoRow[], getKey: (row: NeoRow) => string): ChartDatum[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = getKey(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([nome, quantidade]) => ({ nome, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade || a.nome.localeCompare(b.nome));
}

function evolutionByMonth(rows: NeoRow[]): ChartDatum[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const date = new Date(row.data_contato);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([value, quantidade]) => {
      const [year, month] = value.split("-").map(Number);
      return {
        nome: new Date(year, month - 1, 1).toLocaleDateString("pt-BR", {
          month: "short",
          year: "2-digit",
        }),
        quantidade,
      };
    });
}

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthBounds(value: string) {
  const [year, month] = value.split("-").map(Number);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return {
    start: new Date(`${year}-${String(month).padStart(2, "0")}-01T00:00:00`).toISOString(),
    end: new Date(`${nextYear}-${String(nextMonth).padStart(2, "0")}-01T00:00:00`).toISOString(),
  };
}

function makeMonthOptions() {
  const now = new Date();
  return Array.from({ length: 24 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    return {
      value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: date.toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      }),
    };
  });
}
