export class HttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export async function fetchJson<T>(url: string, timeoutMs = 10_000): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: "application/json", "User-Agent": "mcp-brasil-api" },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error(`A API demorou mais de ${timeoutMs / 1000} segundos para responder.`, {
        cause: error,
      });
    }
    throw new Error("Falha de conexão com a API. Tente novamente em instantes.", { cause: error });
  }

  if (response.status === 429) {
    throw new HttpError(
      "Limite de requisições da API atingido. Aguarde alguns segundos e tente novamente.",
      429,
    );
  }

  if (!response.ok) {
    const detail = await readErrorMessage(response);
    const message = `A API respondeu com erro (status ${response.status})`;
    throw new HttpError(detail ? `${message}: ${detail}` : `${message}.`, response.status);
  }

  return (await response.json()) as T;
}

/** Tenta extrair a mensagem de erro do corpo da resposta ({ message } ou { error }). */
async function readErrorMessage(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.json()) as { message?: unknown; error?: unknown };
    const detail = body.message ?? body.error;
    return typeof detail === "string" ? detail : undefined;
  } catch {
    return undefined;
  }
}
