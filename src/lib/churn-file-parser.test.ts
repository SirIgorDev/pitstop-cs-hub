/// <reference types="node" />

import assert from "node:assert/strict";
import test from "node:test";
import { parseChurnDetailMatrix, parseChurnSummaryMatrix } from "./churn-file-parser.ts";

test("lê o resumo e ignora percentual, total e filtros", () => {
  const result = parseChurnSummaryMatrix([
    ["Macromotivos", "Churn (R$)", "Churn (Qtd)", "Churn (%)"],
    ["Motivos Financeiros", 58256.91, 102, 0.63],
    ["Total", 58256.91, 102, 1],
    ["Filtros aplicados: Ano é 2026"],
  ]);
  assert.deepEqual(result.rows, [
    { sourceRow: 2, macroReason: "Motivos Financeiros", churnValue: 58256.91, churnQuantity: 102 },
  ]);
});

test("lê o arquivo-filho e preserva serviços repetidos do mesmo cliente", () => {
  const matrix = [
    [
      "ID Cliente", "Cliente", "Unidade", "Aquisição", "Modalidade", "Mercado",
      "Servico/Produto", "Plano", "Data Cancelamento", "Macromotivos",
      "Motivo Cancelamento", "Valor Cancelamento", "Tipo Receita", "Churn / Downgrade",
      "Status", "OBS",
    ],
    [270905, "JAVILA", "UNF RECIFE", 40347, "Assinatura", "CONTÁBIL", "Fortes Fiscal", "SEM PLANO", 46216, "Motivos Financeiros", "Inadimplência", 99.96, "MRR", "Churn", "Inativo", "Cliente solicitou retorno"],
    [270905, "JAVILA", "UNF RECIFE", 40347, "Assinatura", "CONTÁBIL", "Fortes Pessoal", "SEM PLANO", 46216, "Motivos Financeiros", "Inadimplência", 99.97, "MRR", "Churn", "Inativo", ""],
  ];
  const result = parseChurnDetailMatrix(matrix);
  assert.equal(result.macroReason, "Motivos Financeiros");
  assert.equal(result.rows.length, 2);
  assert.deepEqual(result.rows.map((row) => row.serviceProduct), ["Fortes Fiscal", "Fortes Pessoal"]);
  assert.equal(result.rows[0].cancellationDate, "2026-07-13");
  assert.equal(result.rows[0].observation, "Cliente solicitou retorno");
});

test("aceita a coluna Observações no arquivo-filho", () => {
  const result = parseChurnDetailMatrix([
    ["ID Cliente", "Cliente", "Servico/Produto", "Data Cancelamento", "Macromotivos", "Observações"],
    [1, "CLIENTE A", "Produto A", "01/07/2026", "Financeiro", "Negociação em andamento"],
  ]);

  assert.equal(result.rows[0].observation, "Negociação em andamento");
});

test("recusa arquivo-filho com mais de um macromotivo", () => {
  assert.throws(
    () => parseChurnDetailMatrix([
      ["ID Cliente", "Cliente", "Servico/Produto", "Data Cancelamento", "Macromotivos"],
      [1, "A", "Produto A", "01/07/2026", "Financeiro"],
      [2, "B", "Produto B", "02/07/2026", "Produto"],
    ]),
    { message: "Cada arquivo-filho deve conter somente um macromotivo" },
  );
});
