export type ConsolidatedChurnExportRow = {
  clientId: string;
  clientName: string;
  unitName: string;
  macroReasons: string[];
  services: string[];
  cancellationReasons: string[];
  cancellationValue: number;
  cancellationDate: string | null;
};

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function brazilianDate(value: string | null) {
  if (!value) return "";
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

export function buildConsolidatedChurnCsv(rows: ConsolidatedChurnExportRow[]) {
  const header = [
    "ID Cliente",
    "Cliente",
    "Unidade",
    "Macromotivos",
    "Serviços/Produtos",
    "Motivos de Cancelamento",
    "Valor de Cancelamento",
    "Data de Cancelamento",
  ];
  const body = rows.map((row) => [
    row.clientId,
    row.clientName,
    row.unitName,
    row.macroReasons.join(" | "),
    row.services.join(" | "),
    row.cancellationReasons.join(" | "),
    row.cancellationValue.toFixed(2).replace(".", ","),
    brazilianDate(row.cancellationDate),
  ]);
  return `\uFEFF${[header, ...body].map((row) => row.map(csvCell).join(";")).join("\r\n")}`;
}
