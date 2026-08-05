import type { RawBaseRow } from "./base-processing.ts";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";

type CellValue = string | number | boolean | Date | null | undefined;

export interface ParsedBaseFile {
  headers: string[];
  rows: RawBaseRow[];
  format: "csv" | "xlsx";
}

const MAX_FILE_SIZE = 25 * 1024 * 1024;

function excelColumnName(index: number): string {
  let value = index + 1;
  let result = "";
  while (value > 0) {
    value -= 1;
    result = String.fromCharCode(65 + (value % 26)) + result;
    value = Math.floor(value / 26);
  }
  return result;
}

function excelColumnIndex(reference: string): number {
  const letters = reference.match(/^[A-Z]+/i)?.[0]?.toUpperCase() ?? "";
  return [...letters].reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

export function repairWorksheetXmlReferences(xml: string): string {
  let fallbackRow = 0;
  let maxRow = 0;
  let maxColumn = 0;
  const source = xml.replace(/<(?:[A-Za-z_][\w.-]*:)?row\b[^>]*\/\s*>/g, "");

  const repaired = source.replace(
    /<((?:[A-Za-z_][\w.-]*:)?row)\b([^>]*)>([\s\S]*?)<\/\1>/g,
    (rowXml, rowTag: string, rowAttributes: string, rowContent: string) => {
      const explicitRow = rowAttributes.match(/\br\s*=\s*["'](\d+)["']/)?.[1];
      const rowNumber = explicitRow ? Number(explicitRow) : fallbackRow + 1;
      fallbackRow = rowNumber;
      maxRow = Math.max(maxRow, rowNumber);
      let nextColumn = 0;

      const repairedContent = rowContent.replace(
        /<((?:[A-Za-z_][\w.-]*:)?c)\b([^>]*)>/g,
        (cellXml, cellTag: string, rawAttributes: string) => {
          const selfClosing = rawAttributes.trimEnd().endsWith("/");
          const cellAttributes = selfClosing ? rawAttributes.trimEnd().slice(0, -1) : rawAttributes;
          const explicitReference = cellAttributes.match(/\br\s*=\s*["']([^"']+)["']/)?.[1];
          if (explicitReference) nextColumn = Math.max(excelColumnIndex(explicitReference), 0);
          const reference = explicitReference ?? `${excelColumnName(nextColumn)}${rowNumber}`;
          maxColumn = Math.max(maxColumn, nextColumn + 1);
          nextColumn += 1;
          if (explicitReference) return cellXml;
          return `<${cellTag}${cellAttributes} r="${reference}"${selfClosing ? " /" : ""}>`;
        },
      );

      const attributes = explicitRow ? rowAttributes : `${rowAttributes} r="${rowNumber}"`;
      return `<${rowTag}${attributes}>${repairedContent}</${rowTag}>`;
    },
  );

  if (/<(?:[A-Za-z_][\w.-]*:)?dimension\b/.test(repaired) || !maxRow || !maxColumn) {
    return repaired;
  }

  return repaired.replace(
    /<((?:[A-Za-z_][\w.-]*:)?worksheet)\b([^>]*)>/,
    (worksheetXml, worksheetTag: string) => {
      const prefix = worksheetTag.includes(":") ? `${worksheetTag.split(":")[0]}:` : "";
      return `${worksheetXml}<${prefix}dimension ref="A1:${excelColumnName(maxColumn - 1)}${maxRow}" />`;
    },
  );
}

export function repairXlsxCellReferences(buffer: ArrayBuffer): Uint8Array {
  const files = unzipSync(new Uint8Array(buffer));
  for (const [path, contents] of Object.entries(files)) {
    if (!/^xl\/worksheets\/[^/]+\.xml$/i.test(path)) continue;
    files[path] = strToU8(repairWorksheetXmlReferences(strFromU8(contents)));
  }
  return zipSync(files);
}

const HEADER_ALIASES = {
  documento: ["cpfcnpj", "documento", "cpf", "cnpj"],
  empresa: ["empresa", "cliente", "razaosocial"],
  representante: ["representante", "nome", "contato"],
  email: ["email", "correioeletronico"],
  telefone1: ["telefone1", "fone1", "celular1"],
  telefone2: ["telefone2", "fone2", "celular2"],
  telefone3: ["whatsapp", "numerowhatsapp", "telefonewhatsapp", "telefone3", "fone3", "celular3"],
} as const;

function normalizeHeader(value: CellValue): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function cellToText(value: CellValue): string {
  if (value instanceof Date) return value.toISOString();
  return String(value ?? "").trim();
}

function documentCellToText(value: CellValue): string {
  const text = cellToText(value);
  if (typeof value !== "number" || !Number.isSafeInteger(value)) return text;
  if (text.length === 10) return text.padStart(11, "0");
  if (text.length === 13) return text.padStart(14, "0");
  return text;
}

function countDelimiter(line: string, delimiter: string): number {
  let count = 0;
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (!quoted && character === delimiter) {
      count += 1;
    }
  }

  return count;
}

function detectDelimiter(text: string): string {
  const firstLine = text.replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0] ?? "";
  return [",", ";", "\t"].reduce((best, candidate) =>
    countDelimiter(firstLine, candidate) > countDelimiter(firstLine, best) ? candidate : best,
  );
}

export function parseCsvText(text: string): string[][] {
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const source = text.replace(/^\uFEFF/, "");

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];

    if (character === '"') {
      if (quoted && source[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (!quoted && character === delimiter) {
      row.push(cell);
      cell = "";
      continue;
    }

    if (!quoted && (character === "\n" || character === "\r")) {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += character;
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function findColumn(headers: string[], aliases: readonly string[]): number {
  return headers.findIndex((header) => aliases.includes(header));
}

export function parseBaseMatrix(matrix: CellValue[][]): Omit<ParsedBaseFile, "format"> {
  const headerRowIndex = matrix.findIndex((row) => row.some((cell) => cellToText(cell)));
  if (headerRowIndex < 0) throw new Error("A planilha está vazia");

  const visibleHeaders = matrix[headerRowIndex].map(cellToText);
  const normalizedHeaders = matrix[headerRowIndex].map(normalizeHeader);
  const columns = {
    documento: findColumn(normalizedHeaders, HEADER_ALIASES.documento),
    empresa: findColumn(normalizedHeaders, HEADER_ALIASES.empresa),
    representante: findColumn(normalizedHeaders, HEADER_ALIASES.representante),
    email: findColumn(normalizedHeaders, HEADER_ALIASES.email),
    telefone1: findColumn(normalizedHeaders, HEADER_ALIASES.telefone1),
    telefone2: findColumn(normalizedHeaders, HEADER_ALIASES.telefone2),
    telefone3: findColumn(normalizedHeaders, HEADER_ALIASES.telefone3),
  };

  if (columns.documento < 0) {
    throw new Error("Não foi encontrada a coluna CPF/CNPJ");
  }
  if (columns.telefone1 < 0 && columns.telefone2 < 0 && columns.telefone3 < 0) {
    throw new Error("Não foi encontrada nenhuma coluna de telefone");
  }

  const valueAt = (row: CellValue[], column: number) => (column < 0 ? "" : cellToText(row[column]));

  const rows = matrix
    .slice(headerRowIndex + 1)
    .map(
      (source, index): RawBaseRow => ({
        sourceRow: headerRowIndex + index + 2,
        documento: columns.documento < 0 ? "" : documentCellToText(source[columns.documento]),
        empresa: valueAt(source, columns.empresa),
        representante: valueAt(source, columns.representante),
        email: valueAt(source, columns.email),
        telefone1: valueAt(source, columns.telefone1),
        telefone2: valueAt(source, columns.telefone2),
        telefone3: valueAt(source, columns.telefone3),
      }),
    )
    .filter((row) =>
      [
        row.documento,
        row.empresa,
        row.representante,
        row.email,
        row.telefone1,
        row.telefone2,
        row.telefone3,
      ].some((value) => String(value ?? "").trim()),
    );

  if (!rows.length) throw new Error("A planilha não possui registros para processar");

  return { headers: visibleHeaders, rows };
}

export async function parseBaseFile(file: File): Promise<ParsedBaseFile> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("O arquivo deve ter no máximo 25 MB");
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "csv") {
    const parsed = parseBaseMatrix(parseCsvText(await file.text()));
    return { ...parsed, format: "csv" };
  }

  if (extension === "xlsx") {
    const { readSheet } = await import("read-excel-file/browser");
    let matrix: CellValue[][];
    try {
      matrix = (await readSheet(file)) as unknown as CellValue[][];
    } catch {
      const repaired = repairXlsxCellReferences(await file.arrayBuffer());
      const repairedBuffer = new ArrayBuffer(repaired.byteLength);
      new Uint8Array(repairedBuffer).set(repaired);
      const repairedFile = new File([repairedBuffer], file.name, { type: file.type });
      matrix = (await readSheet(repairedFile)) as unknown as CellValue[][];
    }
    const parsed = parseBaseMatrix(matrix);
    return { ...parsed, format: "xlsx" };
  }

  throw new Error("Formato não suportado. Envie um arquivo CSV ou XLSX");
}
