export type PhoneSource = "telefone3" | "telefone1" | "telefone2";

export type PhoneStatus = "empty" | "invalid" | "fixed" | "valid_mobile";

export interface RawBaseRow {
  sourceRow?: number;
  documento: string | number | null | undefined;
  empresa: string | null | undefined;
  representante: string | null | undefined;
  email: string | null | undefined;
  telefone1: string | number | null | undefined;
  telefone2: string | number | null | undefined;
  telefone3: string | number | null | undefined;
}

export interface PhoneAnalysis {
  original: string;
  digits: string;
  normalized: string | null;
  status: PhoneStatus;
  addedNinthDigit: boolean;
}

export interface ProcessedBaseRow {
  documento: string;
  cliente: string;
  nome: string;
  email: string;
  whatsapp: string;
  phoneSource: PhoneSource;
  sourceRow: number;
}

export interface BaseProcessingMetrics {
  importedRows: number;
  validDocumentRows: number;
  invalidDocumentRows: number;
  uniqueValidDocuments: number;
  duplicateDocuments: number;
  duplicateRows: number;
  documentsWithoutWhatsapp: number;
  generatedRows: number;
  fixedPhoneCandidates: number;
  invalidPhoneCandidates: number;
  phonesWithAddedNinthDigit: number;
}

export interface BaseProcessingResult {
  rows: ProcessedBaseRow[];
  metrics: BaseProcessingMetrics;
}

interface AnalyzedRow {
  sourceRow: number;
  document: string;
  raw: RawBaseRow;
  phones: Record<PhoneSource, PhoneAnalysis>;
}

const PHONE_PRIORITY: PhoneSource[] = ["telefone3", "telefone1", "telefone2"];

const VALID_DDDS = new Set([
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
  "21",
  "22",
  "24",
  "27",
  "28",
  "31",
  "32",
  "33",
  "34",
  "35",
  "37",
  "38",
  "41",
  "42",
  "43",
  "44",
  "45",
  "46",
  "47",
  "48",
  "49",
  "51",
  "53",
  "54",
  "55",
  "61",
  "62",
  "63",
  "64",
  "65",
  "66",
  "67",
  "68",
  "69",
  "71",
  "73",
  "74",
  "75",
  "77",
  "79",
  "81",
  "82",
  "83",
  "84",
  "85",
  "86",
  "87",
  "88",
  "89",
  "91",
  "92",
  "93",
  "94",
  "95",
  "96",
  "97",
  "98",
  "99",
]);

function onlyDigits(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

function asText(value: unknown): string {
  return String(value ?? "").trim();
}

export function normalizePersonName(value: unknown): string {
  return asText(value)
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR")
    .replace(/(^|[\s'-])\p{L}/gu, (letter) => letter.toLocaleUpperCase("pt-BR"));
}

function allDigitsAreEqual(value: string): boolean {
  return /^(\d)\1+$/.test(value);
}

function calculateCpfDigit(base: string, initialWeight: number): number {
  const sum = [...base].reduce(
    (total, digit, index) => total + Number(digit) * (initialWeight - index),
    0,
  );
  const remainder = (sum * 10) % 11;
  return remainder === 10 ? 0 : remainder;
}

export function isValidCpf(value: unknown): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || allDigitsAreEqual(cpf)) return false;

  const firstDigit = calculateCpfDigit(cpf.slice(0, 9), 10);
  const secondDigit = calculateCpfDigit(cpf.slice(0, 10), 11);

  return cpf.endsWith(`${firstDigit}${secondDigit}`);
}

function calculateCnpjDigit(base: string, weights: number[]): number {
  const sum = [...base].reduce((total, digit, index) => total + Number(digit) * weights[index], 0);
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

export function isValidCnpj(value: unknown): boolean {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14 || allDigitsAreEqual(cnpj)) return false;

  const firstDigit = calculateCnpjDigit(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const secondDigit = calculateCnpjDigit(
    cnpj.slice(0, 13),
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );

  return cnpj.endsWith(`${firstDigit}${secondDigit}`);
}

export function normalizeDocument(value: unknown): string | null {
  const document = onlyDigits(value);
  if (isValidCpf(document) || isValidCnpj(document)) return document;
  return null;
}

export function analyzePhone(value: unknown): PhoneAnalysis {
  const original = asText(value);
  let digits = onlyDigits(value);

  if (!digits) {
    return {
      original,
      digits,
      normalized: null,
      status: "empty",
      addedNinthDigit: false,
    };
  }

  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    digits = digits.slice(2);
  }

  const ddd = digits.slice(0, 2);
  if (!VALID_DDDS.has(ddd)) {
    return {
      original,
      digits,
      normalized: null,
      status: "invalid",
      addedNinthDigit: false,
    };
  }

  if (digits.length === 11 && digits[2] === "9") {
    return {
      original,
      digits,
      normalized: digits,
      status: "valid_mobile",
      addedNinthDigit: false,
    };
  }

  if (digits.length === 10) {
    const subscriberFirstDigit = digits[2];

    if (subscriberFirstDigit >= "6" && subscriberFirstDigit <= "9") {
      const normalized = `${ddd}9${digits.slice(2)}`;
      return {
        original,
        digits,
        normalized,
        status: "valid_mobile",
        addedNinthDigit: true,
      };
    }

    if (subscriberFirstDigit >= "2" && subscriberFirstDigit <= "5") {
      return {
        original,
        digits,
        normalized: null,
        status: "fixed",
        addedNinthDigit: false,
      };
    }
  }

  return {
    original,
    digits,
    normalized: null,
    status: "invalid",
    addedNinthDigit: false,
  };
}

export function processBaseRows(rawRows: RawBaseRow[]): BaseProcessingResult {
  const analyzedRows: AnalyzedRow[] = [];
  let invalidDocumentRows = 0;
  let fixedPhoneCandidates = 0;
  let invalidPhoneCandidates = 0;
  let phonesWithAddedNinthDigit = 0;

  rawRows.forEach((raw, index) => {
    const document = normalizeDocument(raw.documento);
    if (!document) {
      invalidDocumentRows += 1;
      return;
    }

    const phones: Record<PhoneSource, PhoneAnalysis> = {
      telefone1: analyzePhone(raw.telefone1),
      telefone2: analyzePhone(raw.telefone2),
      telefone3: analyzePhone(raw.telefone3),
    };

    Object.values(phones).forEach((phone) => {
      if (phone.status === "fixed") fixedPhoneCandidates += 1;
      if (phone.status === "invalid") invalidPhoneCandidates += 1;
      if (phone.addedNinthDigit) phonesWithAddedNinthDigit += 1;
    });

    analyzedRows.push({
      sourceRow: raw.sourceRow ?? index + 2,
      document,
      raw,
      phones,
    });
  });

  const groups = new Map<string, AnalyzedRow[]>();
  analyzedRows.forEach((row) => {
    const group = groups.get(row.document) ?? [];
    group.push(row);
    groups.set(row.document, group);
  });

  const firstDocumentPositions = new Map<string, number>();
  analyzedRows.forEach((row, index) => {
    if (!firstDocumentPositions.has(row.document)) {
      firstDocumentPositions.set(row.document, index);
    }
  });

  const orderedGroups = [...groups.entries()].sort(
    ([left], [right]) =>
      (firstDocumentPositions.get(left) ?? 0) - (firstDocumentPositions.get(right) ?? 0),
  );

  const rows: ProcessedBaseRow[] = [];
  let documentsWithoutWhatsapp = 0;

  orderedGroups.forEach(([document, group]) => {
    let selected:
      | {
          row: AnalyzedRow;
          source: PhoneSource;
          phone: PhoneAnalysis;
        }
      | undefined;

    for (const source of PHONE_PRIORITY) {
      const row = group.find((candidate) => candidate.phones[source].status === "valid_mobile");
      if (row) {
        selected = { row, source, phone: row.phones[source] };
        break;
      }
    }

    if (!selected?.phone.normalized) {
      documentsWithoutWhatsapp += 1;
      return;
    }

    rows.push({
      documento: document,
      cliente: asText(selected.row.raw.empresa),
      nome: normalizePersonName(selected.row.raw.representante),
      email: asText(selected.row.raw.email),
      whatsapp: selected.phone.normalized,
      phoneSource: selected.source,
      sourceRow: selected.row.sourceRow,
    });
  });

  const duplicateGroups = [...groups.values()].filter((group) => group.length > 1);

  return {
    rows,
    metrics: {
      importedRows: rawRows.length,
      validDocumentRows: analyzedRows.length,
      invalidDocumentRows,
      uniqueValidDocuments: groups.size,
      duplicateDocuments: duplicateGroups.length,
      duplicateRows: duplicateGroups.reduce((total, group) => total + group.length - 1, 0),
      documentsWithoutWhatsapp,
      generatedRows: rows.length,
      fixedPhoneCandidates,
      invalidPhoneCandidates,
      phonesWithAddedNinthDigit,
    },
  };
}
