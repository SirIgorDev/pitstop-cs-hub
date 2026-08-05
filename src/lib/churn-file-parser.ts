import { readSheet } from "read-excel-file/browser";
import { repairXlsxCellReferences } from "./base-file-parser.ts";

type CellValue = string | number | boolean | Date | null | undefined;

export type ChurnSummaryRow = {
  sourceRow: number;
  macroReason: string;
  churnValue: number;
  churnQuantity: number;
};

export type ChurnDetailRow = {
  sourceRow: number;
  clientId: string;
  clientName: string;
  unitName: string;
  acquisitionDate: string | null;
  modality: string;
  market: string;
  serviceProduct: string;
  planName: string;
  cancellationDate: string | null;
  macroReason: string;
  cancellationReason: string;
  cancellationValue: number;
  revenueType: string;
  churnType: string;
  clientStatus: string;
  observation: string;
};

export type ParsedChurnSummary = {
  kind: "summary";
  headers: string[];
  rows: ChurnSummaryRow[];
};

export type ParsedChurnDetail = {
  kind: "detail";
  headers: string[];
  macroReason: string;
  rows: ChurnDetailRow[];
};

const MAX_FILE_SIZE = 25 * 1024 * 1024;

const SUMMARY_ALIASES = {
  macroReason: ["macromotivos", "macromotivo"],
  churnValue: ["churnr", "valorchurn"],
  churnQuantity: ["churnqtd", "quantidadechurn", "qtdchurn"],
} as const;

const DETAIL_ALIASES = {
  clientId: ["idcliente", "codigocliente", "clienteid"],
  clientName: ["cliente", "nomecliente"],
  unitName: ["unidade"],
  acquisitionDate: ["aquisicao", "dataaquisicao"],
  modality: ["modalidade"],
  market: ["mercado"],
  serviceProduct: ["servicoproduto", "produto", "servico"],
  planName: ["plano"],
  cancellationDate: ["datacancelamento", "cancelamentoem"],
  macroReason: ["macromotivos", "macromotivo"],
  cancellationReason: ["motivocancelamento", "motivo"],
  cancellationValue: ["valorcancelamento", "churnr"],
  revenueType: ["tiporeceita"],
  churnType: ["churndowngrade", "tipochurn"],
  clientStatus: ["status", "statuscliente"],
  observation: ["obs", "observacao", "observacoes"],
} as const;

function text(value: CellValue): string {
  return String(value ?? "").trim();
}

function normalized(value: CellValue): string {
  return text(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function column(headers: string[], aliases: readonly string[]) {
  return headers.findIndex((header) => aliases.includes(header));
}

function numberValue(value: CellValue): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const raw = text(value).replace(/\s/g, "").replace(/^R\$/i, "");
  if (!raw) return null;
  const decimal = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw.replace(/,/g, "");
  const result = Number(decimal);
  return Number.isFinite(result) ? result : null;
}

function dateValue(value: CellValue): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(Date.UTC(1899, 11, 30 + value));
    return date.toISOString().slice(0, 10);
  }
  const raw = text(value);
  if (!raw) return null;
  const brazilian = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brazilian) {
    return `${brazilian[3]}-${brazilian[2].padStart(2, "0")}-${brazilian[1].padStart(2, "0")}`;
  }
  const iso = raw.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  return iso ?? null;
}

function headerRow(matrix: CellValue[][], requiredAliases: readonly (readonly string[])[]) {
  return matrix.findIndex((row) => {
    const headers = row.map(normalized);
    return requiredAliases.every((aliases) => aliases.some((alias) => headers.includes(alias)));
  });
}

export function parseChurnSummaryMatrix(matrix: CellValue[][]): ParsedChurnSummary {
  const index = headerRow(matrix, [
    SUMMARY_ALIASES.macroReason,
    SUMMARY_ALIASES.churnValue,
    SUMMARY_ALIASES.churnQuantity,
  ]);
  if (index < 0) {
    throw new Error("O arquivo-resumo não possui as colunas Macromotivos, Churn (R$) e Churn (Qtd)");
  }
  const visibleHeaders = matrix[index].map(text);
  const headers = matrix[index].map(normalized);
  const columns = {
    macroReason: column(headers, SUMMARY_ALIASES.macroReason),
    churnValue: column(headers, SUMMARY_ALIASES.churnValue),
    churnQuantity: column(headers, SUMMARY_ALIASES.churnQuantity),
  };

  const rows = matrix
    .slice(index + 1)
    .map((row, offset): ChurnSummaryRow | null => {
      const macroReason = text(row[columns.macroReason]);
      if (!macroReason || normalized(macroReason) === "total" || normalized(macroReason).startsWith("filtrosaplicados")) {
        return null;
      }
      const churnValue = numberValue(row[columns.churnValue]);
      const churnQuantity = numberValue(row[columns.churnQuantity]);
      if (churnValue === null || churnQuantity === null) return null;
      return { sourceRow: index + offset + 2, macroReason, churnValue, churnQuantity: Math.trunc(churnQuantity) };
    })
    .filter((row): row is ChurnSummaryRow => Boolean(row));

  if (!rows.length) throw new Error("O arquivo-resumo não possui macromotivos válidos");
  return { kind: "summary", headers: visibleHeaders, rows };
}

export function parseChurnDetailMatrix(matrix: CellValue[][]): ParsedChurnDetail {
  const required = [
    DETAIL_ALIASES.clientId,
    DETAIL_ALIASES.clientName,
    DETAIL_ALIASES.serviceProduct,
    DETAIL_ALIASES.cancellationDate,
    DETAIL_ALIASES.macroReason,
  ];
  const index = headerRow(matrix, required);
  if (index < 0) {
    throw new Error("O detalhamento não possui a estrutura esperada do relatório de churn");
  }
  const visibleHeaders = matrix[index].map(text);
  const headers = matrix[index].map(normalized);
  const columns = Object.fromEntries(
    Object.entries(DETAIL_ALIASES).map(([key, aliases]) => [key, column(headers, aliases)]),
  ) as Record<keyof typeof DETAIL_ALIASES, number>;
  const at = (row: CellValue[], key: keyof typeof DETAIL_ALIASES) =>
    columns[key] < 0 ? "" : text(row[columns[key]]);

  const rows = matrix
    .slice(index + 1)
    .map((row, offset): ChurnDetailRow | null => {
      const clientId = at(row, "clientId");
      const clientName = at(row, "clientName");
      const macroReason = at(row, "macroReason");
      if (!clientId && !clientName && !macroReason) return null;
      if (!clientId || !macroReason) return null;
      return {
        sourceRow: index + offset + 2,
        clientId,
        clientName,
        unitName: at(row, "unitName"),
        acquisitionDate: columns.acquisitionDate < 0 ? null : dateValue(row[columns.acquisitionDate]),
        modality: at(row, "modality"),
        market: at(row, "market"),
        serviceProduct: at(row, "serviceProduct"),
        planName: at(row, "planName"),
        cancellationDate:
          columns.cancellationDate < 0 ? null : dateValue(row[columns.cancellationDate]),
        macroReason,
        cancellationReason: at(row, "cancellationReason"),
        cancellationValue:
          columns.cancellationValue < 0 ? 0 : numberValue(row[columns.cancellationValue]) ?? 0,
        revenueType: at(row, "revenueType"),
        churnType: at(row, "churnType"),
        clientStatus: at(row, "clientStatus"),
        observation: at(row, "observation"),
      };
    })
    .filter((row): row is ChurnDetailRow => Boolean(row));

  if (!rows.length) throw new Error("O detalhamento não possui registros válidos");
  const reasons = [...new Set(rows.map((row) => normalized(row.macroReason)))];
  if (reasons.length !== 1) {
    throw new Error("Cada arquivo-filho deve conter somente um macromotivo");
  }
  return { kind: "detail", headers: visibleHeaders, macroReason: rows[0].macroReason, rows };
}

async function readMatrix(file: File): Promise<CellValue[][]> {
  if (file.size > MAX_FILE_SIZE) throw new Error("Cada arquivo deve ter no máximo 25 MB");
  if (file.name.split(".").pop()?.toLowerCase() !== "xlsx") {
    throw new Error("Envie arquivos no formato XLSX");
  }
  try {
    return (await readSheet(file)) as CellValue[][];
  } catch {
    const repaired = repairXlsxCellReferences(await file.arrayBuffer());
    const repairedBuffer = new ArrayBuffer(repaired.byteLength);
    new Uint8Array(repairedBuffer).set(repaired);
    return (await readSheet(new File([repairedBuffer], file.name, { type: file.type }))) as CellValue[][];
  }
}

export async function parseChurnSummaryFile(file: File) {
  return parseChurnSummaryMatrix(await readMatrix(file));
}

export async function parseChurnDetailFile(file: File) {
  return parseChurnDetailMatrix(await readMatrix(file));
}
