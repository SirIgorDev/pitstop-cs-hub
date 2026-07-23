import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { History, List, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ErrorState, ForbiddenState, LoadingState } from "@/components/state-views";
import { useAuth, type DbRole } from "@/lib/mock-role";
import { supabase } from "@/integrations/supabase/client";
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
  head: () => ({
    meta: [{ title: "Administração — Controller CS" }, { name: "robots", content: "noindex" }],
  }),
});

type OptionTable =
  | "categoria_gargalo_options"
  | "pitstop_options"
  | "canal_atendimento_options"
  | "esteira_neo_options"
  | "status_neo_options"
  | "escalonou_para_options";

const ROLE_LABEL: Record<DbRole, string> = {
  analyst: "Analista de CS",
  coordinator: "Coordenador",
  admin: "Administrador",
};

const LISTS: Array<{ table: OptionTable; title: string }> = [
  { table: "categoria_gargalo_options", title: "Categorias de gargalo" },
  { table: "pitstop_options", title: "PitStops" },
  { table: "canal_atendimento_options", title: "Canais de atendimento" },
  { table: "esteira_neo_options", title: "Esteiras Neo" },
  { table: "status_neo_options", title: "Status Neo" },
  { table: "escalonou_para_options", title: "Escalonou Para" },
];

function AdministracaoPage() {
  const { role } = useAuth();

  if (role !== "administrador") {
    return (
      <>
        <PageHeader title="Administração" />
        <ForbiddenState
          title="Área restrita a administradores"
          description="Somente administradores podem gerenciar usuários, listas e configurações."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Administração"
        description="Gerencie usuários, listas parametrizáveis e ferramentas internas."
      />

      <Tabs defaultValue="usuarios">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="usuarios">
            <Users className="mr-2 h-4 w-4" /> Usuários
          </TabsTrigger>
          <TabsTrigger value="listas">
            <List className="mr-2 h-4 w-4" /> Listas
          </TabsTrigger>
          <TabsTrigger value="historico">
            <History className="mr-2 h-4 w-4" /> Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="mt-4">
          <UsersPanel />
        </TabsContent>
        <TabsContent value="listas" className="mt-4 space-y-5">
          {LISTS.map((list) => (
            <ListManager key={list.table} {...list} />
          ))}
        </TabsContent>
        <TabsContent value="historico" className="mt-4">
          <AdminHistory />
        </TabsContent>
      </Tabs>
    </>
  );
}

function UsersPanel() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome, email, role, ativo")
        .is("deleted_at", null)
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const mutation = useMutation({
    mutationFn: async ({ id, role, ativo }: { id: string; role: DbRole; ativo: boolean }) => {
      const { error } = await supabase.rpc("admin_update_user", {
        target_user_id: id,
        next_role: role,
        next_active: ativo,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Usuário atualizado");
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-history"] });
    },
    onError: (error: Error) =>
      toast.error("Não foi possível atualizar o usuário", {
        description: error.message,
      }),
  });

  if (query.isLoading) return <LoadingState title="Carregando usuários…" />;
  if (query.isError)
    return <ErrorState title="Erro ao carregar usuários" description={query.error.message} />;

  return (
    <div className="overflow-hidden rounded-md border border-border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Perfil</TableHead>
            <TableHead>Situação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(query.data ?? []).map((profile) => (
            <TableRow key={profile.id}>
              <TableCell className="font-medium">{profile.nome}</TableCell>
              <TableCell className="text-muted-foreground">{profile.email}</TableCell>
              <TableCell>
                <Select
                  value={profile.role}
                  disabled={mutation.isPending}
                  onValueChange={(nextRole) =>
                    mutation.mutate({
                      id: profile.id,
                      role: nextRole as DbRole,
                      ativo: profile.ativo,
                    })
                  }
                >
                  <SelectTrigger className="w-44" aria-label={`Perfil de ${profile.nome}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ROLE_LABEL) as DbRole[]).map((value) => (
                      <SelectItem key={value} value={value}>
                        {ROLE_LABEL[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={profile.ativo}
                    disabled={mutation.isPending || profile.id === user.id}
                    aria-label={`${profile.ativo ? "Inativar" : "Ativar"} ${profile.nome}`}
                    onCheckedChange={(ativo) =>
                      mutation.mutate({
                        id: profile.id,
                        role: profile.role,
                        ativo,
                      })
                    }
                  />
                  <Badge
                    variant="outline"
                    className={
                      profile.ativo
                        ? "border-success/30 bg-success/5 text-success"
                        : "border-border bg-muted text-muted-foreground"
                    }
                  >
                    {profile.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ListManager({ table, title }: { table: OptionTable; title: string }) {
  const queryClient = useQueryClient();
  const [nome, setNome] = useState("");
  const [pendingDelete, setPendingDelete] = useState<{ id: string; nome: string } | null>(null);
  const queryKey = ["admin-options", table];
  const refreshOptionQueries = async () => {
    // A tela administrativa e os formulários usam chaves de cache diferentes.
    // Atualize ambas para propagar imediatamente qualquer alteração da lista.
    await Promise.all([
      queryClient.invalidateQueries({ queryKey }),
      queryClient.invalidateQueries({ queryKey: [table] }),
      queryClient.invalidateQueries({ queryKey: ["admin-history"] }),
    ]);
  };
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table)
        .select("id, nome, ativo, ordem")
        .is("deleted_at", null)
        .order("ordem")
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const trimmed = nome.trim();
      if (!trimmed) throw new Error("Informe um nome");
      const maxOrder = Math.max(0, ...(query.data ?? []).map((item) => item.ordem));
      const { error } = await supabase
        .from(table)
        .insert({ nome: trimmed, ordem: maxOrder + 10 } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      setNome("");
      toast.success(`${title}: opção adicionada`);
      void refreshOptionQueries();
    },
    onError: (error: Error) =>
      toast.error("Não foi possível adicionar", { description: error.message }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from(table)
        .update({ ativo } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Situação atualizada");
      void refreshOptionQueries();
    },
    onError: (error: Error) =>
      toast.error("Não foi possível atualizar", { description: error.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase.rpc("admin_soft_delete_option", {
        target_table: table,
        target_id: id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setPendingDelete(null);
      toast.success("Opção excluída");
      void refreshOptionQueries();
    },
    onError: (error: Error) =>
      toast.error("Não foi possível excluir", { description: error.message }),
  });

  return (
    <section className="rounded-md border border-border bg-background">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">
            Opções usadas não são excluídas; inative-as para preservar o histórico.
          </p>
        </div>
        <form
          className="flex min-w-64 gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!addMutation.isPending) addMutation.mutate();
          }}
        >
          <Input
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            placeholder="Nova opção"
            maxLength={150}
          />
          <Button type="submit" disabled={addMutation.isPending || !nome.trim()}>
            <Plus className="mr-2 h-4 w-4" /> Adicionar
          </Button>
        </form>
      </header>
      {query.isLoading ? (
        <LoadingState title={`Carregando ${title.toLocaleLowerCase("pt-BR")}…`} />
      ) : query.isError ? (
        <ErrorState title={`Erro ao carregar ${title}`} description={query.error.message} />
      ) : (
        <ul className="divide-y divide-border">
          {(query.data ?? []).map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-4 px-5 py-3">
              <span className={item.ativo ? "text-sm" : "text-sm text-muted-foreground"}>
                {item.nome}
              </span>
              <div className="flex items-center gap-3">
                <Switch
                  checked={item.ativo}
                  disabled={toggleMutation.isPending}
                  aria-label={`${item.ativo ? "Inativar" : "Ativar"} ${item.nome}`}
                  onCheckedChange={(ativo) => toggleMutation.mutate({ id: item.id, ativo })}
                />
                <span className="w-12 text-xs text-muted-foreground">
                  {item.ativo ? "Ativo" : "Inativo"}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  aria-label={`Excluir ${item.nome}`}
                  disabled={deleteMutation.isPending}
                  onClick={() => setPendingDelete({ id: item.id, nome: item.nome })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir “{pendingDelete?.nome}”?</AlertDialogTitle>
            <AlertDialogDescription>
              A opção será excluída somente se nunca tiver sido utilizada. A operação é lógica,
              preserva a auditoria e não pode ser executada por outros perfis.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (pendingDelete) deleteMutation.mutate({ id: pendingDelete.id });
              }}
            >
              {deleteMutation.isPending ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function AdminHistory() {
  const query = useQuery({
    queryKey: ["admin-history"],
    queryFn: async () => {
      const entities = [
        "profiles",
        "categoria_gargalo_options",
        "pitstop_options",
        "canal_atendimento_options",
        "esteira_neo_options",
        "status_neo_options",
        "escalonou_para_options",
      ];
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, action, entity, entity_id, created_at, user_id")
        .in("entity", entities)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (query.isLoading) return <LoadingState title="Carregando histórico…" />;
  if (query.isError)
    return <ErrorState title="Erro ao carregar histórico" description={query.error.message} />;

  return (
    <div className="overflow-hidden rounded-md border border-border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Ação</TableHead>
            <TableHead>Entidade</TableHead>
            <TableHead>Registro</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(query.data ?? []).map((event) => (
            <TableRow key={event.id}>
              <TableCell>{new Date(event.created_at).toLocaleString("pt-BR")}</TableCell>
              <TableCell>{event.action}</TableCell>
              <TableCell>{event.entity}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {event.entity_id ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
