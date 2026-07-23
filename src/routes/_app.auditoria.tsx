import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ErrorState, ForbiddenState, LoadingState } from "@/components/state-views";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/mock-role";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app/auditoria")({
  component: AuditoriaPage,
  head: () => ({
    meta: [{ title: "Auditoria — Controller CS" }, { name: "robots", content: "noindex" }],
  }),
});

type AuditLog = {
  id: string;
  user_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  created_at: string;
};

const ACTION_LABELS: Record<string, string> = {
  create: "Criação",
  update: "Edição",
  delete: "Exclusão",
  soft_delete: "Inativação",
  admin_change: "Alteração administrativa",
};

const ENTITY_LABELS: Record<string, string> = {
  gargalos: "Gargalo",
  registros_neo: "Registro Neo",
  profiles: "Usuário",
  categoria_gargalo_options: "Categoria de gargalo",
  pitstop_options: "PitStop",
  canal_atendimento_options: "Canal de atendimento",
  esteira_neo_options: "Esteira Neo",
  status_neo_options: "Status Neo",
  escalonou_para_options: "Escalonou Para",
};

const FIELD_LABELS: Record<string, string> = {
  nome: "Nome",
  email: "E-mail",
  role: "Perfil",
  ativo: "Situação",
  canal_atendimento: "Canal de atendimento",
  cliente: "Cliente",
  segmento: "Segmento",
  responsavel_id: "Responsável",
  categoria: "Categoria",
  pitstop: "PitStop",
  descricao: "Descrição",
  impacto_cliente: "Impacto no cliente",
  urgencia: "Urgência",
  status: "Status",
  risco_churn: "Risco de churn",
  acao_plano: "Ação / Plano",
  data_registro: "Data de registro",
  data_prevista_resolucao: "Previsão de resolução",
  data_resolucao: "Data de resolução",
  protocolo_neo: "Protocolo Neo",
  data_contato: "Data do contato",
  nome_cliente: "Cliente",
  telefone: "Telefone",
  tipo: "Tipo",
  esteira: "Esteira",
  escalonou_para: "Escalonou para",
  observacao: "Observação",
};

const IGNORED_FIELDS = new Set([
  "id",
  "created_at",
  "created_by",
  "updated_at",
  "updated_by",
  "deleted_at",
  "avatar_path",
]);

function actionBadge(action: string) {
  if (action === "create") return "border-success/30 bg-success/5 text-success";
  if (action === "delete" || action === "soft_delete") {
    return "border-destructive/30 bg-destructive/5 text-destructive";
  }
  return "border-border bg-muted text-foreground";
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "Não informado";
  if (typeof value === "boolean") return value ? "Ativo" : "Inativo";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function getChanges(log: AuditLog) {
  const before = log.before_data ?? {};
  const after = log.after_data ?? {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);

  return [...keys]
    .filter((key) => !IGNORED_FIELDS.has(key))
    .filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    .map((key) => ({
      field: FIELD_LABELS[key] ?? key.replaceAll("_", " "),
      before: before[key],
      after: after[key],
    }));
}

function AuditoriaPage() {
  const { role } = useAuth();
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("all");
  const [entity, setEntity] = useState("all");

  const query = useQuery({
    queryKey: ["audit-logs"],
    enabled: role === "coordenador" || role === "administrador",
    queryFn: async () => {
      const { data: logs, error } = await supabase
        .from("audit_logs")
        .select("id, user_id, action, entity, entity_id, before_data, after_data, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;

      const userIds = [...new Set((logs ?? []).map((item) => item.user_id).filter(Boolean))] as string[];
      const authors = new Map<string, string>();

      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, nome, email")
          .in("id", userIds);
        if (profilesError) throw profilesError;
        for (const profile of profiles ?? []) {
          authors.set(profile.id, profile.nome || profile.email);
        }
      }

      return (logs ?? []).map((item) => ({
        ...(item as AuditLog),
        author: item.user_id ? authors.get(item.user_id) ?? "Usuário não identificado" : "Sistema",
      }));
    },
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return (query.data ?? []).filter((log) => {
      if (action !== "all" && log.action !== action) return false;
      if (entity !== "all" && log.entity !== entity) return false;
      if (!term) return true;
      return [
        log.author,
        ACTION_LABELS[log.action] ?? log.action,
        ENTITY_LABELS[log.entity] ?? log.entity,
        log.entity_id ?? "",
      ].some((value) => value.toLocaleLowerCase("pt-BR").includes(term));
    });
  }, [action, entity, query.data, search]);

  if (role === "analista") {
    return (
      <>
        <PageHeader title="Auditoria" />
        <ForbiddenState description="A trilha de auditoria está disponível apenas para coordenadores e administradores." />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Auditoria"
        description="Trilha completa de eventos do sistema — criação, edição e exclusão de registros."
      />

      <div className="mb-4 grid gap-2 md:grid-cols-[minmax(16rem,1fr)_13rem_14rem_auto]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por autor, entidade ou ID…"
            className="pl-9"
          />
        </div>
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger aria-label="Filtrar por ação">
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as ações</SelectItem>
            {Object.entries(ACTION_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={entity} onValueChange={setEntity}>
          <SelectTrigger aria-label="Filtrar por entidade">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as entidades</SelectItem>
            {Object.entries(ENTITY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          disabled={!search && action === "all" && entity === "all"}
          onClick={() => {
            setSearch("");
            setAction("all");
            setEntity("all");
          }}
        >
          <X className="mr-2 h-4 w-4" /> Limpar
        </Button>
      </div>

      {query.isLoading ? (
        <LoadingState title="Carregando auditoria…" />
      ) : query.isError ? (
        <ErrorState title="Erro ao carregar auditoria" description={query.error.message} />
      ) : filtered.length === 0 ? (
        <div className="rounded-md border border-border bg-background px-5 py-12 text-center text-sm text-muted-foreground">
          {query.data?.length
            ? "Nenhum evento corresponde aos filtros selecionados."
            : "Nenhum evento de auditoria registrado."}
        </div>
      ) : (
        <>
          <p className="mb-3 text-xs text-muted-foreground">
            Exibindo {filtered.length} de {query.data?.length ?? 0} eventos.
          </p>
          <ol className="relative space-y-3 border-l border-border pl-6">
            {filtered.map((log) => {
              const changes = getChanges(log);
              return (
                <li key={log.id} className="relative">
                  <span className="absolute -left-[27px] top-2 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
                  <div className="rounded-md border border-border bg-background px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={actionBadge(log.action)}>
                        {ACTION_LABELS[log.action] ?? log.action}
                      </Badge>
                      <span className="text-sm font-medium text-foreground">
                        {ENTITY_LABELS[log.entity] ?? log.entity}
                        {log.entity_id && (
                          <> · <span className="font-mono text-xs text-muted-foreground">{log.entity_id}</span></>
                        )}
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      por <span className="font-medium text-foreground">{log.author}</span>
                    </p>
                    {changes.length > 0 && (
                      <details className="mt-3 rounded-md bg-muted/40 px-3 py-2 text-sm">
                        <summary className="cursor-pointer font-medium text-foreground">
                          Ver detalhes ({changes.length} {changes.length === 1 ? "campo" : "campos"})
                        </summary>
                        <div className="mt-2 space-y-2">
                          {changes.map((change) => (
                            <div key={change.field} className="grid gap-1 border-t border-border/60 pt-2 md:grid-cols-[12rem_1fr]">
                              <span className="font-medium text-foreground">{change.field}</span>
                              <span className="break-words text-muted-foreground">
                                {log.action !== "create" && (
                                  <><span className="line-through">{formatValue(change.before)}</span>{" → "}</>
                                )}
                                {log.action !== "delete" && formatValue(change.after)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </>
  );
}
