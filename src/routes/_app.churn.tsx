import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Loader2,
  List,
  Rows3,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { ForbiddenState } from "@/components/state-views";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { buildConsolidatedChurnCsv } from "@/lib/churn-export";
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
    meta: [{ title: "Monitor - Churn — Controller CS" }, { name: "robots", content: "noindex" }],
  }),
});

type SummaryPreview = { file: File; parsed: ParsedChurnSummary };
type DetailPreview = { file: File; parsed: ParsedChurnDetail };
type ChurnSummaryInsert = Database["public"]["Tables"]["churn_summary"]["Insert"];
type ChurnRecordInsert = Database["public"]["Tables"]["churn_records"]["Insert"];
type ChurnImport = Pick<
  Database["public"]["Tables"]["churn_imports"]["Row"],
  "id" | "competencia" | "versao" | "status" | "owner_id" | "created_at"
> & { ownerName: string };
type ChurnSummary = Database["public"]["Tables"]["churn_summary"]["Row"];
type ChurnRecord = Database["public"]["Tables"]["churn_records"]["Row"];

type ConsolidatedClient = {
  clientId: string;
  clientName: string;
  unitName: string;
  unitNames: string[];
  macroReasons: string[];
  churnTypes: string[];
  services: string[];
  cancellationReasons: string[];
  cancellationValue: number;
  cancellationDate: string | null;
  records: ChurnRecord[];
};

type MultiSelectFilterProps = {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
};

function MultiSelectFilter({ label, options, selected, onChange }: MultiSelectFilterProps) {
  const selectedSet = new Set(selected);
  const allSelected = options.length > 0 && selected.length === options.length;
  const triggerLabel = selected.length === 0
    ? label === "Unidades" ? "Todas as unidades" : "Todos os macromotivos"
    : selected.length === 1
      ? selected[0]
      : label === "Unidades"
        ? `${selected.length} unidades selecionadas`
        : `${selected.length} macromotivos selecionados`;

  const toggleOption = (option: string) => {
    onChange(selectedSet.has(option)
      ? selected.filter((item) => item !== option)
      : [...selected, option]);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-10 w-full justify-between px-3 font-normal" aria-label={`Filtrar por ${label.toLocaleLowerCase("pt-BR")}`}>
          <span className="truncate">{triggerLabel}</span><ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-medium">{label}</span>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onChange([])} disabled={!selected.length}>Limpar</Button>
        </div>
        <label className="flex cursor-pointer items-center gap-2 border-b px-3 py-2 text-sm hover:bg-muted/50">
          <Checkbox checked={allSelected} onCheckedChange={() => onChange(allSelected ? [] : [...options])} />
          Selecionar todos
        </label>
        <div className="max-h-64 overflow-y-auto p-1">
          {options.map((option) => (
            <label key={option} className="flex cursor-pointer items-start gap-2 rounded-sm px-2 py-2 text-sm hover:bg-muted/50">
              <Checkbox checked={selectedSet.has(option)} onCheckedChange={() => toggleOption(option)} />
              <span>{option}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ChurnTypeBadges({ types }: { types: string[] }) {
  if (!types.length) return <span className="text-xs text-muted-foreground">Não informado</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {types.map((type) => (
        <Badge
          key={type}
          variant={type === "Churn" ? "destructive" : "outline"}
          className={type === "Downgrade" ? "border-orange-500/50 bg-orange-500/15 text-orange-700 dark:text-orange-300" : undefined}
        >
          {type}
        </Badge>
      ))}
    </div>
  );
}

const churnChartConfig = {
  valor: { label: "Churn", color: "var(--primary)" },
} satisfies ChartConfig;

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

function formatDate(value: string | null) {
  if (!value) return "Não informada";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

function formatCompetence(value: string, version: number) {
  const [year, month] = value.split("-").map(Number);
  const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
    new Date(year, month - 1, 1),
  );
  return `${label.charAt(0).toUpperCase()}${label.slice(1)} · v${version}`;
}

function consolidateClients(records: ChurnRecord[]): ConsolidatedClient[] {
  const clients = new Map<string, ConsolidatedClient & {
    unitNameSet: Set<string>;
    macroReasonSet: Set<string>;
    churnTypeSet: Set<string>;
    serviceSet: Set<string>;
    cancellationReasonSet: Set<string>;
  }>();

  for (const row of records) {
    const key = row.client_id.trim() || `${row.client_name}-${row.unit_name ?? ""}`;
    const current = clients.get(key) ?? {
      clientId: row.client_id,
      clientName: row.client_name,
      unitName: row.unit_name ?? "",
      unitNames: [],
      macroReasons: [],
      churnTypes: [],
      services: [],
      cancellationReasons: [],
      cancellationValue: 0,
      cancellationDate: row.cancellation_date,
      records: [],
      unitNameSet: new Set<string>(),
      macroReasonSet: new Set<string>(),
      churnTypeSet: new Set<string>(),
      serviceSet: new Set<string>(),
      cancellationReasonSet: new Set<string>(),
    };
    if (row.unit_name) current.unitNameSet.add(row.unit_name);
    current.macroReasonSet.add(row.macro_reason);
    if (row.churn_type) current.churnTypeSet.add(row.churn_type);
    if (row.service_product) current.serviceSet.add(row.service_product);
    if (row.cancellation_reason) current.cancellationReasonSet.add(row.cancellation_reason);
    current.records.push(row);
    current.cancellationValue += Number(row.cancellation_value) || 0;
    if (row.cancellation_date && (!current.cancellationDate || row.cancellation_date > current.cancellationDate)) {
      current.cancellationDate = row.cancellation_date;
    }
    clients.set(key, current);
  }

  return [...clients.values()]
    .map(({ unitNameSet, macroReasonSet, churnTypeSet, serviceSet, cancellationReasonSet, ...client }) => ({
      ...client,
      unitNames: [...unitNameSet].sort(),
      unitName: [...unitNameSet].sort().join(" | "),
      macroReasons: [...macroReasonSet].sort(),
      churnTypes: [...churnTypeSet].sort(),
      services: [...serviceSet].sort(),
      cancellationReasons: [...cancellationReasonSet].sort(),
    }))
    .sort((a, b) => b.cancellationValue - a.cancellationValue);
}

async function fetchAllChurnRecords(importId: string) {
  const records: ChurnRecord[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("churn_records")
      .select("*")
      .eq("import_id", importId)
      .order("source_row")
      .range(from, from + 999);
    if (error) throw error;
    records.push(...((data ?? []) as ChurnRecord[]));
    if (!data || data.length < 1000) break;
  }
  return records;
}

async function insertBatches<T extends Record<string, unknown>>(table: "churn_summary" | "churn_records", rows: T[]) {
  for (let index = 0; index < rows.length; index += 400) {
    const { error } = await supabase.from(table).insert(rows.slice(index, index + 400) as never);
    if (error) throw error;
  }
}

function ChurnPage() {
  const { role, user, rbacEnabled, hasPermission, permissionScope } = useAuth();
  const queryClient = useQueryClient();
  const summaryInput = useRef<HTMLInputElement>(null);
  const detailInput = useRef<HTMLInputElement>(null);
  const competenceInput = useRef<HTMLInputElement>(null);
  const [competence, setCompetence] = useState(defaultCompetence);
  const [summary, setSummary] = useState<SummaryPreview | null>(null);
  const [details, setDetails] = useState<DetailPreview[]>([]);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedImportId, setSelectedImportId] = useState("");
  const [selectedMacroReasons, setSelectedMacroReasons] = useState<string[]>([]);
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [clientView, setClientView] = useState<"list" | "grouped">("grouped");
  const [clientPageSize, setClientPageSize] = useState(10);
  const [clientPage, setClientPage] = useState(0);
  const [selectedClient, setSelectedClient] = useState<ConsolidatedClient | null>(null);
  const canAccess = rbacEnabled
    ? hasPermission("churn.view")
    : role === "analista_processos" || role === "coordenador" || role === "administrador";
  const canImport = rbacEnabled ? hasPermission("churn.import") : canAccess;
  const canExport = rbacEnabled ? hasPermission("churn.export") : canAccess;
  const canDelete = rbacEnabled ? hasPermission("churn.delete") : canAccess;

  const importsQuery = useQuery({
    queryKey: ["churn-imports", user.id],
    enabled: canAccess && Boolean(user.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("churn_imports")
        .select("id, competencia, versao, status, owner_id, created_at")
        .eq("ativo", true)
        .in("status", ["ready", "partial"])
        .order("competencia", { ascending: false })
        .order("versao", { ascending: false });
      if (error) throw error;
      const ownerIds = [...new Set((data ?? []).map((item) => item.owner_id))];
      const { data: profiles, error: profilesError } = ownerIds.length
        ? await supabase.from("profiles").select("id, nome").in("id", ownerIds)
        : { data: [], error: null };
      if (profilesError) throw profilesError;
      const ownerNames = new Map((profiles ?? []).map((profile) => [profile.id, profile.nome]));
      return (data ?? []).map((item) => ({
        ...item,
        ownerName: ownerNames.get(item.owner_id) ?? "Responsável não identificado",
      })) as ChurnImport[];
    },
  });

  useEffect(() => {
    if (!selectedImportId && importsQuery.data?.[0]?.id) {
      setSelectedImportId(importsQuery.data[0].id);
    }
  }, [importsQuery.data, selectedImportId]);

  const dashboardQuery = useQuery({
    queryKey: ["churn-dashboard", selectedImportId],
    enabled: Boolean(selectedImportId),
    queryFn: async () => {
      const [{ data: summaryRows, error: summaryError }, records] = await Promise.all([
        supabase
          .from("churn_summary")
          .select("*")
          .eq("import_id", selectedImportId)
          .order("churn_value", { ascending: false }),
        fetchAllChurnRecords(selectedImportId),
      ]);
      if (summaryError) throw summaryError;
      return { summary: (summaryRows ?? []) as ChurnSummary[], records };
    },
  });

  const consolidatedClients = useMemo(
    () => consolidateClients(dashboardQuery.data?.records ?? []),
    [dashboardQuery.data?.records],
  );
  const availableUnits = useMemo(
    () => [...new Set(consolidatedClients.flatMap((client) => client.unitNames))]
      .sort((a, b) => a.localeCompare(b, "pt-BR")),
    [consolidatedClients],
  );
  const filteredClients = useMemo(() => {
    const search = clientSearch.trim().toLocaleLowerCase("pt-BR");
    return consolidatedClients.filter((client) => {
      const matchesMacro = selectedMacroReasons.length === 0
        || client.macroReasons.some((reason) => selectedMacroReasons.includes(reason));
      const matchesUnit = selectedUnits.length === 0
        || client.unitNames.some((unit) => selectedUnits.includes(unit));
      const matchesSearch = !search || [client.clientId, client.clientName, ...client.unitNames, ...client.services]
        .some((value) => value.toLocaleLowerCase("pt-BR").includes(search));
      return matchesMacro && matchesUnit && matchesSearch;
    });
  }, [clientSearch, consolidatedClients, selectedMacroReasons, selectedUnits]);
  const clientPageCount = Math.max(1, Math.ceil(filteredClients.length / clientPageSize));
  const visibleClients = filteredClients.slice(clientPage * clientPageSize, (clientPage + 1) * clientPageSize);
  const groupedVisibleClients = useMemo(() => {
    const groups = new Map<string, ConsolidatedClient[]>();
    for (const client of visibleClients) {
      const reasons = selectedMacroReasons.length
        ? client.macroReasons.filter((reason) => selectedMacroReasons.includes(reason))
        : client.macroReasons;
      for (const reason of reasons) groups.set(reason, [...(groups.get(reason) ?? []), client]);
    }
    return [...groups.entries()]
      .map(([reason, clients]) => ({
        reason,
        clients,
        value: clients.reduce((total, client) => total + client.cancellationValue, 0),
      }))
      .sort((a, b) => b.value - a.value);
  }, [selectedMacroReasons, visibleClients]);

  useEffect(() => {
    setClientPage(0);
  }, [clientPageSize, clientSearch, selectedImportId, selectedMacroReasons, selectedUnits]);

  useEffect(() => {
    setSelectedMacroReasons([]);
    setSelectedUnits([]);
  }, [selectedImportId]);

  const syncCompetenceFromInput = () => {
    const currentValue = competenceInput.current?.value;
    if (currentValue && currentValue !== competence) setCompetence(currentValue);
    return currentValue || competence;
  };

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
        <PageHeader title="Monitor - Churn" />
        <ForbiddenState title="Área restrita" description="Seu cargo não possui permissão para visualizar o Monitor de Churn." />
      </>
    );
  }

  const handleSummary = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    syncCompetenceFromInput();
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
    syncCompetenceFromInput();
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
      const selectedCompetence = syncCompetenceFromInput();
      const competenceDate = `${selectedCompetence}-01`;
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
      setSelectedImportId(importId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["churn-imports"] }),
        queryClient.invalidateQueries({ queryKey: ["churn-dashboard", importId] }),
      ]);
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

  const exportConsolidatedCsv = () => {
    if (!canExport || !selectedImportId || !filteredClients.length) return;
    const selectedImport = importsQuery.data?.find((item) => item.id === selectedImportId);
    const competenceLabel = selectedImport?.competencia.slice(0, 7) ?? "competencia";
    const csv = buildConsolidatedChurnCsv(filteredClients);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `churn-consolidado-${competenceLabel}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`${filteredClients.length} cliente(s) exportado(s)`);
  };

  const deleteImport = async () => {
    if (!canDelete || !selectedImportId) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("churn_imports")
        .delete()
        .eq("id", selectedImportId);
      if (error) throw error;
      setSelectedImportId("");
      setSelectedMacroReasons([]);
      setSelectedUnits([]);
      setClientSearch("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["churn-imports"] }),
        queryClient.removeQueries({ queryKey: ["churn-dashboard", selectedImportId] }),
      ]);
      toast.success("Importação excluída definitivamente e registrada na auditoria");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível excluir a importação");
    } finally {
      setDeleting(false);
    }
  };

  const scope = rbacEnabled ? permissionScope("churn.view") : role === "analista_processos" ? "own" : "all";

  return (
    <>
      <PageHeader title="Monitor de Churn" description="Analise o churn por macromotivo e consulte cada cliente com seus serviços consolidados." />

      {!!importsQuery.data?.length && (
        <div className="mb-6 space-y-6">
          <Card>
            <CardHeader className="gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <CardTitle>Visão gerencial</CardTitle>
                <CardDescription>Valores e clientes da competência selecionada, sem percentuais ou filtros do BI.</CardDescription>
              </div>
              <div className="w-full space-y-3 md:w-80">
                <Label htmlFor="churn-import-select">Competência importada</Label>
                <Select value={selectedImportId} onValueChange={setSelectedImportId}>
                  <SelectTrigger id="churn-import-select"><SelectValue placeholder="Selecione uma importação" /></SelectTrigger>
                  <SelectContent>
                    {importsQuery.data.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {formatCompetence(item.competencia, item.versao)}
                        {scope === "all" ? ` · ${item.ownerName}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap justify-end gap-2">
                  {canExport && (
                    <Button variant="outline" size="sm" onClick={exportConsolidatedCsv} disabled={!filteredClients.length || dashboardQuery.isLoading}>
                      <Download className="mr-2 h-4 w-4" />Exportar CSV
                    </Button>
                  )}
                  {canDelete && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" disabled={!selectedImportId || deleting}>
                          <Trash2 className="mr-2 h-4 w-4" />Excluir
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" />Excluir definitivamente esta importação?</AlertDialogTitle>
                          <AlertDialogDescription>Esta ação é irreversível. A importação e todos os seus arquivos, resumos e registros serão apagados. Somente o evento de exclusão permanecerá na auditoria.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={deleteImport} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir definitivamente</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>

          {dashboardQuery.isLoading && (
            <Card><CardContent className="flex items-center justify-center gap-2 py-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Carregando indicadores…</CardContent></Card>
          )}
          {dashboardQuery.isError && (
            <Card className="border-destructive/40"><CardContent className="py-8 text-center text-sm text-destructive">Não foi possível carregar esta importação: {dashboardQuery.error.message}</CardContent></Card>
          )}
          {dashboardQuery.data && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ["Churn total", formatCurrency(dashboardQuery.data.summary.reduce((total, row) => total + Number(row.churn_value), 0))],
                  ["Clientes únicos", consolidatedClients.length],
                  ["Macromotivos", dashboardQuery.data.summary.length],
                ].map(([label, value]) => (
                  <Card key={label}><CardContent className="p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></CardContent></Card>
                ))}
              </div>

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
                <Card>
                  <CardHeader><CardTitle className="text-base">Churn por macromotivo</CardTitle><CardDescription>Valor absoluto informado no arquivo-resumo.</CardDescription></CardHeader>
                  <CardContent>
                    <ChartContainer config={churnChartConfig} className="h-[320px] w-full">
                      <BarChart data={dashboardQuery.data.summary.map((row) => ({ nome: row.macro_reason, valor: Number(row.churn_value) }))} layout="vertical" margin={{ left: 10, right: 24 }}>
                        <CartesianGrid horizontal={false} />
                        <YAxis dataKey="nome" type="category" width={155} tickLine={false} axisLine={false} tickFormatter={(value) => value.length > 24 ? `${value.slice(0, 24)}…` : value} />
                        <XAxis type="number" hide />
                        <ChartTooltip cursor={false} content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
                        <Bar dataKey="valor" fill="var(--color-valor)" radius={4} />
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Resumo da competência</CardTitle><CardDescription>Quantidade e valor por motivo.</CardDescription></CardHeader>
                  <CardContent className="max-h-[380px] overflow-auto">
                    <Table><TableHeader><TableRow><TableHead>Macromotivo</TableHead><TableHead className="text-right">Qtd.</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader>
                      <TableBody>{dashboardQuery.data.summary.map((row) => <TableRow key={row.id}><TableCell>{row.macro_reason}</TableCell><TableCell className="text-right">{row.churn_quantity}</TableCell><TableCell className="text-right font-medium">{formatCurrency(Number(row.churn_value))}</TableCell></TableRow>)}</TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Clientes consolidados</CardTitle>
                  <CardDescription>Cada cliente aparece uma vez; todos os serviços cancelados permanecem visíveis.</CardDescription>
                  <div className="grid gap-3 pt-3 md:grid-cols-[minmax(0,1fr)_260px_260px]">
                    <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={clientSearch} onChange={(event) => setClientSearch(event.target.value)} placeholder="Buscar cliente, ID, unidade ou serviço…" className="pl-9" /></div>
                    <MultiSelectFilter label="Macromotivos" options={dashboardQuery.data.summary.map((row) => row.macro_reason)} selected={selectedMacroReasons} onChange={setSelectedMacroReasons} />
                    <MultiSelectFilter label="Unidades" options={availableUnits} selected={selectedUnits} onChange={setSelectedUnits} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-3">
                    <span className="text-sm text-muted-foreground">Visualização:</span>
                    <Button type="button" size="sm" variant={clientView === "grouped" ? "default" : "outline"} onClick={() => setClientView("grouped")}><Rows3 className="mr-2 h-4 w-4" />Agrupar por motivo</Button>
                    <Button type="button" size="sm" variant={clientView === "list" ? "default" : "outline"} onClick={() => setClientView("list")}><List className="mr-2 h-4 w-4" />Lista de clientes</Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {clientView === "list" ? <div className="overflow-x-auto">
                    <Table><TableHeader><TableRow><TableHead>ID</TableHead><TableHead className="w-32">Tipo</TableHead><TableHead>Cliente</TableHead><TableHead>Macromotivo</TableHead><TableHead>Serviços</TableHead><TableHead className="text-right">Valor da Perda</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {visibleClients.map((client) => (
                          <TableRow key={client.clientId} className="[&>td]:align-middle [&>td]:py-3"><TableCell className="font-mono text-xs leading-5">{client.clientId}</TableCell><TableCell><ChurnTypeBadges types={client.churnTypes} /></TableCell><TableCell className="min-w-56"><button type="button" onClick={() => setSelectedClient(client)} className="text-left font-medium leading-5 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Ver detalhes de ${client.clientName}`}>{client.clientName}</button>{client.unitName && <p className="text-xs leading-5 text-muted-foreground">{client.unitName}</p>}</TableCell><TableCell><div className="flex max-w-64 flex-wrap gap-1">{client.macroReasons.map((reason) => <Badge key={reason} variant="outline">{reason}</Badge>)}</div></TableCell><TableCell><div className="max-w-md space-y-1">{client.services.map((service) => <p key={service} className="text-sm">{service}</p>)}</div></TableCell><TableCell className="text-right font-medium leading-5">{formatCurrency(client.cancellationValue)}</TableCell></TableRow>
                        ))}
                        {!visibleClients.length && <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Nenhum cliente encontrado.</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </div> : (
                    <div className="space-y-3">
                      {groupedVisibleClients.map((group) => (
                        <details key={group.reason} open className="group rounded-lg border">
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40">
                            <div><p className="font-medium">{group.reason}</p><p className="text-xs text-muted-foreground">{group.clients.length} cliente(s) nesta página</p></div>
                            <div className="flex items-center gap-3"><span className="font-medium">{formatCurrency(group.value)}</span><ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" /></div>
                          </summary>
                          <div className="overflow-x-auto border-t">
                            <Table><TableHeader><TableRow><TableHead>ID</TableHead><TableHead className="w-32">Tipo</TableHead><TableHead>Cliente</TableHead><TableHead>Serviços</TableHead><TableHead className="text-right">Valor da Perda</TableHead></TableRow></TableHeader>
                              <TableBody>{group.clients.map((client) => (
                                <TableRow key={`${group.reason}-${client.clientId}`} className="[&>td]:align-middle [&>td]:py-3"><TableCell className="font-mono text-xs leading-5">{client.clientId}</TableCell><TableCell><ChurnTypeBadges types={client.churnTypes} /></TableCell><TableCell className="min-w-56"><button type="button" onClick={() => setSelectedClient(client)} className="text-left font-medium leading-5 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Ver detalhes de ${client.clientName}`}>{client.clientName}</button>{client.unitName && <p className="text-xs leading-5 text-muted-foreground">{client.unitName}</p>}</TableCell><TableCell><div className="max-w-md space-y-1">{client.services.map((service) => <p key={service} className="text-sm">{service}</p>)}</div></TableCell><TableCell className="text-right font-medium leading-5">{formatCurrency(client.cancellationValue)}</TableCell></TableRow>
                              ))}</TableBody>
                            </Table>
                          </div>
                        </details>
                      ))}
                      {!groupedVisibleClients.length && <div className="py-10 text-center text-sm text-muted-foreground">Nenhum cliente encontrado.</div>}
                    </div>
                  )}
                  <div className="mt-4 flex flex-col gap-3 border-t pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                    <span>{filteredClients.length} cliente(s)</span>
                    <div className="flex flex-wrap items-center gap-2">
                      <span>Registros por página</span>
                      <Select value={String(clientPageSize)} onValueChange={(value) => setClientPageSize(Number(value))}>
                        <SelectTrigger className="h-9 w-20" aria-label="Registros por página"><SelectValue /></SelectTrigger>
                        <SelectContent>{[10, 20, 50, 100].map((size) => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}</SelectContent>
                      </Select>
                      <Button variant="outline" size="icon" disabled={clientPage === 0} onClick={() => setClientPage((page) => page - 1)}><ChevronLeft className="h-4 w-4" /><span className="sr-only">Página anterior</span></Button>
                      <span>Página {clientPage + 1} de {clientPageCount}</span>
                      <Button variant="outline" size="icon" disabled={clientPage + 1 >= clientPageCount} onClick={() => setClientPage((page) => page + 1)}><ChevronRight className="h-4 w-4" /><span className="sr-only">Próxima página</span></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      <Dialog open={Boolean(selectedClient)} onOpenChange={(open) => !open && setSelectedClient(null)}>
        <DialogContent className="max-h-[90vh] overflow-hidden p-0 sm:max-w-6xl">
          {selectedClient && (
            <>
              <DialogHeader className="border-b px-6 py-5 pr-12">
                <DialogTitle>{selectedClient.clientName}</DialogTitle>
                <DialogDescription>
                  Cliente {selectedClient.clientId} · detalhamento consolidado da competência selecionada
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-[calc(90vh-96px)] space-y-6 overflow-y-auto px-6 pb-6">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground">Valor total da perda</p>
                    <p className="mt-1 text-lg font-semibold">{formatCurrency(selectedClient.cancellationValue)}</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground">Serviços detalhados</p>
                    <p className="mt-1 text-lg font-semibold">{selectedClient.records.length}</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground">Unidades</p>
                    <p className="mt-1 text-lg font-semibold">{selectedClient.unitNames.length}</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground">Data mais recente</p>
                    <p className="mt-1 text-lg font-semibold">{formatDate(selectedClient.cancellationDate)}</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Tipo</p>
                    <ChurnTypeBadges types={selectedClient.churnTypes} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Unidades</p>
                    <div className="flex flex-wrap gap-1">{selectedClient.unitNames.map((unit) => <Badge key={unit} variant="outline">{unit}</Badge>)}</div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Macromotivos</p>
                    <div className="flex flex-wrap gap-1">{selectedClient.macroReasons.map((reason) => <Badge key={reason} variant="outline">{reason}</Badge>)}</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <h3 className="font-medium">Serviços e observações</h3>
                    <p className="text-sm text-muted-foreground">Cada linha preserva o detalhamento original do arquivo-filho.</p>
                  </div>
                  <div className="space-y-3">
                    {selectedClient.records.map((record) => (
                      <article key={record.id} className="overflow-hidden rounded-lg border bg-card">
                        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-[minmax(180px,1.4fr)_minmax(120px,0.8fr)_minmax(180px,1fr)_auto]">
                          <div className="space-y-2">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Serviço/Produto</p>
                            <p className="font-medium leading-5">{record.service_product || "Não informado"}</p>
                            <ChurnTypeBadges types={record.churn_type ? [record.churn_type] : []} />
                          </div>
                          <div className="space-y-2">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Unidade</p>
                            <p className="text-sm">{record.unit_name || "Não informada"}</p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Motivo</p>
                            <p className="text-sm">{record.cancellation_reason || "Não informado"}</p>
                            <p className="text-xs text-muted-foreground">{record.macro_reason}</p>
                          </div>
                          <div className="space-y-2 lg:text-right">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Data e valor da perda</p>
                            <p className="whitespace-nowrap text-sm">{formatDate(record.cancellation_date)}</p>
                            <p className="whitespace-nowrap font-semibold">{formatCurrency(Number(record.cancellation_value) || 0)}</p>
                          </div>
                        </div>
                        <div className="border-t bg-muted/30 p-4">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Observação</p>
                          <p className="whitespace-pre-wrap break-words text-sm leading-6">
                            {record.observation || <span className="italic text-muted-foreground">Sem observação</span>}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Nova importação</CardTitle>
            <CardDescription>O percentual e os filtros do relatório original não serão importados.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="max-w-xs space-y-2">
              <Label htmlFor="churn-competence">Competência</Label>
              <Input ref={competenceInput} id="churn-competence" type="month" value={competence} onChange={(event) => setCompetence(event.target.value)} disabled={saving} />
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
