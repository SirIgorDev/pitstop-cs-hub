import { createFileRoute } from "@tanstack/react-router";
import { List, Plus, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ForbiddenState } from "@/components/state-views";
import { useMockRole } from "@/lib/mock-role";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_app/administracao")({
  component: AdministracaoPage,
  head: () => ({ meta: [{ title: "Administração — PitStop CS" }, { name: "robots", content: "noindex" }] }),
});

const USUARIOS: {
  nome: string;
  email: string;
  perfil: string;
  ativo: boolean;
}[] = [];

const LISTAS = [
  { nome: "Segmentos", itens: 0 },
  { nome: "Tipos de gargalo", itens: 0 },
  { nome: "Status de gargalo", itens: 0 },
  { nome: "Motivos de atendimento", itens: 0 },
  { nome: "Canais de atendimento", itens: 0 },
];

function AdministracaoPage() {
  const { role } = useMockRole();

  if (role !== "administrador") {
    return (
      <>
        <PageHeader title="Administração" />
        <ForbiddenState
          title="Área restrita a administradores"
          description="Somente usuários com perfil Administrador podem gerenciar usuários, listas e configurações do sistema."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Administração"
        description="Gerencie usuários, listas parametrizáveis e configurações do sistema."
      />

      <Tabs defaultValue="usuarios">
        <TabsList>
          <TabsTrigger value="usuarios">
            <Users className="mr-2 h-4 w-4" /> Usuários
          </TabsTrigger>
          <TabsTrigger value="listas">
            <List className="mr-2 h-4 w-4" /> Listas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="mt-4">
          <div className="mb-4 flex items-center justify-end">
            <Button className="bg-primary text-primary-foreground hover:bg-primary-dark">
              <Plus className="mr-2 h-4 w-4" /> Convidar usuário
            </Button>
          </div>
          <div className="overflow-hidden rounded-md border border-border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {USUARIOS.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-28 text-center text-muted-foreground">
                      Nenhum usuário cadastrado.
                    </TableCell>
                  </TableRow>
                ) : USUARIOS.map((u) => (
                  <TableRow key={u.email}>
                    <TableCell className="font-medium text-foreground">{u.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell className="text-muted-foreground">{u.perfil}</TableCell>
                    <TableCell>
                      {u.ativo ? (
                        <Badge variant="outline" className="border-success/30 bg-success/5 text-success">
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-border bg-muted text-muted-foreground">
                          Inativo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm">
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="listas" className="mt-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {LISTAS.map((l) => (
              <button
                key={l.nome}
                className="flex items-center justify-between rounded-md border border-border bg-background px-4 py-4 text-left transition-colors hover:border-primary/40 hover:bg-muted"
              >
                <div>
                  <div className="text-sm font-medium text-foreground">{l.nome}</div>
                  <div className="text-xs text-muted-foreground">{l.itens} itens cadastrados</div>
                </div>
                <span className="text-xs text-primary">Gerenciar →</span>
              </button>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
