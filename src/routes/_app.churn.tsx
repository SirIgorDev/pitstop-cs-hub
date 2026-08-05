import { createFileRoute } from "@tanstack/react-router";
import { FileSpreadsheet, ShieldCheck, TrendingDown } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ForbiddenState } from "@/components/state-views";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/mock-role";

export const Route = createFileRoute("/_app/churn")({
  component: ChurnPage,
  head: () => ({
    meta: [{ title: "Monitor de Churn — Controller CS" }, { name: "robots", content: "noindex" }],
  }),
});

function ChurnPage() {
  const { role, rbacEnabled, hasPermission, permissionScope } = useAuth();
  const canAccess = rbacEnabled
    ? hasPermission("churn.view")
    : role === "analista_processos" || role === "coordenador" || role === "administrador";

  if (!canAccess) {
    return (
      <>
        <PageHeader title="Monitor de Churn" />
        <ForbiddenState
          title="Área restrita"
          description="Seu cargo não possui permissão para visualizar o Monitor de Churn."
        />
      </>
    );
  }

  const scope = rbacEnabled
    ? permissionScope("churn.view")
    : role === "analista_processos"
      ? "own"
      : "all";

  return (
    <>
      <PageHeader
        title="Monitor de Churn"
        description="Consolide o resumo e os detalhamentos de churn por competência."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <FileSpreadsheet className="h-5 w-5 text-primary" aria-hidden="true" />
            <CardTitle className="text-base">Importação em lote</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Um arquivo de resumo e um detalhamento para cada macromotivo.
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <TrendingDown className="h-5 w-5 text-primary" aria-hidden="true" />
            <CardTitle className="text-base">Consolidação por cliente</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Uma visão por cliente, preservando todos os serviços e registros de origem.
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
            <CardTitle className="text-base">Escopo de acesso</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {scope === "own"
              ? "Você visualizará somente as importações realizadas por você."
              : "Você poderá visualizar as importações de todos os responsáveis."}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 border-dashed">
        <CardContent className="py-10 text-center">
          <h2 className="font-semibold text-foreground">Estrutura de acesso preparada</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            A importação dos arquivos pai e filhos será disponibilizada no próximo bloco.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
