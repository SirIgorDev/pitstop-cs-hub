import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownUp, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { GargaloForm } from "@/components/gargalo-form";
import { EmptyState, ErrorState, LoadingState } from "@/components/state-views";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/mock-role";
import {
  IMPACTOS,
  RISCOS_CHURN,
  SEGMENTOS_GARGALO,
  STATUS_GARGALO,
  impactoBadge,
  riscoBadge,
  statusGargaloBadge,
} from "@/lib/constants";

export const Route = createFileRoute("/_app/gargalos")({
  component: GargalosPage,
  head: () => ({ meta: [{ title: "Gargalos — PitStop CS" }] }),
});

const PAGE_SIZE = 15;

function GargalosPage() {
  const { role } = useAuth();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [mes, setMes] = useState<string>("all");
  const [segmento, setSegmento] = useState<string>("all");
  const [responsavel, setResponsavel] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [impacto, setImpacto] = useState<string>("all");
  const [risco, setRisco] = useState<string>("all");
  const [order, setOrder] = useState<"desc" | "asc">("desc");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleting, setDeleting] = useState<any>(null);

  const analystsQ = useQuery({
    queryKey: ["profiles_ativos_all"],
    enabled: role !== "analista",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const query = useQuery({
    queryKey: ["gargalos", { search, mes, segmento, responsavel, status, impacto, risco, order, page }],
    queryFn: async () => {
      let q = supabase
        .from("gargalos")
        .select(
          "id, data_registro, cliente, segmento, categoria, pitstop, descricao, impacto_cliente, urgencia, status, risco_churn, acao_plano, responsavel_id, data_prevista_resolucao, data_resolucao, tempo_resolucao_dias, created_by",
          { count: "exact" },
        )
        .is("deleted_at", null);

      if (search.trim()) q = q.ilike("cliente", `%${search.trim()}%`);
      if (segmento !== "all") q = q.eq("segmento", segmento as never);
      if (responsavel !== "all") q = q.eq("responsavel_id", responsavel);
      if (status !== "all") q = q.eq("status", status as never);
      if (impacto !== "all") q = q.eq("impacto_cliente", impacto as never);
      if (risco !== "all") q = q.eq("risco_churn", risco as never);
      if (mes !== "all") {
        const [y, m] = mes.split("-").map(Number);
        const start = new Date(y, m - 1, 1).toISOString().slice(0, 10);
        const end = new Date(y, m, 1).toISOString().slice(0, 10);
        q = q.gte("data_registro", start).lt("data_registro", end);
      }

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      q = q.order("data_registro", { ascending: order === "asc" }).range(from, to);

      const { data, error, count } = await q;
      if (error) throw error;
      return { data: data ?? [], count: count ?? 0 };
    },
  });

  // Mapa de nomes de responsáveis
  const nomeMap = useMemo(() => {
    const m = new Map<string, string>();
    (analystsQ.data ?? []).forEach((a) => m.set(a.id, a.nome));
    return m;
  }, [analystsQ.data]);

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("gargalos")
        .update({ deleted_at: new Date().toISOString() } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Gargalo excluído");
      qc.invalidateQueries({ queryKey: ["gargalos"] });
      setDeleting(null);
    },
    onError: (err: Error) => {
      toast.error("Não foi possível excluir", { description: err.message });
    },
  });

  const meses = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }).map((_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      return {
        value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
      };
    });
  }, []);

  const total = query.data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function exportCsv() {
    const rows = query.data?.data ?? [];
    if (rows.length === 0) return toast.error("Nada para exportar");
    const headers = [
      "ID","Data","Cliente","Segmento","Categoria","PitStop","Descrição","Impacto","Urgência","Status","Risco Churn","Prev. Resolução","Resolução","Tempo (dias)"
    ];
    const lines = [headers.join(";")];
    for (const r of rows) {
      lines.push([
        r.id, r.data_registro, r.cliente, r.segmento, r.categoria, r.pitstop ?? "",
        (r.descricao ?? "").replace(/[\r\n;]/g, " "),
        r.impacto_cliente, r.urgencia, r.status, r.risco_churn,
        r.data_prevista_resolucao ?? "", r.data_resolucao ?? "", r.tempo_resolucao_dias ?? "",
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";"));
    }
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gargalos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader
        title="Gargalos"
        description="Registros de gargalos identificados junto aos clientes."
        actions={
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary-dark"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Novo gargalo
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-64 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente…"
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <FilterSelect value={mes} onChange={(v) => { setMes(v); setPage(1); }} placeholder="Mês" options={[{ value: "all", label: "Todos os meses" }, ...meses]} />
        <FilterSelect value={segmento} onChange={(v) => { setSegmento(v); setPage(1); }} placeholder="Segmento" options={[{ value: "all", label: "Todos segmentos" }, ...SEGMENTOS_GARGALO.map((s) => ({ value: s, label: s }))]} />
        {role !== "analista" && (
          <FilterSelect
            value={responsavel}
            onChange={(v) => { setResponsavel(v); setPage(1); }}
            placeholder="Responsável"
            options={[{ value: "all", label: "Todos responsáveis" }, ...(analystsQ.data ?? []).map((a) => ({ value: a.id, label: a.nome }))]}
          />
        )}
        <FilterSelect value={status} onChange={(v) => { setStatus(v); setPage(1); }} placeholder="Status" options={[{ value: "all", label: "Todos status" }, ...STATUS_GARGALO.map((s) => ({ value: s, label: s }))]} />
        <FilterSelect value={impacto} onChange={(v) => { setImpacto(v); setPage(1); }} placeholder="Impacto" options={[{ value: "all", label: "Todos impactos" }, ...IMPACTOS.map((s) => ({ value: s, label: s }))]} />
        <FilterSelect value={risco} onChange={(v) => { setRisco(v); setPage(1); }} placeholder="Risco" options={[{ value: "all", label: "Todos riscos" }, ...RISCOS_CHURN.map((s) => ({ value: s, label: s }))]} />
        <Button variant="outline" onClick={() => setOrder(order === "desc" ? "asc" : "desc")}>
          <ArrowDownUp className="mr-2 h-4 w-4" /> Data {order === "desc" ? "↓" : "↑"}
        </Button>
        <Button variant="outline" onClick={exportCsv}>Exportar CSV</Button>
      </div>

      {query.isLoading ? (
        <LoadingState title="Carregando gargalos…" />
      ) : query.isError ? (
        <ErrorState title="Erro ao carregar" description={(query.error as Error).message} />
      ) : total === 0 ? (
        <EmptyState
          title="Nenhum gargalo encontrado"
          description="Ajuste os filtros ou registre um novo gargalo."
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-md border border-border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Segmento</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Impacto</TableHead>
                  <TableHead>Risco</TableHead>
                  <TableHead>Tempo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data!.data.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="text-muted-foreground">
                      {new Date(g.data_registro).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{g.cliente}</TableCell>
                    <TableCell className="text-muted-foreground">{g.segmento}</TableCell>
                    <TableCell className="text-muted-foreground">{g.categoria}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusGargaloBadge(g.status)}>
                        {g.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={impactoBadge(g.impacto_cliente)}>
                        {g.impacto_cliente}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={riscoBadge(g.risco_churn)}>
                        {g.risco_churn}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {g.tempo_resolucao_dias != null ? `${g.tempo_resolucao_dias} d` : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(g);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleting(g)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Página {page} de {totalPages} · {total} registro(s)
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        </>
      )}

      <GargaloForm open={formOpen} onOpenChange={setFormOpen} initial={editing ?? undefined} />

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir gargalo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação marcará o gargalo <strong>{deleting?.cliente}</strong> como excluído.
              A operação fica registrada na auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleting && deleteMut.mutate(deleting.id)}
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-auto min-w-40">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
