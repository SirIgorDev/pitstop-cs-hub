import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileSpreadsheet, Loader2, Trash2, Upload } from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { ForbiddenState, LoadingState } from "@/components/state-views";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { parseBaseFile, type ParsedBaseFile } from "@/lib/base-file-parser";
import {
  analyzePhone,
  normalizeDocument,
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
      { title: "Tratamento de Bases — Controller CS" },
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
  invalid_document_rows: number;
  documents_without_whatsapp: number;
  generated_rows: number;
  processed_at: string | null;
};

const METRICS = [
  ["Registros importados", "importedRows"],
  ["Documentos duplicados", "duplicateDocuments"],
  ["Documentos inválidos", "invalidDocumentRows"],
  ["Sem WhatsApp", "documentsWithoutWhatsapp"],
  ["Registros que serão gerados", "generatedRows"],
] as const;

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
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

  return {
    outcome: generatedDocuments.has(document)
      ? ("discarded_duplicate" as const)
      : ("discarded_no_whatsapp" as const),
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
  const { role, user } = useAuth();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const canAccess = role === "analista_processos" || role === "administrador";

  const currentQuery = useQuery({
    queryKey: ["process-import-current", user.id],
    enabled: canAccess && Boolean(user.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("process_imports")
        .select(
          "id, file_name, imported_rows, duplicate_documents, invalid_document_rows, documents_without_whatsapp, generated_rows, processed_at",
        )
        .eq("owner_id", user.id)
        .eq("is_current", true)
        .maybeSingle();
      if (error) throw error;
      return data as CurrentImport | null;
    },
  });

  if (!canAccess) {
    return (
      <>
        <PageHeader title="Tratamento de Bases" />
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
          contact_name: String(raw.representante ?? ""),
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

  return (
    <>
      <PageHeader
        title="Tratamento de Bases"
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
            <Button onClick={() => fileInput.current?.click()} disabled={reading || saving}>
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
            <Button variant="outline" size="sm" onClick={deleteCurrent} disabled={deleting}>
              {deleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Excluir
            </Button>
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
        </Card>
      ) : null}

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
                    {preview.result.rows.slice(0, 100).map((row) => (
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
              {preview.result.rows.length > 100 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Exibindo os primeiros 100 registros.
                </p>
              )}
              <div className="mt-5 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPreview(null)} disabled={saving}>
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
