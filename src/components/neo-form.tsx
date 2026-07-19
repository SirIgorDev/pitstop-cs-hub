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
import { ESTEIRAS_NEO, TIPOS_NEO, maskPhone } from "@/lib/constants";

type Registro = {
  id?: string;
  protocolo_neo: string;
  data_contato: string;
  nome_cliente: string;
  telefone: string | null;
  tipo: string;
  esteira: string;
  status: string;
  escalonou_para: string | null;
  observacao: string | null;
  responsavel_id: string;
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Partial<Registro> & { id?: string };
}

const emptyReg = (uid: string): Registro => ({
  protocolo_neo: "",
  data_contato: new Date().toISOString().slice(0, 16),
  nome_cliente: "",
  telefone: "",
  tipo: "Reativo",
  esteira: "1° Contato",
  status: "Aberto",
  escalonou_para: null,
  observacao: "",
  responsavel_id: uid,
});

export function NeoForm({ open, onOpenChange, initial }: Props) {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState<Registro>(emptyReg(user.id));
  const isEdit = !!initial?.id;
  const canPickResponsavel = role !== "analista";

  useEffect(() => {
    if (open) {
      const seed = initial
        ? ({ ...emptyReg(user.id), ...initial } as Registro)
        : emptyReg(user.id);
      // datetime-local aceita YYYY-MM-DDTHH:mm
      if (seed.data_contato && seed.data_contato.length > 16) {
        seed.data_contato = seed.data_contato.slice(0, 16);
      }
      setForm(seed);
    }
  }, [open, initial, user.id]);

  const statusQ = useQuery({
    queryKey: ["status_neo_options"],
    enabled: open,
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("status_neo_options")
        .select("id, nome, ativo, ordem")
        .eq("ativo", true)
        .is("deleted_at", null)
        .order("ordem");
      if (error) throw error;
      return data;
    },
  });

  const escalonouQ = useQuery({
    queryKey: ["escalonou_para_options"],
    enabled: open,
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("escalonou_para_options")
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
        .select("id, nome, ativo")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (payload: Registro) => {
      const next = { ...payload };
      if (!canPickResponsavel) next.responsavel_id = user.id;
      // Converter datetime-local → ISO
      const dataIso = new Date(next.data_contato).toISOString();
      const record = { ...next, data_contato: dataIso };

      if (isEdit && initial?.id) {
        const { error } = await supabase
          .from("registros_neo")
          .update(record as never)
          .eq("id", initial.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("registros_neo").insert(record as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Registro atualizado" : "Registro criado");
      qc.invalidateQueries({ queryKey: ["registros_neo"] });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      if (err.message.includes("duplicate") || err.message.includes("ux_registros_neo_protocolo")) {
        toast.error("Protocolo já cadastrado", {
          description: "Já existe um registro Neo com este protocolo.",
        });
      } else {
        toast.error("Erro ao salvar", { description: err.message });
      }
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mutation.isPending) return;
    if (!form.protocolo_neo.trim()) return toast.error("Protocolo é obrigatório");
    if (!form.nome_cliente.trim()) return toast.error("Nome do cliente é obrigatório");
    mutation.mutate(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar registro Neo" : "Novo registro Neo"}</DialogTitle>
          <DialogDescription>Registre um atendimento realizado pelo Neo.</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
          <Field label="Protocolo Neo" required>
            <Input
              value={form.protocolo_neo}
              onChange={(e) => setForm({ ...form, protocolo_neo: e.target.value })}
              placeholder="Ex.: NEO-8821"
              required
              maxLength={60}
            />
          </Field>

          <Field label="Data do contato" required>
            <Input
              type="datetime-local"
              value={form.data_contato}
              onChange={(e) => setForm({ ...form, data_contato: e.target.value })}
              required
            />
          </Field>

          <Field label="Nome do cliente" required>
            <Input
              value={form.nome_cliente}
              onChange={(e) => setForm({ ...form, nome_cliente: e.target.value })}
              placeholder="Cliente"
              required
              maxLength={200}
            />
          </Field>

          <Field label="Telefone">
            <Input
              value={form.telefone ?? ""}
              onChange={(e) => setForm({ ...form, telefone: maskPhone(e.target.value) })}
              placeholder="(00) 00000-0000"
              maxLength={16}
            />
          </Field>

          <Field label="Tipo" required>
            <Select
              value={form.tipo}
              onValueChange={(v) => setForm({ ...form, tipo: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_NEO.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Esteira" required>
            <Select
              value={form.esteira}
              onValueChange={(v) => setForm({ ...form, esteira: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ESTEIRAS_NEO.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Status" required>
            <Select
              value={form.status}
              onValueChange={(v) => setForm({ ...form, status: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {(statusQ.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.nome}>
                    {s.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Escalonou para">
            <Select
              value={form.escalonou_para ?? "__none"}
              onValueChange={(v) =>
                setForm({ ...form, escalonou_para: v === "__none" ? null : v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">— não escalonado —</SelectItem>
                {(escalonouQ.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.nome}>
                    {s.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Responsável" required className="md:col-span-2">
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

          <Field label="Observação" className="md:col-span-2">
            <Textarea
              rows={3}
              value={form.observacao ?? ""}
              onChange={(e) => setForm({ ...form, observacao: e.target.value })}
              maxLength={2000}
              placeholder="Contexto ou detalhes do atendimento"
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
              {mutation.isPending ? "Salvando…" : isEdit ? "Salvar alterações" : "Criar registro"}
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
