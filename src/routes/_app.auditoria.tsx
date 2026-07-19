import { createFileRoute } from "@tanstack/react-router";
import { Filter, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ForbiddenState } from "@/components/state-views";
import { useMockRole } from "@/lib/mock-role";

export const Route = createFileRoute("/_app/auditoria")({
  component: AuditoriaPage,
  head: () => ({ meta: [{ title: "Auditoria — Controller CS" }, { name: "robots", content: "noindex" }] }),
});

const EVENTOS: {
  quando: string;
  autor: string;
  acao: string;
  entidade: string;
  id: string;
  detalhe: string;
}[] = [];

function acaoBadge(a: string) {
  if (a === "Criação") return "border-success/30 bg-success/5 text-success";
  if (a === "Exclusão") return "border-destructive/30 bg-destructive/5 text-destructive";
  return "border-border bg-muted text-foreground";
}

function AuditoriaPage() {
  const { role } = useMockRole();
  if (role === "analista") {
    return (
      <>
        <PageHeader title="Auditoria" />
        <ForbiddenState
          description="A trilha de auditoria está disponível apenas para coordenadores e administradores."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Auditoria"
        description="Trilha completa de eventos do sistema — criação, edição e exclusão de registros."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-64 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por autor, entidade ou ID…" className="pl-9" />
        </div>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" /> Filtros
        </Button>
      </div>

      {EVENTOS.length === 0 ? (
        <div className="rounded-md border border-border bg-background px-5 py-12 text-center text-sm text-muted-foreground">
          Nenhum evento de auditoria registrado.
        </div>
      ) : (
        <ol className="relative space-y-3 border-l border-border pl-6">
          {EVENTOS.map((e, i) => (
          <li key={i} className="relative">
            <span className="absolute -left-[27px] top-2 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
            <div className="rounded-md border border-border bg-background px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={acaoBadge(e.acao)}>
                  {e.acao}
                </Badge>
                <span className="text-sm font-medium text-foreground">
                  {e.entidade} · <span className="font-mono text-xs text-muted-foreground">{e.id}</span>
                </span>
                <span className="ml-auto text-xs text-muted-foreground">{e.quando}</span>
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground">{e.detalhe}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                por <span className="text-foreground">{e.autor}</span>
              </p>
            </div>
          </li>
          ))}
        </ol>
      )}
    </>
  );
}
