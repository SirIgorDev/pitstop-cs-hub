import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { ForbiddenState } from "@/components/state-views";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  parseChurnDetailFile,
  parseChurnSummaryFile,
  type ParsedChurnDetail,
  type ParsedChurnSummary,
} from "@/lib/churn-file-parser";
import { useAuth } from "@/lib/mock-role";

export const Route = createFileRoute("/_app/churn")({
  component: ChurnPage,
  head: () => ({
    meta: [{ title: "Monitor de Churn — Controller CS" }, { name: "robots", content: "noindex" }],
  }),
});

type SummaryPreview = { file: File; parsed: ParsedChurnSummary };
type DetailPreview = { file: File; parsed: ParsedChurnDetail };
type ChurnSummaryInsert = Database["public"]["Tables"]["churn_summary"]["Insert"];
type ChurnRecordInsert = Database["public"]["Tables"]["churn_records"]["Insert"];

function normalizeReason(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

function defaultCompetence() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

async function insertBatches<T extends Record<string, unknown>>(table: "churn_summary" | "churn_records", rows: T[]) {
  for (let index = 0; index < rows.length; index += 400) {
    const { error } = await supabase.from(table).insert(rows.slice(index, index + 400) as never);
    if (error) throw error;
  }
}

function ChurnPage() {
  const { role, user, rbacEnabled, hasPermission, permissionScope } = useAuth();
  const summaryInput = useRef<HTMLInputElement>(null);
  const detailInput = useRef<HTMLInputElement>(null);
  const [competence, setCompetence] = useState(defaultCompetence);
  const [summary, setSummary] = useState<SummaryPreview | null>(null);
  const [details, setDetails] = useState<DetailPreview[]>([]);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const canAccess = rbacEnabled
    ? hasPermission("churn.view")
    : role === "analista_processos" || role === "coordenador" || role === "administrador";
  const canImport = rbacEnabled ? hasPermission("churn.import") : canAccess;

  const summaryReasons = useMemo(
    () => new Set(summary?.parsed.rows.map((row) => normalizeReason(row.macroReason)) ?? []),
    [summary],
  );
  const detailReasons = useMemo(
    () => new Set(details.map((item) => normalizeReason(item.parsed.macroReason))),
    [details],
  );
  const pendingReasons = summary?.parsed.rows.filter(
    (row) => !detailReasons.has(normalizeReason(row.macroReason)),
  ) ?? [];
  const unexpectedDetails = details.filter(
    (item) => !summaryReasons.has(normalizeReason(item.parsed.macroReason)),
  );
  const totalValue = summary?.parsed.rows.reduce((total, row) => total + row.churnValue, 0) ?? 0;
  const totalQuantity = summary?.parsed.rows.reduce((total, row) => total + row.churnQuantity, 0) ?? 0;
  const detailRows = details.reduce((total, item) => total + item.parsed.rows.length, 0);
  const uniqueClients = new Set(details.flatMap((item) => item.parsed.rows.map((row) => row.clientId))).size;
  const ready = Boolean(summary && competence && details.length && !pendingReasons.length && !unexpectedDetails.length);

  if (!canAccess) {
    return (
      <>
        <PageHeader title="Monitor de Churn" />
        <ForbiddenState title="Área restrita" description="Seu cargo não possui permissão para visualizar o Monitor de Churn." />
      </>
    );
  }

  const handleSummary = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setReading(true);
    try {
      const parsed = await parseChurnSummaryFile(file);
      setSummary({ file, parsed });
      setDetails([]);
      toast.success(`${parsed.rows.length} macromotivos encontrados`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível ler o arquivo-resumo");
    } finally {
      setReading(false);
    }
  };

  const handleDetails = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    if (!files.length) return;
    setReading(true);
    try {
      const parsed = await Promise.all(files.map(async (file) => ({ file, parsed: await parseChurnDetailFile(file) })));
      const combined = [...details, ...parsed];
      const seen = new Set<string>();
      for (const item of combined) {
        const reason = normalizeReason(item.parsed.macroReason);
        if (seen.has(reason)) throw new Error(`Já existe um arquivo para o macromotivo “${item.parsed.macroReason}”`);
        seen.add(reason);
      }
      setDetails(combined);
      toast.success(`${parsed.length} arquivo(s) de detalhamento validado(s)`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível ler os detalhamentos");
    } finally {
      setReading(false);
    }
  };

  const saveImport = async () => {
    if (!summary || !ready || !user.id) return;
    setSaving(true);
    setProgress(5);
    let importId: string | null = null;
    try {
      const competenceDate = `${competence}-01`;
      const { data: lastVersion, error: versionError } = await supabase
        .from("churn_imports")
        .select("versao")
        .eq("owner_id", user.id)
        .eq("competencia", competenceDate)
        .order("versao", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (versionError) throw versionError;

      const { data: createdImport, error: importError } = await supabase
        .from("churn_imports")
        .insert({
          owner_id: user.id,
          competencia: competenceDate,
          versao: (lastVersion?.versao ?? 0) + 1,
          status: "processing",
        })
        .select("id")
        .single();
      if (importError) throw importError;
      importId = createdImport.id;
      setProgress(15);

      const { data: summaryFile, error: summaryFileError } = await supabase
        .from("churn_files")
        .insert({
          import_id: importId,
          tipo: "summary",
          file_name: summary.file.name,
          status: "valid",
          imported_rows: summary.parsed.rows.length,
          valid_rows: summary.parsed.rows.length,
          created_by: user.id,
        })
        .select("id")
        .single();
      if (summaryFileError) throw summaryFileError;
      await insertBatches<ChurnSummaryInsert>(
        "churn_summary",
        summary.parsed.rows.map((row) => ({
          import_id: importId!, file_id: summaryFile.id, macro_reason: row.macroReason,
          churn_value: row.churnValue, churn_quantity: row.churnQuantity,
        })),
      );
      setProgress(30);

      for (let index = 0; index < details.length; index += 1) {
        const detail = details[index];
        const { data: detailFile, error: detailFileError } = await supabase
          .from("churn_files")
          .insert({
            import_id: importId,
            tipo: "detail",
            file_name: detail.file.name,
            macro_reason: detail.parsed.macroReason,
            status: "valid",
            imported_rows: detail.parsed.rows.length,
            valid_rows: detail.parsed.rows.length,
            created_by: user.id,
          })
          .select("id")
          .single();
        if (detailFileError) throw detailFileError;
        await insertBatches<ChurnRecordInsert>(
          "churn_records",
          detail.parsed.rows.map((row) => ({
            import_id: importId!, file_id: detailFile.id, source_row: row.sourceRow,
            client_id: row.clientId, client_name: row.clientName, unit_name: row.unitName || null,
            acquisition_date: row.acquisitionDate, modality: row.modality || null,
            market: row.market || null, service_product: row.serviceProduct,
            plan_name: row.planName || null, cancellation_date: row.cancellationDate,
            macro_reason: row.macroReason, cancellation_reason: row.cancellationReason || null,
            cancellation_value: row.cancellationValue, revenue_type: row.revenueType || null,
            churn_type: row.churnType || null, client_status: row.clientStatus || null,
            observation: row.observation || null,
          })),
        );
        setProgress(30 + Math.round(((index + 1) / details.length) * 60));
      }

      const { error: finishError } = await supabase
        .from("churn_imports")
        .update({ status: "ready", processed_at: new Date().toISOString(), error_message: null })
        .eq("id", importId);
      if (finishError) throw finishError;
      setProgress(100);
      toast.success("Importação de churn concluída");
      setSummary(null);
      setDetails([]);
    } catch (error) {
      if (importId) {
        await supabase.from("churn_imports").update({
          status: "failed",
          error_message: error instanceof Error ? error.message : "Falha durante a importação",
        }).eq("id", importId);
      }
      toast.error(error instanceof Error ? error.message : "Não foi possível concluir a importação");
    } finally {
      setSaving(false);
      setTimeout(() => setProgress(0), 800);
    }
  };

  const scope = rbacEnabled ? permissionScope("churn.view") : role === "analista_processos" ? "own" : "all";

  return (
    <>
      <PageHeader title="Monitor de Churn" description="Importe o resumo mensal e um detalhamento para cada macromotivo." />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Nova importação</CardTitle>
            <CardDescription>O percentual e os filtros do relatório original não serão importados.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="max-w-xs space-y-2">
              <Label htmlFor="churn-competence">Competência</Label>
              <Input id="churn-competence" type="month" value={competence} onChange={(event) => setCompetence(event.target.value)} disabled={saving} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <button type="button" onClick={() => summaryInput.current?.click()} disabled={!canImport || reading || saving} className="rounded-lg border border-dashed p-6 text-left transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50">
                <FileSpreadsheet className="mb-3 h-6 w-6 text-primary" />
                <span className="block font-medium">1. Arquivo-resumo</span>
                <span className="mt-1 block text-sm text-muted-foreground">Macromotivos, valor e quantidade de churn.</span>
                {summary && <Badge className="mt-3" variant="secondary">{summary.file.name}</Badge>}
              </button>
              <button type="button" onClick={() => detailInput.current?.click()} disabled={!canImport || !summary || reading || saving} className="rounded-lg border border-dashed p-6 text-left transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50">
                <Upload className="mb-3 h-6 w-6 text-primary" />
                <span className="block font-medium">2. Arquivos de detalhamento</span>
                <span className="mt-1 block text-sm text-muted-foreground">Selecione juntos os arquivos-filhos de cada motivo.</span>
                {!!details.length && <Badge className="mt-3" variant="secondary">{details.length} arquivo(s)</Badge>}
              </button>
            </div>
            <input ref={summaryInput} className="hidden" type="file" accept=".xlsx" onChange={handleSummary} />
            <input ref={detailInput} className="hidden" type="file" accept=".xlsx" multiple onChange={handleDetails} />
            {(reading || saving) && <Progress value={saving ? progress : undefined} />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Escopo de acesso</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {scope === "own" ? "Você visualizará somente as importações realizadas por você." : "Você poderá visualizar as importações de todos os responsáveis."}
          </CardContent>
        </Card>
      </div>

      {summary && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Validação antes de importar</CardTitle>
            <CardDescription>Todos os macromotivos do resumo precisam do respectivo arquivo-filho.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Macromotivos", summary.parsed.rows.length], ["Churn", formatCurrency(totalValue)],
                ["Clientes no resumo", totalQuantity], ["Clientes únicos detalhados", uniqueClients],
              ].map(([label, value]) => <div key={label} className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>)}
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>Macromotivo</TableHead><TableHead className="text-right">Resumo</TableHead><TableHead>Detalhamento</TableHead><TableHead className="w-12" /></TableRow></TableHeader>
              <TableBody>
                {summary.parsed.rows.map((row) => {
                  const detail = details.find((item) => normalizeReason(item.parsed.macroReason) === normalizeReason(row.macroReason));
                  return <TableRow key={row.macroReason}><TableCell className="font-medium">{row.macroReason}</TableCell><TableCell className="text-right">{row.churnQuantity}</TableCell><TableCell>{detail ? `${detail.parsed.rows.length} linha(s) · ${detail.file.name}` : <span className="text-muted-foreground">Pendente</span>}</TableCell><TableCell>{detail && <Button variant="ghost" size="icon" aria-label={`Remover ${detail.file.name}`} onClick={() => setDetails((current) => current.filter((item) => item !== detail))}><Trash2 className="h-4 w-4" /></Button>}</TableCell></TableRow>;
                })}
              </TableBody>
            </Table>
            {unexpectedDetails.map((detail) => <p key={detail.file.name} className="text-sm text-destructive">O macromotivo “{detail.parsed.macroReason}” não existe no arquivo-resumo.</p>)}
            <div className="flex flex-col justify-between gap-3 border-t pt-4 sm:flex-row sm:items-center">
              <div className="text-sm text-muted-foreground">{ready ? <span className="inline-flex items-center gap-2 text-emerald-600"><CheckCircle2 className="h-4 w-4" />Estrutura completa: {detailRows} linhas prontas.</span> : `${pendingReasons.length} detalhamento(s) pendente(s).`}</div>
              <Button onClick={saveImport} disabled={!ready || saving || !canImport}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmar importação</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
