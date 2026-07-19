import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Clock, RotateCcw, Timer } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/mock-role";
import { SEGMENTOS_GARGALO } from "@/lib/constants";

export const Route = createFileRoute("/_app/")({
  component: DashboardGargalos,
  head: () => ({ meta: [{ title: "Dashboard de Gargalos — PitStop CS" }] }),
});

type GargaloDashboardRow = {
  categoria: string;
  cliente: string;
  data_registro: string;
  impacto_cliente: string;
  pitstop: string | null;
  responsavel_id: string;
  risco_churn: string;
  segmento: string;
  status: string;
  tempo_resolucao_dias: number | null;
};

type ChartDatum = {
  nome: string;
  quantidade: number;
};

const chartConfig = {
  quantidade: {
    label: "Gargalos",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

const STATUS_COLORS: Record<string, string> = {
  Aberto: "#dc2626",
  "Em Andamento": "#f59e0b",
  Monitorando: "#2563eb",
  Resolvido: "#16a34a",
};

const IMPACT_COLORS: Record<string, string> = {
  Baixo: "#65a30d",
  Médio: "#eab308",
  Alto: "#f97316",
  Crítico: "#dc2626",
};

function DashboardGargalos() {
  const { role, user } = useAuth();
  const queryClient = useQueryClient();
  const [mes, setMes] = useState(currentMonth());
  const [segmento, setSegmento] = useState("all");
  const [responsavel, setResponsavel] = useState("all");

  const profilesQuery = useQuery({
    queryKey: ["dashboard-gargalos-profiles", role, user.id],
    enabled: Boolean(user.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome")
        .eq("ativo", true)
        .is("deleted_at", null)
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const gargalosQuery = useQuery({
    queryKey: ["dashboard-gargalos", mes, segmento, responsavel],
    enabled: Boolean(user.id),
    queryFn: async () => {
      let query = supabase
        .from("gargalos")
        .select(
          "categoria, cliente, data_registro, impacto_cliente, pitstop, responsavel_id, risco_churn, segmento, status, tempo_resolucao_dias",
        )
        .is("deleted_at", null);

      if (mes !== "all") {
        const { start, end } = monthBounds(mes);
        query = query.gte("data_registro", start).lt("data_registro", end);
      }
      if (segmento !== "all") {
        query = query.eq("segmento", segmento as never);
      }
      if (responsavel !== "all") {
        query = query.eq("responsavel_id", responsavel);
      }

      const { data, error } = await query.order("data_registro", {
        ascending: false,
      });
      if (error) throw error;
      return (data ?? []) as GargaloDashboardRow[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("dashboard-gargalos-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "gargalos" }, () => {
        void queryClient.invalidateQueries({
          queryKey: ["dashboard-gargalos"],
        });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const profileMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const profile of profilesQuery.data ?? []) {
      map.set(profile.id, profile.nome);
    }
    if (user.id && !map.has(user.id)) map.set(user.id, user.nome);
    return map;
  }, [profilesQuery.data, user.id, user.nome]);

  const rows = useMemo(() => gargalosQuery.data ?? [], [gargalosQuery.data]);
  const metrics = useMemo(() => calculateMetrics(rows), [rows]);
  const charts = useMemo(
    () => ({
      categoria: groupBy(rows, (row) => row.categoria),
      segmento: groupBy(rows, (row) => row.segmento),
      status: groupBy(rows, (row) => row.status),
      impacto: groupBy(rows, (row) => row.impacto_cliente),
      responsavel: groupBy(
        rows,
        (row) => profileMap.get(row.responsavel_id) ?? "Responsável não identificado",
      ),
      pitstop: groupBy(rows, (row) => row.pitstop || "Não informado"),
    }),
    [profileMap, rows],
  );

  const meses = useMemo(makeMonthOptions, []);
  const clearFilters = () => {
    setMes(currentMonth());
    setSegmento("all");
    setResponsavel("all");
  };

  if (gargalosQuery.isLoading || profilesQuery.isLoading) {
    return <LoadingState title="Carregando dashboard…" />;
  }

  if (gargalosQuery.isError) {
    return (
      <ErrorState
        title="Não foi possível carregar o dashboard"
        description={gargalosQuery.error.message}
        action={<Button onClick={() => gargalosQuery.refetch()}>Tentar novamente</Button>}
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Dashboard de Gargalos"
        description={
          role === "analista"
            ? "Acompanhamento dos seus gargalos de Customer Success."
            : "Visão consolidada dos gargalos do time de Customer Success."
        }
      />

      <section
        aria-label="Filtros do dashboard"
        className="mb-6 flex flex-wrap items-end gap-3 rounded-md border border-border bg-background p-4"
      >
        <FilterSelect
          label="Mês"
          value={mes}
          onChange={setMes}
          options={[{ value: "all", label: "Todos os meses" }, ...meses]}
        />
        <FilterSelect
          label="Segmento"
          value={segmento}
          onChange={setSegmento}
          options={[
            { value: "all", label: "Todos os segmentos" },
            ...SEGMENTOS_GARGALO.map((item) => ({
              value: item,
              label: item,
            })),
          ]}
        />
        {role !== "analista" && (
          <FilterSelect
            label="Responsável CS"
            value={responsavel}
            onChange={setResponsavel}
            options={[
              { value: "all", label: "Todos os responsáveis" },
              ...(profilesQuery.data ?? []).map((profile) => ({
                value: profile.id,
                label: profile.nome,
              })),
            ]}
          />
        )}
        <Button variant="outline" onClick={clearFilters}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Limpar filtros
        </Button>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Total de gargalos"
          value={formatNumber(metrics.total)}
          icon={AlertTriangle}
        />
        <KpiCard
          label="Gargalos abertos"
          value={formatNumber(metrics.abertos)}
          icon={Clock}
          tone="destructive"
        />
        <KpiCard
          label="Clientes com risco alto de churn"
          value={formatNumber(metrics.clientesRiscoAlto)}
          icon={AlertTriangle}
          tone="warning"
        />
        <KpiCard
          label="Taxa de resolução"
          value={`${metrics.taxaResolucao.toLocaleString("pt-BR", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          })}%`}
          icon={CheckCircle2}
          tone="success"
        />
        <KpiCard
          label="Tempo médio de resolução"
          value={
            metrics.tempoMedio == null
              ? "—"
              : `${metrics.tempoMedio.toLocaleString("pt-BR", {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })} dias`
          }
          icon={Timer}
        />
      </section>

      {rows.length === 0 ? (
        <EmptyState
          className="mt-6"
          title="Nenhum gargalo encontrado"
          description="Não existem registros para os filtros selecionados."
          action={
            <Button variant="outline" onClick={clearFilters}>
              Limpar filtros
            </Button>
          }
        />
      ) : (
        <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <DashboardChart title="Gargalos por categoria" data={charts.categoria} />
          <DashboardChart title="Gargalos por segmento" data={charts.segmento} />
          <DashboardChart
            title="Gargalos por status"
            data={charts.status}
            colorMap={STATUS_COLORS}
          />
          <DashboardChart
            title="Gargalos por impacto"
            data={charts.impacto}
            colorMap={IMPACT_COLORS}
          />
          <DashboardChart title="Gargalos por responsável CS" data={charts.responsavel} />
          <DashboardChart title="Gargalos por PitStop" data={charts.pitstop} />
        </section>
      )}
    </>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: string;
  icon: typeof Clock;
  tone?: "primary" | "destructive" | "warning" | "success";
}) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    destructive: "bg-destructive/10 text-destructive",
    warning: "bg-warning/10 text-warning",
    success: "bg-success/10 text-success",
  };

  return (
    <article className="rounded-md border border-border bg-background p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tones[tone]}`}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-4 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
    </article>
  );
}

function DashboardChart({
  title,
  data,
  colorMap,
}: {
  title: string;
  data: ChartDatum[];
  colorMap?: Record<string, string>;
}) {
  const height = Math.max(280, data.length * 34);
  const longestLabel = Math.max(...data.map((item) => item.nome.length));
  const axisWidth = Math.min(210, Math.max(105, longestLabel * 6.5));

  return (
    <article className="overflow-hidden rounded-md border border-border bg-background">
      <header className="border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </header>
      <div className="p-4">
        <ChartContainer config={chartConfig} className="w-full" style={{ height }}>
          <BarChart
            accessibilityLayer
            data={data}
            layout="vertical"
            margin={{ left: 4, right: 24, top: 4, bottom: 4 }}
          >
            <CartesianGrid horizontal={false} />
            <XAxis type="number" allowDecimals={false} />
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
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(value) => (
                    <div className="flex min-w-32 items-center justify-between gap-4">
                      <span className="text-muted-foreground">Gargalos</span>
                      <strong className="text-foreground">{String(value)}</strong>
                    </div>
                  )}
                />
              }
            />
            <Bar
              dataKey="quantidade"
              name="Gargalos"
              fill="var(--color-quantidade)"
              radius={[0, 4, 4, 0]}
            >
              {data.map((item) => (
                <Cell key={item.nome} fill={colorMap?.[item.nome] ?? "var(--color-quantidade)"} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>
    </article>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="grid min-w-48 gap-1.5 text-xs font-medium text-foreground">
      {label}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

function calculateMetrics(rows: GargaloDashboardRow[]) {
  const resolvidos = rows.filter((row) => row.status === "Resolvido");
  const tempos = resolvidos
    .map((row) => row.tempo_resolucao_dias)
    .filter((value): value is number => value != null);
  const clientesRiscoAlto = new Set(
    rows
      .filter((row) => row.risco_churn === "Alto")
      .map((row) => row.cliente.trim().toLocaleLowerCase("pt-BR")),
  ).size;

  return {
    total: rows.length,
    abertos: rows.filter((row) => row.status === "Aberto").length,
    clientesRiscoAlto,
    taxaResolucao: rows.length ? (resolvidos.length / rows.length) * 100 : 0,
    tempoMedio: tempos.length
      ? tempos.reduce((sum, value) => sum + value, 0) / tempos.length
      : null,
  };
}

function groupBy(
  rows: GargaloDashboardRow[],
  getKey: (row: GargaloDashboardRow) => string,
): ChartDatum[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = getKey(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([nome, quantidade]) => ({ nome, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade || a.nome.localeCompare(b.nome));
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
    start: `${year}-${String(month).padStart(2, "0")}-01`,
    end: `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`,
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

function formatNumber(value: number) {
  return value.toLocaleString("pt-BR");
}
