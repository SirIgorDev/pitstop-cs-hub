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

export const Route = createFileRoute("/_app/neo/registros")({
  component: NeoRegistrosPage,
  head: () => ({ meta: [{ title: "Registros Neo — PitStop CS" }] }),
});

const REGISTROS = [
  {
    id: "NEO-8821",
    data: "18/07/2026 09:14",
    cliente: "Rede Farma Bem",
    canal: "Chat Neo",
    motivo: "Folha de pagamento",
    duracao: "12 min",
    resultado: "Resolvido",
    analista: "Marina Alves",
  },
  {
    id: "NEO-8820",
    data: "18/07/2026 08:47",
    cliente: "Construtora Vale Verde",
    canal: "Telefone",
    motivo: "Configuração fiscal",
    duracao: "24 min",
    resultado: "Encaminhado",
    analista: "Marina Alves",
  },
  {
    id: "NEO-8817",
    data: "17/07/2026 17:02",
    cliente: "Escritório Prado & Associados",
    canal: "E-mail",
    motivo: "Treinamento módulo fiscal",
    duracao: "35 min",
    resultado: "Resolvido",
    analista: "Bruno Teixeira",
  },
  {
    id: "NEO-8812",
    data: "17/07/2026 14:20",
    cliente: "Transportes Sul Norte",
    canal: "Chat Neo",
    motivo: "Emissão de NFS-e",
    duracao: "18 min",
    resultado: "Aguardando cliente",
    analista: "Camila Rocha",
  },
  {
    id: "NEO-8808",
    data: "17/07/2026 10:55",
    cliente: "Móveis Aurora",
    canal: "Telefone",
    motivo: "Relatório gerencial",
    duracao: "9 min",
    resultado: "Resolvido",
    analista: "Marina Alves",
  },
];

function resultadoBadge(r: string) {
  if (r === "Resolvido") return "border-success/30 bg-success/5 text-success";
  if (r === "Encaminhado") return "border-primary/30 bg-primary/5 text-primary";
  return "border-warning/30 bg-warning/5 text-warning";
}

function NeoRegistrosPage() {
  return (
    <>
      <PageHeader
        title="Registros Neo"
        description="Atendimentos realizados pelo time nos canais Neo (chat, telefone e e-mail)."
        actions={
          <Button className="bg-primary text-primary-foreground hover:bg-primary-dark">
            <Plus className="mr-2 h-4 w-4" /> Novo registro
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-64 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por cliente, canal ou motivo…" className="pl-9" />
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
              <TableHead>Data</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Duração</TableHead>
              <TableHead>Resultado</TableHead>
              <TableHead>Analista</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {REGISTROS.map((r) => (
              <TableRow key={r.id} className="cursor-pointer">
                <TableCell className="font-mono text-xs text-muted-foreground">{r.id}</TableCell>
                <TableCell className="text-muted-foreground">{r.data}</TableCell>
                <TableCell className="font-medium text-foreground">{r.cliente}</TableCell>
                <TableCell className="text-muted-foreground">{r.canal}</TableCell>
                <TableCell className="text-muted-foreground">{r.motivo}</TableCell>
                <TableCell className="text-muted-foreground">{r.duracao}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={resultadoBadge(r.resultado)}>
                    {r.resultado}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{r.analista}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
