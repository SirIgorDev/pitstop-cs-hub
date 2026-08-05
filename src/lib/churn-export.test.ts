/// <reference types="node" />

import assert from "node:assert/strict";
import test from "node:test";
import { buildConsolidatedChurnCsv } from "./churn-export.ts";

test("exporta um cliente com múltiplos serviços em uma única linha", () => {
  const csv = buildConsolidatedChurnCsv([{
    clientId: "270905",
    clientName: "JAVILA BESERRA DE MELO",
    unitName: "UNF RECIFE",
    macroReasons: ["Motivos Financeiros"],
    services: ["Fortes Fiscal", "Fortes Pessoal"],
    cancellationReasons: ["Inadimplência"],
    cancellationValue: 199.93,
    cancellationDate: "2026-07-13",
  }]);

  const lines = csv.split("\r\n");
  assert.equal(lines.length, 2);
  assert.match(lines[1], /Fortes Fiscal \| Fortes Pessoal/);
  assert.match(lines[1], /199,93/);
  assert.match(lines[1], /13\/07\/2026/);
});

test("protege separadores e aspas no conteúdo", () => {
  const csv = buildConsolidatedChurnCsv([{
    clientId: "1",
    clientName: 'Empresa; "Teste"',
    unitName: "",
    macroReasons: [],
    services: [],
    cancellationReasons: [],
    cancellationValue: 0,
    cancellationDate: null,
  }]);
  assert.match(csv, /"Empresa; ""Teste"""/);
});
