import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { normalizeName } from "../lib/format.js";
import { fetchJson } from "../lib/http.js";
import { errorMessage, errorResult, textResult } from "../lib/result.js";

const UFS = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
] as const;

// SP tem 645 municípios e MG tem 853, então sem filtro mostra só os primeiros
const MAX_SEM_FILTRO = 100;

interface Municipio {
  "municipio-id": number;
  "municipio-nome": string;
  "regiao-imediata-nome": string;
  "UF-nome": string;
}

export function registerMunicipiosTool(server: McpServer): void {
  server.registerTool(
    "listar_municipios",
    {
      title: "Listar municípios",
      description:
        "Lista os municípios de um estado brasileiro com o código IBGE de cada um. Use o parâmetro 'nome' para buscar municípios específicos (a busca ignora acentos e maiúsculas).",
      inputSchema: z.object({
        uf: z
          .string()
          .trim()
          .toUpperCase()
          .pipe(z.enum(UFS, "UF inválida. Use a sigla do estado com 2 letras, ex: 'SP'."))
          .describe("Sigla do estado. Ex: 'SP', 'rj', 'MG'"),
        nome: z
          .string()
          .min(2, "O nome deve ter pelo menos 2 caracteres.")
          .optional()
          .describe("Trecho do nome do município para filtrar. Ex: 'campinas', 'sao jose'"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ uf, nome }) => {
      try {
        const todos = await fetchJson<Municipio[]>(
          `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?view=nivelado`,
        );
        const estado = todos[0]?.["UF-nome"] ?? uf;

        if (nome) {
          const termo = normalizeName(nome);
          const encontrados = todos.filter((m) =>
            normalizeName(m["municipio-nome"]).includes(termo),
          );

          if (encontrados.length === 0) {
            return textResult(`Nenhum município com "${nome}" no nome em ${estado}.`);
          }

          const lines = encontrados.map(
            (m) =>
              `- ${m["municipio-nome"]} (código IBGE ${m["municipio-id"]}, região imediata: ${m["regiao-imediata-nome"]})`,
          );
          const text = [
            `Municípios de ${estado} com "${nome}" no nome (${encontrados.length}):`,
            ...lines,
          ].join("\n");
          return textResult(text);
        }

        const lines = todos
          .slice(0, MAX_SEM_FILTRO)
          .map((m) => `- ${m["municipio-nome"]} (${m["municipio-id"]})`);
        if (todos.length > MAX_SEM_FILTRO) {
          lines.push(
            `... e mais ${todos.length - MAX_SEM_FILTRO} municípios. Use o parâmetro 'nome' para filtrar.`,
          );
        }

        const text = [
          `${estado} tem ${todos.length} municípios (nome e código IBGE):`,
          ...lines,
        ].join("\n");
        return textResult(text);
      } catch (error) {
        return errorResult(`Erro ao listar os municípios de ${uf}: ${errorMessage(error)}`);
      }
    },
  );
}
