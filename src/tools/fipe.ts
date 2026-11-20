import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { matchesAllWords, normalizeName } from "../lib/format.js";
import { fetchJson, HttpError } from "../lib/http.js";
import { errorMessage, errorResult, textResult } from "../lib/result.js";

/**
 * A BrasilAPI não permite chegar do nome do modelo ao código FIPE, então usamos a
 * API pública da Parallelum (sem token: 500 requisições por dia).
 */
const FIPE_API = "https://fipe.parallelum.com.br/api/v2";
const MAX_MODELOS = 30;

const TIPOS = { carros: "cars", motos: "motorcycles", caminhoes: "trucks" } as const;
type Tipo = keyof typeof TIPOS;

/** Na FIPE, o ano 32000 representa veículo zero km. */
const ANO_ZERO_KM = "32000";

interface Item {
  code: string;
  name: string;
}

interface Preco {
  price: string;
  brand: string;
  model: string;
  modelYear: number;
  fuel: string;
  codeFipe: string;
  referenceMonth: string;
}

const tipoSchema = z
  .enum(
    Object.keys(TIPOS) as [Tipo, ...Tipo[]],
    "Tipo inválido. Use 'carros', 'motos' ou 'caminhoes'.",
  )
  .default("carros")
  .describe("Tipo de veículo: 'carros' (padrão), 'motos' ou 'caminhoes'");

function formatAno(ano: Item): string {
  return ano.code.startsWith(`${ANO_ZERO_KM}-`)
    ? ano.name.replace(ANO_ZERO_KM, "Zero KM")
    : ano.name;
}

/** Escolhe a marca pelo nome: igual ao digitado tem prioridade; senão, a única que contém o termo. */
function findMarca(marcas: Item[], busca: string): Item | Item[] {
  const termo = normalizeName(busca);
  const exata = marcas.find((m) => normalizeName(m.name) === termo);
  if (exata) return exata;

  const parciais = marcas.filter((m) => normalizeName(m.name).includes(termo));
  return parciais.length === 1 && parciais[0] ? parciais[0] : parciais;
}

function registerBuscarModelos(server: McpServer): void {
  server.registerTool(
    "buscar_veiculo_fipe",
    {
      title: "Buscar veículo na tabela FIPE",
      description:
        "Primeiro passo para consultar o preço FIPE: busca a marca e os modelos de um veículo e retorna os códigos usados em 'consultar_preco_fipe'. Se o usuário já tem o código FIPE (ex: '005340-6'), pule esta tool.",
      inputSchema: z.object({
        tipo: tipoSchema,
        marca: z
          .string()
          .trim()
          .min(2)
          .describe("Nome da marca. Ex: 'volkswagen', 'fiat', 'honda'"),
        modelo: z
          .string()
          .trim()
          .min(1)
          .optional()
          .describe("Palavras do nome do modelo para filtrar. Ex: 'amarok highline', 'onix 1.0'"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ tipo, marca, modelo }) => {
      try {
        const marcas = await fetchJson<Item[]>(`${FIPE_API}/${TIPOS[tipo]}/brands`);
        const resultado = findMarca(marcas, marca);

        if (Array.isArray(resultado)) {
          if (resultado.length === 0) {
            return errorResult(
              `Nenhuma marca de ${tipo} com "${marca}" no nome. Algumas marcas: ${marcas
                .slice(0, 40)
                .map((m) => m.name)
                .join(", ")}.`,
            );
          }
          const lista = resultado.map((m) => `- ${m.name} (código ${m.code})`).join("\n");
          return textResult(
            `Mais de uma marca corresponde a "${marca}". Repita a busca com o nome exato:\n${lista}`,
          );
        }

        const modelos = await fetchJson<Item[]>(
          `${FIPE_API}/${TIPOS[tipo]}/brands/${resultado.code}/models`,
        );
        const filtrados = modelo ? modelos.filter((m) => matchesAllWords(m.name, modelo)) : modelos;

        if (filtrados.length === 0) {
          return textResult(
            `Nenhum modelo da ${resultado.name} com "${modelo}" no nome. Tente menos palavras.`,
          );
        }

        const lines = filtrados
          .slice(0, MAX_MODELOS)
          .map((m) => `- ${m.name} (codigo_modelo ${m.code})`);
        if (filtrados.length > MAX_MODELOS) {
          lines.push(
            `... e mais ${filtrados.length - MAX_MODELOS} modelos. Use o parâmetro 'modelo' para filtrar.`,
          );
        }

        const titulo = modelo ? `Modelos com "${modelo}"` : "Modelos";
        return textResult(
          [
            `Marca: ${resultado.name} (codigo_marca ${resultado.code})`,
            `${titulo} (${filtrados.length}):`,
            ...lines,
          ].join("\n"),
        );
      } catch (error) {
        return errorResult(`Erro ao buscar veículos na FIPE: ${errorMessage(error)}`);
      }
    },
  );
}

function registerConsultarPreco(server: McpServer): void {
  server.registerTool(
    "consultar_preco_fipe",
    {
      title: "Consultar preço FIPE",
      description:
        "Preço médio de um veículo na tabela FIPE do mês atual. Identifique o veículo pelo código FIPE OU por codigo_marca + codigo_modelo (obtidos em 'buscar_veiculo_fipe'). Sem o ano, lista os anos disponíveis.",
      inputSchema: z
        .object({
          tipo: tipoSchema,
          codigo_fipe: z
            .string()
            .regex(/^\d{6}-\d$/, "Código FIPE inválido. Formato: '005340-6'.")
            .optional()
            .describe("Código FIPE do veículo. Ex: '005340-6'"),
          codigo_marca: z.string().regex(/^\d+$/).optional().describe("Código da marca. Ex: '59'"),
          codigo_modelo: z
            .string()
            .regex(/^\d+$/)
            .optional()
            .describe("Código do modelo. Ex: '5585'"),
          ano: z
            .string()
            .trim()
            .optional()
            .describe("Ano do modelo. Ex: '2016' ou '0km'. Se omitido, lista os anos disponíveis."),
        })
        .refine((v) => v.codigo_fipe || (v.codigo_marca && v.codigo_modelo), {
          message: "Informe codigo_fipe, ou codigo_marca e codigo_modelo.",
        }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ tipo, codigo_fipe, codigo_marca, codigo_modelo, ano }) => {
      const base = codigo_fipe
        ? `${FIPE_API}/${TIPOS[tipo]}/${codigo_fipe}/years`
        : `${FIPE_API}/${TIPOS[tipo]}/brands/${codigo_marca}/models/${codigo_modelo}/years`;

      try {
        const anos = await fetchJson<Item[]>(base);
        const listaAnos = anos.map((a) => `- ${formatAno(a)} (ano '${a.code}')`).join("\n");

        if (!ano) {
          return textResult(`Anos disponíveis (${anos.length}):\n${listaAnos}`);
        }

        // Aceita "2016", "0km" ou o código completo "2016-3" (ano-combustível)
        const termo = /^(0\s*km|zero\s*km)$/i.test(ano) ? ANO_ZERO_KM : ano;
        const candidatos = anos.filter((a) => a.code === termo || a.code.startsWith(`${termo}-`));

        if (candidatos.length === 0) {
          return errorResult(`Ano ${ano} não disponível para este veículo. Anos:\n${listaAnos}`);
        }
        if (candidatos.length > 1) {
          const lista = candidatos.map((a) => `- ${formatAno(a)} (ano '${a.code}')`).join("\n");
          return textResult(
            `Há mais de uma versão de combustível em ${ano}. Repita com o código do ano:\n${lista}`,
          );
        }

        const p = await fetchJson<Preco>(`${base}/${candidatos[0]?.code}`);
        const anoModelo = String(p.modelYear) === ANO_ZERO_KM ? "Zero KM" : p.modelYear;
        const text = [
          `${p.brand} ${p.model}`,
          `Ano: ${anoModelo} · Combustível: ${p.fuel}`,
          `Preço FIPE: ${p.price}`,
          `Código FIPE: ${p.codeFipe}`,
          `Referência: ${p.referenceMonth}`,
        ].join("\n");
        return textResult(text);
      } catch (error) {
        if (error instanceof HttpError && error.status === 404) {
          return errorResult("Veículo não encontrado na FIPE. Confira os códigos informados.");
        }
        return errorResult(`Erro ao consultar o preço FIPE: ${errorMessage(error)}`);
      }
    },
  );
}

export function registerFipeTools(server: McpServer): void {
  registerBuscarModelos(server);
  registerConsultarPreco(server);
}
