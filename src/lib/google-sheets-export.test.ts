/// <reference types="node" />

import assert from "node:assert/strict";
import test from "node:test";

import { createGoogleSpreadsheet } from "./google-sheets-export.ts";

test("cria, preenche e formata uma nova planilha Google", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, init });

    if (url === "https://sheets.googleapis.com/v4/spreadsheets") {
      return Response.json({
        spreadsheetId: "sheet-123",
        spreadsheetUrl: "https://docs.google.com/spreadsheets/d/sheet-123",
        sheets: [{ properties: { sheetId: 42 } }],
      });
    }
    return Response.json({});
  };

  try {
    const result = await createGoogleSpreadsheet("token-curto", "Base tratada", [
      ["CPF/CNPJ", "Cliente", "Nome", "Email", "Whatsapp"],
      ["52998224725", "Cliente", "Contato", "email@exemplo.com", "85999999999"],
    ]);

    assert.equal(result.spreadsheetId, "sheet-123");
    assert.equal(calls.length, 3);
    assert.match(calls[1]!.url, /values\/'Base%20tratada'!A1%3AE2/);
    assert.equal(new Headers(calls[0]!.init?.headers).get("Authorization"), "Bearer token-curto");
    const formatting = JSON.parse(String(calls[2]!.init?.body));
    assert.equal(formatting.requests[0].repeatCell.range.sheetId, 42);
    assert.equal(formatting.requests[1].autoResizeDimensions.dimensions.sheetId, 42);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
