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
      headers: { Accept: "application/json" },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error(`A API demorou mais de ${timeoutMs / 1000} segundos para responder.`, {
        cause: error,
      });
    }
    throw new Error("Falha de conexão com a API. Tente novamente em instantes.", { cause: error });
  }

  if (!response.ok) {
    throw new HttpError(`A API respondeu com erro (status ${response.status}).`, response.status);
  }

  return (await response.json()) as T;
}
