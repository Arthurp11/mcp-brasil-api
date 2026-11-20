import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { matchesAllWords, normalizeName } from "../lib/format.js";
import { fetchJson, HttpError } from "../lib/http.js";
import { errorMessage, errorResult, textResult } from "../lib/result.js";

const MAX_RESULTADOS = 20;

/** Nomes comerciais que não aparecem no cadastro oficial do Banco Central. */
const APELIDOS: Record<string, string> = {
  nubank: "nu",
  pagbank: "pagseguro",
};

interface Banco {
  ispb: string;
  name: string | null;
  code: number | null;
  fullName: string | null;
  cnpj: string | null;
}

function formatBanco(banco: Banco): string {
  const codigo = banco.code === null ? "sem código" : String(banco.code).padStart(3, "0");
  return `- ${codigo}: ${banco.fullName ?? banco.name} (ISPB ${banco.ispb})`;
}

export function registerBancosTool(server: McpServer): void {
  server.registerTool(
    "buscar_banco",
    {
      title: "Buscar banco",
      description:
        "Busca instituições financeiras brasileiras pelo código de compensação (ex: 341) ou pelo nome (ex: 'itau', 'nubank'). Retorna código, nome completo e ISPB.",
      inputSchema: z.object({
        busca: z
          .string()
          .trim()
          .min(2, "A busca deve ter pelo menos 2 caracteres.")
          .describe("Código do banco (1 a 3 dígitos) ou parte do nome. Ex: '001', '260', 'caixa'"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ busca }) => {
      try {
        if (/^\d{1,3}$/.test(busca)) {
          const codigo = Number(busca);
          const banco = await fetchJson<Banco>(`https://brasilapi.com.br/api/banks/v1/${codigo}`);
          const lines = [
            `Código: ${String(banco.code).padStart(3, "0")}`,
            `Nome: ${banco.fullName ?? banco.name}`,
          ];
          if (banco.name && banco.name !== banco.fullName) {
            lines.push(`Nome reduzido: ${banco.name}`);
          }
          lines.push(`ISPB: ${banco.ispb}`);
          if (banco.cnpj) lines.push(`CNPJ: ${banco.cnpj}`);
          return textResult(lines.join("\n"));
        }

        const termo = APELIDOS[normalizeName(busca)] ?? busca;
        const bancos = await fetchJson<Banco[]>("https://brasilapi.com.br/api/banks/v1");
        const encontrados = bancos.filter((b) =>
          matchesAllWords(`${b.name ?? ""} ${b.fullName ?? ""}`, termo),
        );

        if (encontrados.length === 0) {
          return textResult(`Nenhuma instituição encontrada com "${busca}" no nome.`);
        }

        const lines = encontrados.slice(0, MAX_RESULTADOS).map(formatBanco);
        if (encontrados.length > MAX_RESULTADOS) {
          lines.push(`... e mais ${encontrados.length - MAX_RESULTADOS}. Refine a busca.`);
        }
        return textResult(
          [`Instituições com "${busca}" no nome (${encontrados.length}):`, ...lines].join("\n"),
        );
      } catch (error) {
        if (error instanceof HttpError && error.status === 404) {
          return errorResult(`Nenhum banco com o código ${busca}.`);
        }
        return errorResult(`Erro ao buscar o banco "${busca}": ${errorMessage(error)}`);
      }
    },
  );
}
