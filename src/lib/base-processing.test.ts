/// <reference types="node" />

import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzePhone,
  isValidCnpj,
  isValidCpf,
  normalizeDocument,
  normalizePersonName,
  processBaseRows,
  type RawBaseRow,
} from "./base-processing.ts";

const validCnpj = "06.219.749/0001-00";
const validCpf = "529.982.247-25";

function row(overrides: Partial<RawBaseRow> = {}): RawBaseRow {
  return {
    documento: validCnpj,
    empresa: "Cliente",
    representante: "Representante",
    email: "contato@exemplo.com",
    telefone1: "",
    telefone2: "",
    telefone3: "",
    ...overrides,
  };
}

test("valida e normaliza CPF e CNPJ preservando zeros", () => {
  assert.equal(isValidCpf(validCpf), true);
  assert.equal(isValidCnpj(validCnpj), true);
  assert.equal(normalizeDocument(validCpf), "52998224725");
  assert.equal(normalizeDocument(validCnpj), "06219749000100");
  assert.equal(normalizeDocument("111.111.111-11"), null);
  assert.equal(normalizeDocument("06.219.749/0001-01"), null);
});

test("remove o código 55 sem devolvê-lo no WhatsApp", () => {
  assert.deepEqual(analyzePhone("+55 (85) 99999-9999"), {
    original: "+55 (85) 99999-9999",
    digits: "85999999999",
    normalized: "85999999999",
    status: "valid_mobile",
    addedNinthDigit: false,
  });
});

test("adiciona o nono dígito somente a celular antigo", () => {
  assert.equal(analyzePhone("(85) 8876-5432").normalized, "85988765432");
  assert.equal(analyzePhone("(85) 8876-5432").addedNinthDigit, true);

  const fixed = analyzePhone("(85) 3273-5150");
  assert.equal(fixed.status, "fixed");
  assert.equal(fixed.normalized, null);
});

test("normaliza nomes com iniciais maiúsculas", () => {
  assert.equal(normalizePersonName("IGOR MOTA"), "Igor Mota");
  assert.equal(normalizePersonName("  mArIa   dA silVA  "), "Maria Da Silva");
  assert.equal(normalizePersonName("JOÃO-PEDRO D'ÁVILA"), "João-Pedro D'Ávila");
});

test("prioriza Telefone 3 em todo o grupo duplicado", () => {
  const result = processBaseRows([
    row({
      representante: "Primeiro contato",
      telefone1: "85988887777",
    }),
    row({
      representante: "Contato do telefone 3",
      email: "outro-email-invalido",
      telefone3: "85999996666",
    }),
  ]);

  assert.equal(result.rows.length, 1);
  assert.deepEqual(result.rows[0], {
    documento: "06219749000100",
    cliente: "Cliente",
    nome: "Contato Do Telefone 3",
    email: "outro-email-invalido",
    whatsapp: "85999996666",
    phoneSource: "telefone3",
    sourceRow: 3,
  });
  assert.equal(result.metrics.duplicateDocuments, 1);
  assert.equal(result.metrics.duplicateRows, 1);
});

test("usa a primeira ocorrência quando a prioridade é a mesma", () => {
  const result = processBaseRows([
    row({ representante: "Primeiro", telefone3: "85999991111" }),
    row({ representante: "Segundo", telefone3: "85999992222" }),
  ]);

  assert.equal(result.rows[0]?.nome, "Primeiro");
  assert.equal(result.rows[0]?.whatsapp, "85999991111");
});

test("descarta documento inválido e documento sem celular", () => {
  const result = processBaseRows([
    row({ documento: "111.111.111-11", telefone3: "85999991111" }),
    row({ documento: validCpf, telefone1: "8532735150" }),
  ]);

  assert.equal(result.rows.length, 0);
  assert.equal(result.metrics.importedRows, 2);
  assert.equal(result.metrics.invalidDocumentRows, 1);
  assert.equal(result.metrics.documentsWithoutWhatsapp, 1);
  assert.equal(result.metrics.fixedPhoneCandidates, 1);
});

test("gera uma linha por documento no layout final", () => {
  const result = processBaseRows([
    row({
      empresa: "DIRECONT ASSESSORIA",
      representante: "MARCELA",
      email: "email-invalido",
      telefone3: "71991544438",
    }),
    row({
      empresa: "DIRECONT ASSESSORIA",
      representante: "Outro",
      telefone2: "71999990000",
    }),
  ]);

  assert.deepEqual(
    result.rows.map(({ documento, cliente, nome, email, whatsapp }) => ({
      "CPF / CNPJ": documento,
      Cliente: cliente,
      Nome: nome,
      Email: email,
      Whatsapp: whatsapp,
    })),
    [
      {
        "CPF / CNPJ": "06219749000100",
        Cliente: "DIRECONT ASSESSORIA",
        Nome: "Marcela",
        Email: "email-invalido",
        Whatsapp: "71991544438",
      },
    ],
  );
  assert.equal(result.metrics.generatedRows, 1);
});
