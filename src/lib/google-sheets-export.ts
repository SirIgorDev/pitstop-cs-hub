const GOOGLE_IDENTITY_SCRIPT = "https://accounts.google.com/gsi/client";
const GOOGLE_SHEETS_SCOPE = "https://www.googleapis.com/auth/drive.file";
const SHEET_NAME = "Base tratada";

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleTokenClient = {
  requestAccessToken: (options?: { prompt?: string }) => void;
};

type GoogleIdentity = {
  accounts: {
    oauth2: {
      initTokenClient: (config: {
        client_id: string;
        scope: string;
        callback: (response: GoogleTokenResponse) => void;
        error_callback?: (error: { type?: string }) => void;
      }) => GoogleTokenClient;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

export function prepareGoogleIdentity() {
  if (window.google?.accounts.oauth2) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GOOGLE_IDENTITY_SCRIPT}"]`,
    );
    const script = existing ?? document.createElement("script");
    const timeout = window.setTimeout(
      () => reject(new Error("O Google demorou para responder. Tente novamente.")),
      15_000,
    );

    const finish = () => {
      window.clearTimeout(timeout);
      if (window.google?.accounts.oauth2) resolve();
      else reject(new Error("Não foi possível carregar a autorização do Google."));
    };
    const fail = () => {
      window.clearTimeout(timeout);
      reject(new Error("Não foi possível conectar ao Google."));
    };

    script.addEventListener("load", finish, { once: true });
    script.addEventListener("error", fail, { once: true });
    if (!existing) {
      script.src = GOOGLE_IDENTITY_SCRIPT;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  });
}

export async function requestGoogleAccessToken(clientId: string) {
  if (!clientId) {
    throw new Error("A integração com o Google ainda não foi configurada.");
  }

  await prepareGoogleIdentity();

  return new Promise<string>((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_SHEETS_SCOPE,
      callback: (response) => {
        if (response.access_token) {
          resolve(response.access_token);
          return;
        }
        reject(
          new Error(
            response.error_description ??
              (response.error === "access_denied"
                ? "A autorização do Google foi cancelada."
                : "O Google não autorizou a criação da planilha."),
          ),
        );
      },
      error_callback: () => reject(new Error("A janela de autorização do Google foi fechada.")),
    });

    client.requestAccessToken({ prompt: "consent" });
  });
}

async function googleRequest<T>(url: string, accessToken: string, init: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const googleMessage =
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof body.error === "object" &&
      body.error !== null &&
      "message" in body.error &&
      typeof body.error.message === "string"
        ? body.error.message
        : null;
    const message = googleMessage ?? "O Google não conseguiu criar a planilha.";
    throw new Error(message);
  }
  return body as T;
}

export async function createGoogleSpreadsheet(
  accessToken: string,
  title: string,
  values: string[][],
) {
  const spreadsheet = await googleRequest<{
    spreadsheetId: string;
    spreadsheetUrl: string;
    sheets: Array<{ properties: { sheetId: number } }>;
  }>("https://sheets.googleapis.com/v4/spreadsheets", accessToken, {
    method: "POST",
    body: JSON.stringify({
      properties: { title },
      sheets: [{ properties: { title: SHEET_NAME, gridProperties: { frozenRowCount: 1 } } }],
    }),
  });
  const sheetId = spreadsheet.sheets[0]?.properties.sheetId;
  if (sheetId === undefined) throw new Error("O Google criou a planilha sem uma aba editável.");

  const range = encodeURIComponent(`'${SHEET_NAME}'!A1:E${Math.max(values.length, 1)}`);
  await googleRequest(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet.spreadsheetId}/values/${range}?valueInputOption=RAW`,
    accessToken,
    {
      method: "PUT",
      body: JSON.stringify({ range: `${SHEET_NAME}!A1`, majorDimension: "ROWS", values }),
    },
  );

  await googleRequest(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet.spreadsheetId}:batchUpdate`,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({
        requests: [
          {
            repeatCell: {
              range: {
                sheetId,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: 5,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.92, green: 0.11, blue: 0.16 },
                  textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true },
                },
              },
              fields: "userEnteredFormat(backgroundColor,textFormat)",
            },
          },
          {
            autoResizeDimensions: {
              dimensions: { sheetId, dimension: "COLUMNS", startIndex: 0, endIndex: 5 },
            },
          },
        ],
      }),
    },
  );

  return spreadsheet;
}
