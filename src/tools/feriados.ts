import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { formatDate } from "../lib/format.js";
import { fetchJson } from "../lib/http.js";

interface Feriado {
  date: string;
  name: string;
  type: string;
  weekday?: string;
}

export function registerFeriadosTool(server: McpServer): void {
  server.registerTool(
    "listar_feriados",
    {
      title: "Listar feriados nacionais",
      description:
        "Lista os feriados nacionais do Brasil em um ano, com data e dia da semana. Inclui feriados móveis (Carnaval, Páscoa, Corpus Christi). Não inclui feriados estaduais nem municipais.",
      inputSchema: z.object({
        ano: z
          .number()
          .int()
          .min(1900, "Ano deve estar entre 1900 e 2199.")
          .max(2199, "Ano deve estar entre 1900 e 2199.")
          .optional()
          .describe("Ano a ser consultado. Se omitido, usa o ano atual. Ex: 2026"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ ano }) => {
      const year = ano ?? new Date().getFullYear();

      try {
        const feriados = await fetchJson<Feriado[]>(
          `https://brasilapi.com.br/api/feriados/v1/${year}`,
        );

        const lines = feriados.map((f) => {
          const weekday = f.weekday ? ` (${f.weekday})` : "";
          return `- ${formatDate(f.date)}${weekday}: ${f.name}`;
        });

        const text = [`Feriados nacionais em ${year} (${feriados.length}):`, ...lines].join("\n");
        return { content: [{ type: "text", text }] };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erro desconhecido.";
        return {
          content: [{ type: "text", text: `Erro ao listar os feriados de ${year}: ${message}` }],
          isError: true,
        };
      }
    },
  );
}
