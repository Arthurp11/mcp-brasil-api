import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { onlyDigits } from "../lib/format.js";
import { fetchJson, HttpError } from "../lib/http.js";

interface CepResponse {
  cep: string;
  state: string;
  city: string;
  neighborhood: string;
  street: string;
}

export function registerCepTool(server: McpServer): void {
  server.registerTool(
    "consultar_cep",
    {
      title: "Consultar CEP",
      description:
        "Busca o endereço completo (rua, bairro, cidade e estado) de um CEP (Código de Endereçamento Postal) brasileiro.",
      inputSchema: z.object({
        cep: z
          .string()
          .regex(/^\d{5}-?\d{3}$/, "CEP inválido. Deve conter 8 dígitos, com ou sem hífen.")
          .describe("CEP a ser consultado. Ex: '01001-000' ou '01001000'"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ cep }) => {
      const digits = onlyDigits(cep);

      try {
        const data = await fetchJson<CepResponse>(`https://brasilapi.com.br/api/cep/v2/${digits}`);

        const text = [
          `CEP: ${data.cep}`,
          `Rua: ${data.street || "não informada"}`,
          `Bairro: ${data.neighborhood || "não informado"}`,
          `Cidade: ${data.city}/${data.state}`,
        ].join("\n");

        return { content: [{ type: "text", text }] };
      } catch (error) {
        if (error instanceof HttpError && error.status === 404) {
          return {
            content: [{ type: "text", text: `CEP ${cep} não encontrado.` }],
            isError: true,
          };
        }

        const message = error instanceof Error ? error.message : "Erro desconhecido.";
        return {
          content: [{ type: "text", text: `Erro ao consultar o CEP ${cep}: ${message}` }],
          isError: true,
        };
      }
    },
  );
}
