import { createFileRoute } from "@tanstack/react-router";
import { Filter, Plus, Search } from "lucide-react";
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

export const Route = createFileRoute("/_app/gargalos")({
  component: GargalosPage,
  head: () => ({ meta: [{ title: "Gargalos — PitStop CS" }] }),
});

const GARGALOS = [
  {
    id: "GRG-2411",
    cliente: "Construtora Vale Verde",
    segmento: "Construção Civil",
    tipo: "Integração contábil",
    status: "Aberto",
    prioridade: "Alta",
    analista: "Marina Alves",
    aberto: "18/07/2026",
  },
  {
    id: "GRG-2410",
    cliente: "Transportes Sul Norte",
    segmento: "Transporte",
    tipo: "Emissão de nota fiscal",
    status: "Em andamento",
    prioridade: "Média",
    analista: "Marina Alves",
    aberto: "17/07/2026",
  },
  {
    id: "GRG-2408",
    cliente: "Rede Farma Bem",
    segmento: "Varejo Farma",
    tipo: "Folha de pagamento",
    status: "Em andamento",
    prioridade: "Alta",
    analista: "Camila Rocha",
    aberto: "16/07/2026",
  },
  {
    id: "GRG-2402",
    cliente: "Móveis Aurora",
    segmento: "Indústria",
    tipo: "Relatório gerencial",
    status: "Resolvido",
    prioridade: "Baixa",
    analista: "Bruno Teixeira",
    aberto: "12/07/2026",
  },
  {
    id: "GRG-2399",
    cliente: "Escritório Prado & Associados",
    segmento: "Escritórios Contábeis",
    tipo: "Importação de arquivos",
    status: "Aberto",
    prioridade: "Média",
    analista: "Marina Alves",
    aberto: "11/07/2026",
  },
];

function statusBadge(s: string) {
  if (s === "Aberto") return "border-primary/30 bg-primary/5 text-primary";
  if (s === "Em andamento") return "border-border bg-muted text-foreground";
  return "border-success/30 bg-success/5 text-success";
}
function prioridadeBadge(p: string) {
  if (p === "Alta") return "border-destructive/30 bg-destructive/5 text-destructive";
  if (p === "Média") return "border-warning/30 bg-warning/5 text-warning";
  return "border-border bg-muted text-muted-foreground";
}

function GargalosPage() {
  return (
    <>
      <PageHeader
        title="Gargalos"
        description="Registros de gargalos identificados junto aos clientes."
        actions={
          <Button className="bg-primary text-primary-foreground hover:bg-primary-dark">
            <Plus className="mr-2 h-4 w-4" /> Novo gargalo
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-64 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por cliente, ID ou tipo…" className="pl-9" />
        </div>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" /> Filtros
        </Button>
        <Button variant="outline">Exportar CSV</Button>
      </div>

      <div className="overflow-hidden rounded-md border border-border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[110px]">ID</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Segmento</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Analista</TableHead>
              <TableHead className="text-right">Abertura</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {GARGALOS.map((g) => (
              <TableRow key={g.id} className="cursor-pointer">
                <TableCell className="font-mono text-xs text-muted-foreground">{g.id}</TableCell>
                <TableCell className="font-medium text-foreground">{g.cliente}</TableCell>
                <TableCell className="text-muted-foreground">{g.segmento}</TableCell>
                <TableCell className="text-muted-foreground">{g.tipo}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusBadge(g.status)}>
                    {g.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={prioridadeBadge(g.prioridade)}>
                    {g.prioridade}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{g.analista}</TableCell>
                <TableCell className="text-right text-muted-foreground">{g.aberto}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Exibindo 5 de 14 gargalos. Filtros e paginação serão conectados na próxima etapa.
      </p>
    </>
  );
}
