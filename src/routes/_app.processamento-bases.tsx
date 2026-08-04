import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Loader2,
  RotateCcw,
  Trash2,
  Upload,
} from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { ForbiddenState, LoadingState } from "@/components/state-views";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { buildBaseCsv } from "@/lib/base-export";
import { parseBaseFile, type ParsedBaseFile } from "@/lib/base-file-parser";
import {
  analyzePhone,
  normalizeDocument,
  normalizePersonName,
  processBaseRows,
  type BaseProcessingResult,
  type PhoneSource,
  type RawBaseRow,
} from "@/lib/base-processing";
import { useAuth } from "@/lib/mock-role";

export const Route = createFileRoute("/_app/processamento-bases")({
  component: ProcessamentoBasesPage,
  head: () => ({
    meta: [
      { title: "Tratamento de Disparo — Controller CS" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type Preview = {
  file: File;
  parsed: ParsedBaseFile;
  result: BaseProcessingResult;
};

type CurrentImport = {
  id: string;
  file_name: string;
  imported_rows: number;
  duplicate_documents: number;
  duplicate_rows: number;
  invalid_document_rows: number;
  documents_without_whatsapp: number;
  generated_rows: number;
  processed_at: string | null;
};

type ReviewRow = {
  id: string;
  source_row: number;
  document_normalized: string | null;
  client_name: string;
  contact_name: string;
  email: string;
  whatsapp: string | null;
  phone_source: string | null;
  outcome: string;
};

type ActiveReviewDecision = {
  id: string;
  document_normalized: string;
};

const treatmentChartConfig = {
  quantidade: { label: "Registros", color: "var(--primary)" },
} satisfies ChartConfig;

const METRICS = [
  ["Registros importados", "importedRows"],
  ["Documentos duplicados", "duplicateDocuments"],
  ["Documentos inválidos", "invalidDocumentRows"],
  ["Sem WhatsApp", "documentsWithoutWhatsapp"],
  ["Registros que serão gerados", "generatedRows"],
] as const;

const PREVIEW_PAGE_SIZES = [50, 100, 500, 1000] as const;

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

async function fetchGeneratedRows(importId: string) {
  const pageSize = 1000;
  const rows: Array<{
    document_normalized: string | null;
    client_name: string;
    contact_name: string;
    email: string;
    whatsapp: string | null;
  }> = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("process_import_rows")
      .select("document_normalized, client_name, contact_name, email, whatsapp")
      .eq("import_id", importId)
      .eq("outcome", "generated")
      .order("source_row")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }

  return rows;
}

async function fetchReviewRows(importId: string) {
  const pageSize = 1000;
  const rows: ReviewRow[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("process_import_rows")
      .select(
        "id, source_row, document_normalized, client_name, contact_name, email, whatsapp, phone_source, outcome",
      )
      .eq("import_id", importId)
      .in("outcome", ["generated", "discarded_duplicate"])
      .order("source_row")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...((data ?? []) as ReviewRow[]));
    if (!data || data.length < pageSize) break;
  }

  return rows;
}

async function fetchActiveReviewDecisions(importId: string) {
  const pageSize = 1000;
  const decisions: ActiveReviewDecision[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("process_review_decisions")
      .select("id, document_normalized")
      .eq("import_id", importId)
      .is("undone_at", null)
      .order("created_at")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    decisions.push(...((data ?? []) as ActiveReviewDecision[]));
    if (!data || data.length < pageSize) break;
  }

  return decisions;
}

function rowOutcome(
  raw: RawBaseRow,
  selectedBySourceRow: Map<number, BaseProcessingResult["rows"][number]>,
  generatedDocuments: Set<string>,
) {
  const sourceRow = raw.sourceRow ?? 0;
  const document = normalizeDocument(raw.documento);
  const selected = selectedBySourceRow.get(sourceRow);

  if (!document) return { outcome: "discarded_invalid_document" as const };
  if (selected) {
    return {
      outcome: "generated" as const,
      whatsapp: selected.whatsapp,
      phoneSource: selected.phoneSource,
      addedNinthDigit: analyzePhone(raw[selected.phoneSource]).addedNinthDigit,
    };
  }

  const candidateSource = (["telefone3", "telefone1", "telefone2"] as PhoneSource[]).find(
    (source) => analyzePhone(raw[source]).status === "valid_mobile",
  );
  const candidate = candidateSource ? analyzePhone(raw[candidateSource]) : null;

  return {
    outcome: generatedDocuments.has(document)
      ? ("discarded_duplicate" as const)
      : ("discarded_no_whatsapp" as const),
    whatsapp: candidate?.normalized ?? null,
    phoneSource: candidateSource ?? null,
    addedNinthDigit: candidate?.addedNinthDigit ?? false,
  };
}

type ProcessImportRowInsert = Database["public"]["Tables"]["process_import_rows"]["Insert"];

async function insertInBatches(rows: ProcessImportRowInsert[], size = 500) {
  for (let index = 0; index < rows.length; index += size) {
    const { error } = await supabase
      .from("process_import_rows")
      .insert(rows.slice(index, index + size));
    if (error) throw error;
  }
}

function ProcessamentoBasesPage() {
  const { role, user, rbacEnabled, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [previewPage, setPreviewPage] = useState(0);
  const [previewPageSize, setPreviewPageSize] = useState<number>(50);
  const canAccess = rbacEnabled
    ? hasPermission("dispatch.view")
    : role === "analista_processos" || role === "administrador";

  const currentQuery = useQuery({
    queryKey: ["process-import-current", user.id],
    enabled: canAccess && Boolean(user.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("process_imports")
        .select(
          "id, file_name, imported_rows, duplicate_documents, duplicate_rows, invalid_document_rows, documents_without_whatsapp, generated_rows, processed_at",
        )
        .eq("owner_id", user.id)
        .eq("is_current", true)
        .maybeSingle();
      if (error) throw error;
      return data as CurrentImport | null;
    },
  });

  const reviewRowsQuery = useQuery({
    queryKey: ["process-import-review-rows", currentQuery.data?.id],
    enabled: Boolean(currentQuery.data?.id),
    queryFn: () => fetchReviewRows(currentQuery.data!.id),
  });

  const reviewDecisionsQuery = useQuery({
    queryKey: ["process-import-review-decisions", currentQuery.data?.id],
    enabled: Boolean(currentQuery.data?.id),
    queryFn: () => fetchActiveReviewDecisions(currentQuery.data!.id),
  });

  const refreshReview = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["process-import-review-rows", currentQuery.data?.id],
      }),
      queryClient.invalidateQueries({
        queryKey: ["process-import-review-decisions", currentQuery.data?.id],
      }),
    ]);
  };

  const selectReviewMutation = useMutation({
    mutationFn: async (selectedRowId: string) => {
      if (!currentQuery.data) throw new Error("Importação atual não encontrada");
      const { error } = await supabase.rpc("review_process_document", {
        target_import_id: currentQuery.data.id,
        target_selected_row_id: selectedRowId,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await refreshReview();
      toast.success("Contato selecionado para exportação");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Não foi possível alterar a seleção");
    },
  });

  const undoReviewMutation = useMutation({
    mutationFn: async (decisionId: string) => {
      const { error } = await supabase.rpc("undo_process_review", {
        target_decision_id: decisionId,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await refreshReview();
      toast.success("Alteração desfeita");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Não foi possível desfazer a alteração");
    },
  });

  if (!canAccess) {
    return (
      <>
        <PageHeader title="Tratamento de Disparo" />
        <ForbiddenState
          title="Área restrita"
          description="Somente Analistas de Processos e Administradores podem tratar bases."
        />
      </>
    );
  }

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setReading(true);
    try {
      const parsed = await parseBaseFile(file);
      const result = processBaseRows(parsed.rows);
      setPreviewPage(0);
      setPreview({ file, parsed, result });
      toast.success("Arquivo analisado com sucesso");
    } catch (error) {
      setPreview(null);
      toast.error(error instanceof Error ? error.message : "Não foi possível ler o arquivo");
    } finally {
      setReading(false);
    }
  };

  const saveImport = async () => {
    if (!preview || !user.id) return;
    setSaving(true);
    let importId: string | null = null;

    try {
      const metrics = preview.result.metrics;
      const { data: created, error: createError } = await supabase
        .from("process_imports")
        .insert({
          owner_id: user.id,
          file_name: preview.file.name,
          source_type: "upload",
          status: "processing",
          is_current: false,
          imported_rows: metrics.importedRows,
          invalid_document_rows: metrics.invalidDocumentRows,
          unique_valid_documents: metrics.uniqueValidDocuments,
          duplicate_documents: metrics.duplicateDocuments,
          duplicate_rows: metrics.duplicateRows,
          documents_without_whatsapp: metrics.documentsWithoutWhatsapp,
          generated_rows: metrics.generatedRows,
          fixed_phone_candidates: metrics.fixedPhoneCandidates,
          invalid_phone_candidates: metrics.invalidPhoneCandidates,
          phones_with_added_ninth_digit: metrics.phonesWithAddedNinthDigit,
        })
        .select("id")
        .single();
      if (createError) throw createError;
      importId = created.id;

      const selectedBySourceRow = new Map(preview.result.rows.map((row) => [row.sourceRow, row]));
      const generatedDocuments = new Set(preview.result.rows.map((row) => row.documento));
      const persistedRows = preview.parsed.rows.map((raw) => {
        const decision = rowOutcome(raw, selectedBySourceRow, generatedDocuments);
        return {
          import_id: created.id,
          source_row: raw.sourceRow ?? 0,
          document_raw: String(raw.documento ?? ""),
          document_normalized: normalizeDocument(raw.documento),
          client_name: String(raw.empresa ?? ""),
          contact_name: normalizePersonName(raw.representante),
          email: String(raw.email ?? ""),
          phone_1: String(raw.telefone1 ?? ""),
          phone_2: String(raw.telefone2 ?? ""),
          phone_3: String(raw.telefone3 ?? ""),
          whatsapp: "whatsapp" in decision ? (decision.whatsapp ?? null) : null,
          phone_source: "phoneSource" in decision ? (decision.phoneSource ?? null) : null,
          outcome: decision.outcome,
          added_ninth_digit:
            "addedNinthDigit" in decision ? (decision.addedNinthDigit ?? false) : false,
        };
      });

      await insertInBatches(persistedRows);

      const { error: readyError } = await supabase
        .from("process_imports")
        .update({ status: "ready", processed_at: new Date().toISOString() })
        .eq("id", created.id);
      if (readyError) throw readyError;

      const { error: finalizeError } = await supabase.rpc("finalize_process_import", {
        target_import_id: created.id,
      });
      if (finalizeError) throw finalizeError;

      setPreview(null);
      await queryClient.invalidateQueries({ queryKey: ["process-import-current", user.id] });
      toast.success("Importação salva e definida como base atual");
    } catch (error) {
      if (importId) {
        await supabase.from("process_imports").delete().eq("id", importId);
      }
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar a importação");
    } finally {
      setSaving(false);
    }
  };

  const deleteCurrent = async () => {
    if (!currentQuery.data) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("process_imports")
        .delete()
        .eq("id", currentQuery.data.id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["process-import-current", user.id] });
      toast.success("Importação excluída");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível excluir");
    } finally {
      setDeleting(false);
    }
  };

  const exportCurrent = async () => {
    if (!currentQuery.data) return;
    setExporting(true);
    try {
      const rows = await fetchGeneratedRows(currentQuery.data.id);
      const csv = buildBaseCsv(rows);
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `base-tratada-${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success(`${rows.length} registros exportados`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível exportar");
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Tratamento de Disparo"
        description="Importe CSV ou XLSX, valide CPF/CNPJ, elimine duplicidades e selecione o melhor WhatsApp."
        actions={
          <>
            <input
              ref={fileInput}
              className="hidden"
              type="file"
              accept=".csv,.xlsx"
              onChange={handleFile}
            />
            <Button
              onClick={() => fileInput.current?.click()}
              disabled={reading || saving || !hasPermission("dispatch.import")}
            >
              {reading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Importar arquivo
            </Button>
          </>
        }
      />

      {currentQuery.isLoading ? (
        <LoadingState title="Carregando base atual…" />
      ) : currentQuery.data ? (
        <Card className="mb-6">
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Base atual</CardTitle>
              <CardDescription>
                {currentQuery.data.file_name} · processada em{" "}
                {formatDateTime(currentQuery.data.processed_at)}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {hasPermission("dispatch.export") && (
                <Button variant="outline" size="sm" onClick={exportCurrent} disabled={exporting}>
                  {exporting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Exportar CSV
                </Button>
              )}
              {hasPermission("dispatch.inactivate") && (
                <Button variant="outline" size="sm" onClick={deleteCurrent} disabled={deleting}>
                  {deleting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Excluir
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <CurrentMetric label="Importados" value={currentQuery.data.imported_rows} />
            <CurrentMetric label="Duplicados" value={currentQuery.data.duplicate_documents} />
            <CurrentMetric label="Inválidos" value={currentQuery.data.invalid_document_rows} />
            <CurrentMetric
              label="Sem WhatsApp"
              value={currentQuery.data.documents_without_whatsapp}
            />
            <CurrentMetric label="Gerados" value={currentQuery.data.generated_rows} highlight />
          </CardContent>
          <CardContent>
            <h3 className="mb-3 text-sm font-medium">Resultado do tratamento</h3>
            <ChartContainer config={treatmentChartConfig} className="h-[260px] w-full">
              <BarChart
                accessibilityLayer
                data={[
                  { nome: "Gerados", quantidade: currentQuery.data.generated_rows },
                  { nome: "Duplicados", quantidade: currentQuery.data.duplicate_rows },
                  {
                    nome: "Documento inválido",
                    quantidade: currentQuery.data.invalid_document_rows,
                  },
                  {
                    nome: "Sem WhatsApp",
                    quantidade: currentQuery.data.documents_without_whatsapp,
                  },
                ]}
                margin={{ left: 8, right: 8 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis dataKey="nome" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="quantidade" fill="var(--color-quantidade)" radius={6} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      ) : null}

      {currentQuery.data && (
        <DuplicateReview
          rows={reviewRowsQuery.data ?? []}
          decisions={reviewDecisionsQuery.data ?? []}
          loading={reviewRowsQuery.isLoading || reviewDecisionsQuery.isLoading}
          changing={selectReviewMutation.isPending || undoReviewMutation.isPending}
          onSelect={(rowId) => selectReviewMutation.mutate(rowId)}
          onUndo={(decisionId) => undoReviewMutation.mutate(decisionId)}
        />
      )}

      {!preview ? (
        <Card>
          <CardContent className="flex flex-col items-center py-14 text-center">
            <FileSpreadsheet className="mb-4 h-12 w-12 text-primary" />
            <h2 className="font-semibold">Selecione a base de clientes</h2>
            <p className="mt-1 max-w-lg text-sm text-muted-foreground">
              O arquivo é analisado no navegador antes de ser salvo. Aceitamos CSV e XLSX de até 25
              MB.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {METRICS.map(([label, key]) => (
              <Card key={key}>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="mt-2 text-2xl font-semibold">{preview.result.metrics[key]}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-base">Prévia do arquivo final</CardTitle>
                <CardDescription>
                  {preview.file.name} · {preview.result.rows.length} registros válidos
                </CardDescription>
              </div>
              <Badge variant="outline">{preview.parsed.format.toUpperCase()}</Badge>
            </CardHeader>
            <CardContent>
              <div className="max-h-[420px] overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>CPF/CNPJ</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>WhatsApp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.result.rows
                      .slice(previewPage * previewPageSize, (previewPage + 1) * previewPageSize)
                      .map((row) => (
                        <TableRow key={row.documento}>
                          <TableCell>{row.documento}</TableCell>
                          <TableCell>{row.cliente}</TableCell>
                          <TableCell>{row.nome}</TableCell>
                          <TableCell>{row.email}</TableCell>
                          <TableCell>{row.whatsapp}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Registros por página</span>
                  <Select
                    value={String(previewPageSize)}
                    onValueChange={(value) => {
                      setPreviewPageSize(Number(value));
                      setPreviewPage(0);
                    }}
                  >
                    <SelectTrigger className="w-24" aria-label="Registros por página">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PREVIEW_PAGE_SIZES.map((size) => (
                        <SelectItem key={size} value={String(size)}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Página {previewPage + 1} de{" "}
                    {Math.max(1, Math.ceil(preview.result.rows.length / previewPageSize))}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewPage((page) => Math.max(0, page - 1))}
                    disabled={previewPage === 0}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Anterior
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewPage((page) => page + 1)}
                    disabled={
                      previewPage + 1 >= Math.ceil(preview.result.rows.length / previewPageSize)
                    }
                  >
                    Próxima
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPreview(null);
                    setPreviewPage(0);
                  }}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button onClick={saveImport} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar como base atual
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

function DuplicateReview({
  rows,
  decisions,
  loading,
  changing,
  onSelect,
  onUndo,
}: {
  rows: ReviewRow[];
  decisions: ActiveReviewDecision[];
  loading: boolean;
  changing: boolean;
  onSelect: (rowId: string) => void;
  onUndo: (decisionId: string) => void;
}) {
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const grouped = new Map<string, ReviewRow[]>();
  for (const row of rows) {
    if (!row.document_normalized) continue;
    const group = grouped.get(row.document_normalized) ?? [];
    group.push(row);
    grouped.set(row.document_normalized, group);
  }
  const duplicateGroups = [...grouped.entries()].filter(([, options]) => options.length > 1);
  const pageCount = Math.ceil(duplicateGroups.length / pageSize);
  const safePage = Math.min(page, Math.max(pageCount - 1, 0));
  const visibleGroups = duplicateGroups.slice(safePage * pageSize, (safePage + 1) * pageSize);
  const activeByDocument = new Map(
    decisions.map((decision) => [decision.document_normalized, decision]),
  );

  if (loading) {
    return <LoadingState title="Carregando revisão de duplicados…" />;
  }

  if (duplicateGroups.length === 0) return null;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base">Revisão de duplicados</CardTitle>
        <CardDescription>
          Compare os contatos do mesmo CPF/CNPJ e escolha qual será enviado no CSV. A decisão pode
          ser desfeita.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {visibleGroups.map(([document, options]) => {
          const activeDecision = activeByDocument.get(document);
          return (
            <div key={document} className="rounded-md border">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-4 py-3">
                <div>
                  <p className="text-xs text-muted-foreground">CPF/CNPJ</p>
                  <p className="font-medium">{document}</p>
                </div>
                {activeDecision && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={changing}
                    onClick={() => onUndo(activeDecision.id)}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Desfazer alteração
                  </Button>
                )}
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Linha</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>WhatsApp</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {options.map((option) => {
                      const selected = option.outcome === "generated";
                      return (
                        <TableRow key={option.id}>
                          <TableCell>{option.source_row}</TableCell>
                          <TableCell>{option.client_name || "—"}</TableCell>
                          <TableCell>{option.contact_name || "—"}</TableCell>
                          <TableCell>{option.email || "—"}</TableCell>
                          <TableCell>
                            {option.whatsapp ? (
                              <div>
                                <span>{option.whatsapp}</span>
                                {option.phone_source && (
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    {option.phone_source}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Sem celular válido</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {selected ? (
                              <Badge variant="secondary">
                                <Check className="mr-1 h-3 w-3" />
                                Selecionado
                              </Badge>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={changing || !option.whatsapp}
                                onClick={() => onSelect(option.id)}
                              >
                                Selecionar
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          );
        })}
        {pageCount > 1 && (
          <div className="flex items-center justify-between border-t pt-4">
            <p className="text-sm text-muted-foreground">
              Página {safePage + 1} de {pageCount} · {duplicateGroups.length} documentos duplicados
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={safePage === 0}
                onClick={() => setPage((value) => Math.max(value - 1, 0))}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={safePage >= pageCount - 1}
                onClick={() => setPage((value) => Math.min(value + 1, pageCount - 1))}
              >
                Próxima
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CurrentMetric({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={
          highlight ? "mt-1 text-xl font-semibold text-primary" : "mt-1 text-xl font-semibold"
        }
      >
        {value}
      </p>
    </div>
  );
}
