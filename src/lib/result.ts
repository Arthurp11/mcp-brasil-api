export function textResult(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

export function errorResult(text: string) {
  return { content: [{ type: "text" as const, text }], isError: true };
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Erro desconhecido.";
}
