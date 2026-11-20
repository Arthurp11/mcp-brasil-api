import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { fetchJson, HttpError } from "../lib/http.js";
import { errorMessage, errorResult, textResult } from "../lib/result.js";

interface DddResponse {
  state: string;
  cities: string[];
}

export function registerDddTool(server: McpServer): void {
  server.registerTool(
    "consultar_ddd",
    {
      title: "Consultar DDD",
      description:
        "Informa o estado e as cidades atendidas por um código DDD (discagem direta a distância) brasileiro.",
      inputSchema: z.object({
        ddd: z
          .string()
          .regex(/^\(?\d{2}\)?$/, "DDD inválido. Deve conter 2 dígitos.")
          .transform((value) => value.replace(/\D/g, ""))
          .describe("Código DDD com 2 dígitos. Ex: '11', '21', '(61)'"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ ddd }) => {
      try {
        const data = await fetchJson<DddResponse>(`https://brasilapi.com.br/api/ddd/v1/${ddd}`);
        const cidades = [...data.cities].sort((a, b) => a.localeCompare(b, "pt-BR"));

        const text = [
          `DDD ${ddd} — ${data.state}, ${cidades.length} cidades:`,
          cidades.join(", "),
        ].join("\n");
        return textResult(text);
      } catch (error) {
        if (error instanceof HttpError && error.status === 404) {
          return errorResult(`DDD ${ddd} não existe.`);
        }
        return errorResult(`Erro ao consultar o DDD ${ddd}: ${errorMessage(error)}`);
      }
    },
  );
}
