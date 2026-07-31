import { normalizePersonName } from "./base-processing.ts";

export interface ExportBaseRow {
  document_normalized: string | null;
  client_name: string;
  contact_name: string;
  email: string;
  whatsapp: string | null;
}

const EXPORT_HEADERS = ["CPF/CNPJ", "Cliente", "Nome", "Email", "Whatsapp"] as const;

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

export function buildBaseCsv(rows: ExportBaseRow[]): string {
  const lines = [
    [...EXPORT_HEADERS],
    ...rows.map((row) => [
      row.document_normalized ?? "",
      row.client_name,
      normalizePersonName(row.contact_name),
      row.email,
      row.whatsapp ?? "",
    ]),
  ];

  return `\uFEFF${lines.map((line) => line.map(csvCell).join(";")).join("\r\n")}`;
}
