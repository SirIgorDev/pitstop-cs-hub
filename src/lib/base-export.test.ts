/// <reference types="node" />

import assert from "node:assert/strict";
import test from "node:test";

import { buildBaseCsv } from "./base-export.ts";
import { parseCsvText } from "./base-file-parser.ts";

test("gera CSV final com exatamente cinco colunas", () => {
  const csv = buildBaseCsv([
    {
      document_normalized: "52998224725",
      client_name: "Cliente",
      contact_name: "  iGoR   MOTA  ",
      email: "igor@example.com",
      whatsapp: "85999999999",
    },
  ]);
  const matrix = parseCsvText(csv);

  assert.deepEqual(matrix[0], ["CPF/CNPJ", "Cliente", "Nome", "Email", "Whatsapp"]);
  assert.equal(matrix[0]?.length, 5);
  assert.equal(matrix[1]?.length, 5);
  assert.equal(matrix[1]?.[2], "Igor Mota");
});
