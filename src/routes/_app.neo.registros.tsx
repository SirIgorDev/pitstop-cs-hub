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
import { NeoForm } from "@/components/neo-form";
import { EmptyState, ErrorState, LoadingState } from "@/components/state-views";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/mock-role";
import { TIPOS_NEO } from "@/lib/constants";

export const Route = createFileRoute("/_app/neo/registros")({
  component: NeoRegistrosPage,
  head: () => ({ meta: [{ title: "Registros Neo — Controller CS" }] }),
});

const PAGE_SIZE = 15;

function NeoRegistrosPage() {
  const { role } = useAuth();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [mes, setMes] = useState("all");
  const [tipo, setTipo] = useState("all");
  const [canal, setCanal] = useState("all");
  const [esteira, setEsteira] = useState("all");
  const [status, setStatus] = useState("all");
  const [responsavel, setResponsavel] = useState("all");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleting, setDeleting] = useState<any>(null);

  const statusQ = useQuery({
    queryKey: ["status_neo_options", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("status_neo_options")
        .select("id, nome, ordem")
        .eq("ativo", true)
        .is("deleted_at", null)
        .order("ordem");
      if (error) throw error;
      return data;
    },
  });

  const esteirasQ = useQuery({
    queryKey: ["esteira_neo_options", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("esteira_neo_options")
        .select("id, nome, ordem")
        .eq("ativo", true)
        .is("deleted_at", null)
        .order("ordem");
      if (error) throw error;
      return data;
    },
  });

  const canaisQ = useQuery({
    queryKey: ["canal_atendimento_options", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("canal_atendimento_options")
        .select("id, nome, ordem")
        .eq("ativo", true)
        .is("deleted_at", null)
        .order("ordem");
      if (error) throw error;
      return data;
    },
  });

  const analystsQ = useQuery({
    queryKey: ["profiles_ativos_all"],
    enabled: role !== "analista",
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, nome").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const query = useQuery({
    queryKey: ["registros_neo", { search, mes, tipo, canal, esteira, status, responsavel, order, page }],
    queryFn: async () => {
      let q = supabase
        .from("registros_neo")
        .select(
          "id, protocolo_neo, data_contato, nome_cliente, telefone, tipo, canal_atendimento, esteira, status, escalonou_para, observacao, responsavel_id, created_by",
          { count: "exact" },
        )
        .is("deleted_at", null);

      if (search.trim()) {
        const s = search.trim();
        q = q.or(`protocolo_neo.ilike.%${s}%,nome_cliente.ilike.%${s}%`);
      }
      if (tipo !== "all") q = q.eq("tipo", tipo as never);
      if (canal !== "all") q = q.eq("canal_atendimento", canal);
      if (esteira !== "all") q = q.eq("esteira", esteira as never);
      if (status !== "all") q = q.eq("status", status);
      if (responsavel !== "all") q = q.eq("responsavel_id", responsavel);
      if (mes !== "all") {
        const [y, m] = mes.split("-").map(Number);
        const start = new Date(y, m - 1, 1).toISOString();
        const end = new Date(y, m, 1).toISOString();
        q = q.gte("data_contato", start).lt("data_contato", end);
      }

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      q = q.order("data_contato", { ascending: order === "asc" }).range(from, to);

      const { data, error, count } = await q;
      if (error) throw error;
      return { data: data ?? [], count: count ?? 0 };
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("registros_neo")
        .update({ deleted_at: new Date().toISOString() } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Registro excluído");
      qc.invalidateQueries({ queryKey: ["registros_neo"] });
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
      "ID",
      "Protocolo Neo",
      "Data do contato",
      "Cliente",
      "Telefone",
      "Tipo",
      "Canal de atendimento",
      "Esteira",
      "Status",
      "Escalonou para",
      "Observação",
    ];
    const lines = [headers.join(";")];

    for (const row of rows) {
      lines.push(
        [
          row.id,
          row.protocolo_neo,
          formatDisplayDate(row.data_contato),
          row.nome_cliente,
          row.telefone ?? "",
          row.tipo,
          row.canal_atendimento ?? "",
          row.esteira,
          row.status,
          row.escalonou_para ?? "",
          row.observacao ?? "",
        ]
          .map((value) => `"${String(value).replace(/"/g, '""').replace(/[\r\n]+/g, " ")}"`)
          .join(";"),
      );
    }

    const blob = new Blob(["\ufeff" + lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cadastro-neo-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader
        title="Registros Neo"
        description="Atendimentos realizados pelo time nos canais Neo."
        actions={
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary-dark"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Novo registro
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-64 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por protocolo ou cliente…"
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <FilterSelect value={mes} onChange={(v) => { setMes(v); setPage(1); }} placeholder="Mês" options={[{ value: "all", label: "Todos os meses" }, ...meses]} />
        <FilterSelect value={tipo} onChange={(v) => { setTipo(v); setPage(1); }} placeholder="Tipo" options={[{ value: "all", label: "Todos tipos" }, ...TIPOS_NEO.map((s) => ({ value: s, label: s }))]} />
        <FilterSelect value={canal} onChange={(v) => { setCanal(v); setPage(1); }} placeholder="Canal" options={[{ value: "all", label: "Todos os canais" }, ...(canaisQ.data ?? []).map((s) => ({ value: s.nome, label: s.nome }))]} />
        <FilterSelect value={esteira} onChange={(v) => { setEsteira(v); setPage(1); }} placeholder="Esteira" options={[{ value: "all", label: "Todas esteiras" }, ...(esteirasQ.data ?? []).map((s) => ({ value: s.nome, label: s.nome }))]} />
        <FilterSelect value={status} onChange={(v) => { setStatus(v); setPage(1); }} placeholder="Status" options={[{ value: "all", label: "Todos status" }, ...(statusQ.data ?? []).map((s) => ({ value: s.nome, label: s.nome }))]} />
        {role !== "analista" && (
          <FilterSelect
            value={responsavel}
            onChange={(v) => { setResponsavel(v); setPage(1); }}
            placeholder="Responsável"
            options={[{ value: "all", label: "Todos responsáveis" }, ...(analystsQ.data ?? []).map((a) => ({ value: a.id, label: a.nome }))]}
          />
        )}
        <Button
          variant="outline"
          onClick={() => {
            setOrder(order === "desc" ? "asc" : "desc");
            setPage(1);
          }}
        >
          <ArrowDownUp className="mr-2 h-4 w-4" />
          Data {order === "desc" ? "↓" : "↑"}
        </Button>
        <Button variant="outline" onClick={exportCsv}>
          Exportar CSV
        </Button>
      </div>

      {query.isLoading ? (
        <LoadingState title="Carregando registros…" />
      ) : query.isError ? (
        <ErrorState title="Erro ao carregar" description={(query.error as Error).message} />
      ) : total === 0 ? (
        <EmptyState
          title="Nenhum registro encontrado"
          description="Ajuste os filtros ou registre um novo atendimento Neo."
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-md border border-border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Protocolo</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Esteira</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Escalonou</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data!.data.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{r.protocolo_neo}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDisplayDate(r.data_contato)}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{r.nome_cliente}</TableCell>
                    <TableCell className="text-muted-foreground">{r.tipo}</TableCell>
                    <TableCell className="text-muted-foreground">{r.canal_atendimento ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{r.esteira}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-border bg-muted text-foreground">
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.escalonou_para ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(r);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleting(r)}
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
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
                Anterior
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                Próxima
              </Button>
            </div>
          </div>
        </>
      )}

      <NeoForm open={formOpen} onOpenChange={setFormOpen} initial={editing ?? undefined} />

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação marcará o registro <strong>{deleting?.protocolo_neo}</strong> como excluído.
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

function formatDisplayDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
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
