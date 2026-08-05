/// <reference types="node" />

import assert from "node:assert/strict";
import test from "node:test";

import { parseBaseMatrix, parseCsvText, repairWorksheetXmlReferences } from "./base-file-parser.ts";

test("interpreta CSV com vírgula, aspas e quebra de linha", () => {
  const matrix = parseCsvText(
    "CPF/CNPJ,EMPRESA,REPRESENTANTE,E-MAIL,TELEFONE 3\r\n" +
      '06219749000100,"Empresa, Contábil",Marcela,contato@example.com,71991544438\r\n',
  );

  assert.deepEqual(matrix[1], [
    "06219749000100",
    "Empresa, Contábil",
    "Marcela",
    "contato@example.com",
    "71991544438",
  ]);
});

test("reconhece cabeçalhos da origem e preserva a linha original", () => {
  const parsed = parseBaseMatrix([
    ["CPF/CNPJ", "EMPRESA", "REPRESENTANTE", "E-MAIL", "TELEFONE 1", "TELEFONE 3"],
    ["06.219.749/0001-00", "DIRECONT", "Marcela", "email-invalido", "7136275233", "71991544438"],
  ]);

  assert.equal(parsed.rows.length, 1);
  assert.deepEqual(parsed.rows[0], {
    sourceRow: 2,
    documento: "06.219.749/0001-00",
    empresa: "DIRECONT",
    representante: "Marcela",
    email: "email-invalido",
    telefone1: "7136275233",
    telefone2: "",
    telefone3: "71991544438",
  });
});

test("aceita o layout final como fonte quando há Whatsapp", () => {
  const parsed = parseBaseMatrix([
    ["CPF / CNPJ", "Cliente", "Nome", "Email", "Whatsapp"],
    ["52998224725", "Cliente", "Contato", "contato@example.com", "85999999999"],
  ]);

  assert.equal(parsed.rows[0]?.telefone3, "85999999999");
});

test("trata a coluna Whatsapp da origem como Telefone 3 prioritário", () => {
  const parsed = parseBaseMatrix([
    ["CPF/CNPJ", "EMPRESA", "NOME", "TELEFONE 1", "WHATSAPP"],
    ["52998224725", "Cliente", "IGOR MOTA", "8532735150", "85999999999"],
  ]);

  assert.equal(parsed.rows[0]?.telefone1, "8532735150");
  assert.equal(parsed.rows[0]?.telefone3, "85999999999");
});

test("restaura o zero inicial perdido em documento numérico do Excel", () => {
  const parsed = parseBaseMatrix([
    ["CPF/CNPJ", "TELEFONE 3"],
    [6219749000100, "71991544438"],
  ]);

  assert.equal(parsed.rows[0]?.documento, "06219749000100");
});

test("repara XLSX exportado sem referencias de linha e coluna", () => {
  const xml =
    '<?xml version="1.0"?><x:worksheet xmlns:x="urn:test"><x:sheetData>' +
    '<x:row><x:c t="inlineStr"><x:is><x:t>CPF / CNPJ</x:t></x:is></x:c>' +
    '<x:c t="inlineStr"><x:is><x:t>Whatsapp</x:t></x:is></x:c></x:row>' +
    '<x:row><x:c t="inlineStr"><x:is><x:t>01145783384</x:t></x:is></x:c>' +
    "<x:c><x:v>88996971242</x:v></x:c></x:row>" +
    "</x:sheetData></x:worksheet>";

  const repaired = repairWorksheetXmlReferences(xml);

  assert.match(repaired, /<x:dimension ref="A1:B2"/);
  assert.match(repaired, /<x:row r="1">/);
  assert.match(repaired, /<x:c t="inlineStr" r="A1">/);
  assert.match(repaired, /<x:c r="B2">/);
  assert.equal(repairWorksheetXmlReferences(repaired), repaired);
});

test("recusa arquivo sem documento ou telefone", () => {
  assert.throws(
    () =>
      parseBaseMatrix([
        ["EMPRESA", "TELEFONE 3"],
        ["Cliente", "85999999999"],
      ]),
    {
      message: "Não foi encontrada a coluna CPF/CNPJ",
    },
  );
  assert.throws(
    () =>
      parseBaseMatrix([
        ["CPF/CNPJ", "EMPRESA"],
        ["52998224725", "Cliente"],
      ]),
    {
      message: "Não foi encontrada nenhuma coluna de telefone",
    },
  );
});
