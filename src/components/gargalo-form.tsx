import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/mock-role";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  IMPACTOS,
  RISCOS_CHURN,
  SEGMENTOS_GARGALO,
  STATUS_GARGALO,
  URGENCIAS,
} from "@/lib/constants";

type Gargalo = {
  id?: string;
  data_registro: string;
  cliente: string;
  segmento: string;
  responsavel_id: string;
  categoria: string;
  pitstop: string | null;
  descricao: string;
  impacto_cliente: string;
  urgencia: string;
  status: string;
  risco_churn: string;
  acao_plano: string | null;
  data_prevista_resolucao: string | null;
  data_resolucao: string | null;
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Partial<Gargalo> & { id?: string };
}

const empty = (uid: string): Gargalo => ({
  data_registro: new Date().toISOString().slice(0, 10),
  cliente: "",
  segmento: "Corporativo",
  responsavel_id: uid,
  categoria: "Documentação / Processos",
  pitstop: null,
  descricao: "",
  impacto_cliente: "Médio",
  urgencia: "Média",
  status: "Aberto",
  risco_churn: "Baixo",
  acao_plano: "",
  data_prevista_resolucao: null,
  data_resolucao: null,
});

export function GargaloForm({ open, onOpenChange, initial }: Props) {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState<Gargalo>(empty(user.id));
  const isEdit = !!initial?.id;

  const canPickResponsavel = role !== "analista";

  useEffect(() => {
    if (open) {
      setForm({ ...empty(user.id), ...(initial as Gargalo | undefined) });
    }
  }, [open, initial, user.id]);

  const pitstopQ = useQuery({
    queryKey: ["pitstop_options"],
    enabled: open,
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pitstop_options")
        .select("id, nome, ativo, ordem")
        .eq("ativo", true)
        .is("deleted_at", null)
        .order("ordem");
      if (error) throw error;
      return data;
    },
  });

  const categoriesQ = useQuery({
    queryKey: ["categoria_gargalo_options"],
    enabled: open,
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categoria_gargalo_options")
        .select("id, nome, ativo, ordem")
        .eq("ativo", true)
        .is("deleted_at", null)
        .order("ordem");
      if (error) throw error;
      return data;
    },
  });

  const analystsQ = useQuery({
    queryKey: ["profiles_ativos"],
    enabled: canPickResponsavel,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome, email, ativo")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (payload: Gargalo) => {
      // Monte explicitamente apenas as colunas editáveis. O objeto recebido ao
      // editar também pode conter campos retornados pela consulta, como
      // tempo_resolucao_dias, que é gerado pelo banco e não aceita UPDATE.
      const next: Gargalo = {
        data_registro: payload.data_registro,
        cliente: payload.cliente,
        segmento: payload.segmento,
        responsavel_id: payload.responsavel_id,
        categoria: payload.categoria,
        pitstop: payload.pitstop,
        descricao: payload.descricao,
        impacto_cliente: payload.impacto_cliente,
        urgencia: payload.urgencia,
        status: payload.status,
        risco_churn: payload.risco_churn,
        acao_plano: payload.acao_plano,
        data_prevista_resolucao: payload.data_prevista_resolucao,
        data_resolucao: payload.data_resolucao,
      };

      // Se status Resolvido e data_resolucao vazia, preencher com hoje
      if (next.status === "Resolvido" && !next.data_resolucao) {
        next.data_resolucao = new Date().toISOString().slice(0, 10);
      }
      if (next.status !== "Resolvido") {
        next.data_resolucao = null;
      }
      // Analista não pode trocar responsável
      if (!canPickResponsavel) next.responsavel_id = user.id;

      if (isEdit && initial?.id) {
        const { error } = await supabase
          .from("gargalos")
          .update(next as never)
          .eq("id", initial.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("gargalos").insert(next as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Gargalo atualizado" : "Gargalo criado");
      qc.invalidateQueries({ queryKey: ["gargalos"] });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error("Erro ao salvar", { description: err.message });
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mutation.isPending) return; // evita duplicidade
    if (!form.cliente.trim()) return toast.error("Cliente é obrigatório");
    if (!form.descricao.trim()) return toast.error("Descrição é obrigatória");
    mutation.mutate(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar gargalo" : "Novo gargalo"}</DialogTitle>
          <DialogDescription>
            Preencha as informações do gargalo identificado com o cliente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
          <Field label="Data de registro" required>
            <Input
              type="date"
              value={form.data_registro}
              onChange={(e) => setForm({ ...form, data_registro: e.target.value })}
              required
            />
          </Field>

          <Field label="Cliente" required>
            <Input
              value={form.cliente}
              onChange={(e) => setForm({ ...form, cliente: e.target.value })}
              placeholder="Nome do cliente"
              required
              maxLength={200}
            />
          </Field>

          <Field label="Segmento" required>
            <SimpleSelect
              value={form.segmento}
              onChange={(v) => setForm({ ...form, segmento: v })}
              options={[...SEGMENTOS_GARGALO]}
            />
          </Field>

          <Field label="Responsável" required>
            {canPickResponsavel ? (
              <Select
                value={form.responsavel_id}
                onValueChange={(v) => setForm({ ...form, responsavel_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {(analystsQ.data ?? []).map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input value={user.nome} disabled />
            )}
          </Field>

          <Field label="Categoria" required>
            <SimpleSelect
              value={form.categoria}
              onChange={(v) => setForm({ ...form, categoria: v })}
              options={[
                ...(categoriesQ.data ?? []).map((item) => item.nome),
                ...(
                  form.categoria &&
                  !(categoriesQ.data ?? []).some((item) => item.nome === form.categoria)
                    ? [form.categoria]
                    : []
                ),
              ]}
            />
          </Field>

          <Field label="PitStop">
            <Select
              value={form.pitstop ?? "__none"}
              onValueChange={(v) => setForm({ ...form, pitstop: v === "__none" ? null : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">— sem pitstop —</SelectItem>
                {[
                  ...(pitstopQ.data ?? []),
                  ...(
                    form.pitstop &&
                    !(pitstopQ.data ?? []).some((item) => item.nome === form.pitstop)
                      ? [{ id: `current-${form.pitstop}`, nome: form.pitstop }]
                      : []
                  ),
                ].map((p) => (
                  <SelectItem key={p.id} value={p.nome}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Impacto no cliente" required>
            <SimpleSelect
              value={form.impacto_cliente}
              onChange={(v) => setForm({ ...form, impacto_cliente: v })}
              options={[...IMPACTOS]}
            />
          </Field>

          <Field label="Urgência" required>
            <SimpleSelect
              value={form.urgencia}
              onChange={(v) => setForm({ ...form, urgencia: v })}
              options={[...URGENCIAS]}
            />
          </Field>

          <Field label="Status" required>
            <SimpleSelect
              value={form.status}
              onChange={(v) => setForm({ ...form, status: v })}
              options={[...STATUS_GARGALO]}
            />
          </Field>

          <Field label="Risco de churn" required>
            <SimpleSelect
              value={form.risco_churn}
              onChange={(v) => setForm({ ...form, risco_churn: v })}
              options={[...RISCOS_CHURN]}
            />
          </Field>

          <Field label="Data prevista de resolução">
            <Input
              type="date"
              value={form.data_prevista_resolucao ?? ""}
              onChange={(e) =>
                setForm({ ...form, data_prevista_resolucao: e.target.value || null })
              }
            />
          </Field>

          <Field label="Data de resolução">
            <Input
              type="date"
              value={form.data_resolucao ?? ""}
              onChange={(e) => setForm({ ...form, data_resolucao: e.target.value || null })}
            />
          </Field>

          <Field label="Descrição" required className="md:col-span-2">
            <Textarea
              rows={3}
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              required
              maxLength={2000}
              placeholder="Descreva o gargalo identificado"
            />
          </Field>

          <Field label="Ação / Plano" className="md:col-span-2">
            <Textarea
              rows={3}
              value={form.acao_plano ?? ""}
              onChange={(e) => setForm({ ...form, acao_plano: e.target.value })}
              maxLength={2000}
              placeholder="Plano de ação para resolver"
            />
          </Field>

          <DialogFooter className="md:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary-dark"
            >
              {mutation.isPending ? "Salvando…" : isEdit ? "Salvar alterações" : "Criar gargalo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
  required,
  className,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-xs font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

function SimpleSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
