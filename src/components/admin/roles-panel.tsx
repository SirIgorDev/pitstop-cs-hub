import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LockKeyhole, Plus, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ErrorState, LoadingState } from "@/components/state-views";
import { supabase } from "@/integrations/supabase/client";
import type { DbRole, PermissionScope } from "@/lib/mock-role";

type Cargo = {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  perfil_base: DbRole;
  ativo: boolean;
  protegido: boolean;
};

type Permission = {
  id: string;
  codigo: string;
  modulo: string;
  rotina: string;
  acao: string;
  permite_escopo: boolean;
  ordem: number;
};

type Selection = Record<string, PermissionScope>;

const BASE_ROLE_LABEL: Record<DbRole, string> = {
  analyst: "Analista de CS",
  coordinator: "Coordenador",
  process_analyst: "Analista de Processos",
  admin: "Administrador",
};

const EMPTY_FORM = {
  id: null as string | null,
  nome: "",
  descricao: "",
  perfilBase: "analyst" as DbRole,
  ativo: true,
  protegido: false,
  selection: {} as Selection,
};

export function RolesPanel() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);
  const query = useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () => {
      const [cargosResult, permissionsResult, linksResult, settingsResult] = await Promise.all([
        supabase
          .from("cargos")
          .select("id, codigo, nome, descricao, perfil_base, ativo, protegido")
          .order("nome"),
        supabase
          .from("permissoes")
          .select("id, codigo, modulo, rotina, acao, permite_escopo, ordem")
          .order("ordem"),
        supabase.from("cargo_permissoes").select("cargo_id, permissao_id, escopo"),
        supabase.from("access_control_settings").select("rbac_enabled").eq("id", true).single(),
      ]);
      const error =
        cargosResult.error ?? permissionsResult.error ?? linksResult.error ?? settingsResult.error;
      if (error) throw error;
      return {
        cargos: (cargosResult.data ?? []) as Cargo[],
        permissions: (permissionsResult.data ?? []) as Permission[],
        links: linksResult.data ?? [],
        enabled: settingsResult.data?.rbac_enabled === true,
      };
    },
  });

  const groupedPermissions = useMemo(() => {
    const groups = new Map<string, Permission[]>();
    for (const permission of query.data?.permissions ?? []) {
      const key = `${permission.modulo} / ${permission.rotina}`;
      groups.set(key, [...(groups.get(key) ?? []), permission]);
    }
    return [...groups.entries()];
  }, [query.data?.permissions]);

  const selectCargo = (cargo: Cargo) => {
    const byId = new Map(
      (query.data?.permissions ?? []).map((permission) => [permission.id, permission.codigo]),
    );
    const selection = Object.fromEntries(
      (query.data?.links ?? [])
        .filter((link) => link.cargo_id === cargo.id)
        .map((link) => [byId.get(link.permissao_id), link.escopo])
        .filter(([code]) => Boolean(code)),
    ) as Selection;
    setForm({
      id: cargo.id,
      nome: cargo.nome,
      descricao: cargo.descricao ?? "",
      perfilBase: cargo.perfil_base,
      ativo: cargo.ativo,
      protegido: cargo.protegido,
      selection,
    });
  };

  useEffect(() => {
    if (!form.id && query.data?.cargos[0]) selectCargo(query.data.cargos[0]);
  }, [query.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const entries = Object.entries(form.selection).map(([codigo, escopo]) => ({
        codigo,
        escopo,
      }));
      const { error } = await supabase.rpc("admin_save_cargo", {
        target_cargo_id: form.id as unknown as string,
        cargo_name: form.nome,
        cargo_description: form.descricao,
        base_role: form.perfilBase,
        cargo_active: form.ativo,
        permission_entries: entries,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success(form.id ? "Cargo atualizado" : "Cargo criado");
      setForm(EMPTY_FORM);
      await queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-history"] });
    },
    onError: (error: Error) =>
      toast.error("Não foi possível salvar o cargo", { description: error.message }),
  });

  const modeMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase.rpc("admin_set_rbac_enabled", { next_enabled: enabled });
      if (error) throw error;
    },
    onSuccess: async (_data, enabled) => {
      toast.success(
        enabled ? "Novo controle de acesso ativado" : "Rollback ativado: usando perfis anteriores",
      );
      await queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
    },
    onError: (error: Error) =>
      toast.error("Não foi possível alterar o modo", { description: error.message }),
  });

  if (query.isLoading) return <LoadingState title="Carregando cargos e permissões…" />;
  if (query.isError)
    return (
      <ErrorState
        title="Migration de cargos ainda não disponível"
        description={query.error.message}
      />
    );
  if (!query.data) return null;
  const data = query.data;

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-border bg-background p-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">Modo de homologação</h2>
            <Badge variant={data.enabled ? "default" : "secondary"}>
              {data.enabled ? "Nova matriz ativa" : "Rollback ativo"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Ao desligar, o sistema volta imediatamente a usar os perfis e permissões anteriores.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <RotateCcw className="h-4 w-4 text-muted-foreground" />
          <Switch
            checked={data.enabled}
            disabled={modeMutation.isPending}
            onCheckedChange={(value) => modeMutation.mutate(value)}
          />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-md border border-border bg-background p-3">
          <Button className="mb-3 w-full" variant="outline" onClick={() => setForm(EMPTY_FORM)}>
            <Plus className="mr-2 h-4 w-4" /> Novo cargo
          </Button>
          <div className="space-y-1">
            {data.cargos.map((cargo) => (
              <button
                key={cargo.id}
                type="button"
                onClick={() => selectCargo(cargo)}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${form.id === cargo.id ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
              >
                <span>{cargo.nome}</span>
                {cargo.protegido ? (
                  <LockKeyhole className="h-4 w-4" />
                ) : !cargo.ativo ? (
                  <Badge variant="secondary">Inativo</Badge>
                ) : null}
              </button>
            ))}
          </div>
        </aside>

        <section className="rounded-md border border-border bg-background p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cargo-name">Nome do cargo</Label>
              <Input
                id="cargo-name"
                value={form.nome}
                disabled={form.protegido}
                onChange={(e) => setForm((current) => ({ ...current, nome: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Perfil de compatibilidade (rollback)</Label>
              <Select
                value={form.perfilBase}
                disabled={form.protegido}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, perfilBase: value as DbRole }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(BASE_ROLE_LABEL) as DbRole[])
                    .filter((role) => form.protegido || role !== "admin")
                    .map((role) => (
                      <SelectItem key={role} value={role}>
                        {BASE_ROLE_LABEL[role]}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="cargo-description">Descrição</Label>
              <Textarea
                id="cargo-description"
                value={form.descricao}
                disabled={form.protegido}
                onChange={(e) => setForm((current) => ({ ...current, descricao: e.target.value }))}
              />
            </div>
          </div>
          <div className="my-5 flex items-center gap-3 border-y border-border py-3">
            <Switch
              checked={form.ativo}
              disabled={form.protegido}
              onCheckedChange={(ativo) => setForm((current) => ({ ...current, ativo }))}
            />
            <span className="text-sm">Cargo ativo</span>
            {form.protegido && (
              <span className="text-xs text-muted-foreground">
                O Administrador é protegido e mantém todas as permissões.
              </span>
            )}
          </div>

          <div className="space-y-5">
            {groupedPermissions.map(([group, permissions]) => (
              <div key={group}>
                <h3 className="mb-2 text-sm font-semibold">{group}</h3>
                <div className="divide-y divide-border rounded-md border border-border">
                  {permissions.map((permission) => {
                    const checked = Boolean(form.selection[permission.codigo]);
                    return (
                      <div
                        key={permission.id}
                        className="flex flex-wrap items-center justify-between gap-3 px-3 py-2"
                      >
                        <label className="flex items-center gap-3 text-sm">
                          <Checkbox
                            checked={checked}
                            disabled={form.protegido}
                            onCheckedChange={(value) =>
                              setForm((current) => {
                                const selection = { ...current.selection };
                                if (value) selection[permission.codigo] = "all";
                                else delete selection[permission.codigo];
                                return { ...current, selection };
                              })
                            }
                          />
                          {permission.acao}
                        </label>
                        {checked && permission.permite_escopo && (
                          <Select
                            value={form.selection[permission.codigo]}
                            disabled={form.protegido}
                            onValueChange={(scope) =>
                              setForm((current) => ({
                                ...current,
                                selection: {
                                  ...current.selection,
                                  [permission.codigo]: scope as PermissionScope,
                                },
                              }))
                            }
                          >
                            <SelectTrigger className="w-44">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="own">Somente próprios</SelectItem>
                              <SelectItem value="all">Todos os registros</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex justify-end">
            <Button
              disabled={form.protegido || saveMutation.isPending || !form.nome.trim()}
              onClick={() => saveMutation.mutate()}
            >
              <Save className="mr-2 h-4 w-4" />
              {saveMutation.isPending ? "Salvando…" : "Salvar cargo"}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
