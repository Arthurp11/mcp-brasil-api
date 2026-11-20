/** Resposta de sucesso de uma tool, com um único bloco de texto. */
export function textResult(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

/** Resposta de erro de uma tool: a IA vê a mensagem e sabe que a chamada falhou. */
export function errorResult(text: string) {
  return { content: [{ type: "text" as const, text }], isError: true };
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Erro desconhecido.";
}
