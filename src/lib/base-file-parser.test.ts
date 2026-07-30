/// <reference types="node" />

import assert from "node:assert/strict";
import test from "node:test";

import { parseBaseMatrix, parseCsvText } from "./base-file-parser.ts";

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

test("restaura o zero inicial perdido em documento numérico do Excel", () => {
  const parsed = parseBaseMatrix([
    ["CPF/CNPJ", "TELEFONE 3"],
    [6219749000100, "71991544438"],
  ]);

  assert.equal(parsed.rows[0]?.documento, "06219749000100");
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
