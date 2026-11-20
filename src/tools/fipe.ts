import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { matchesAllWords, normalizeName } from "../lib/format.js";
import { fetchJson, HttpError } from "../lib/http.js";
import { errorMessage, errorResult, textResult } from "../lib/result.js";

// A FIPE da BrasilAPI não devolve o código FIPE na lista de modelos,
// então uso a API da Parallelum (limite de 500 consultas por dia sem token)
const FIPE_API = "https://fipe.parallelum.com.br/api/v2";
const MAX_MODELOS = 30;

const TIPOS = {
  carros: "cars",
  motos: "motorcycles",
  caminhoes: "trucks",
};

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
  .enum(["carros", "motos", "caminhoes"], "Tipo inválido. Use 'carros', 'motos' ou 'caminhoes'.")
  .default("carros")
  .describe("Tipo de veículo: 'carros' (padrão), 'motos' ou 'caminhoes'");

// Na FIPE o ano 32000 significa zero km
function formatAno(ano: Item): string {
  return ano.name.replace("32000", "Zero KM");
}

function registerBuscarVeiculo(server: McpServer): void {
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

        // primeiro tenta o nome exato, depois qualquer marca que contenha o texto
        const termo = normalizeName(marca);
        let encontradas = marcas.filter((m) => normalizeName(m.name) === termo);
        if (encontradas.length === 0) {
          encontradas = marcas.filter((m) => normalizeName(m.name).includes(termo));
        }

        if (encontradas.length === 0) {
          const exemplos = marcas.slice(0, 40).map((m) => m.name);
          return errorResult(
            `Nenhuma marca de ${tipo} com "${marca}" no nome. Algumas marcas: ${exemplos.join(", ")}.`,
          );
        }

        if (encontradas.length > 1) {
          const lista = encontradas.map((m) => `- ${m.name}`).join("\n");
          return textResult(`Mais de uma marca encontrada. Repita com o nome exato:\n${lista}`);
        }

        const marcaEscolhida = encontradas[0] as Item;
        const modelos = await fetchJson<Item[]>(
          `${FIPE_API}/${TIPOS[tipo]}/brands/${marcaEscolhida.code}/models`,
        );

        let filtrados = modelos;
        if (modelo) {
          filtrados = modelos.filter((m) => matchesAllWords(m.name, modelo));
        }

        if (filtrados.length === 0) {
          return textResult(
            `Nenhum modelo da ${marcaEscolhida.name} com "${modelo}" no nome. Tente menos palavras.`,
          );
        }

        const lines = [
          `Marca: ${marcaEscolhida.name} (codigo_marca ${marcaEscolhida.code})`,
          `Modelos encontrados (${filtrados.length}):`,
        ];
        for (const m of filtrados.slice(0, MAX_MODELOS)) {
          lines.push(`- ${m.name} (codigo_modelo ${m.code})`);
        }
        if (filtrados.length > MAX_MODELOS) {
          lines.push(
            `... e mais ${filtrados.length - MAX_MODELOS} modelos. Use o parâmetro 'modelo' para filtrar.`,
          );
        }

        return textResult(lines.join("\n"));
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
      let url = `${FIPE_API}/${TIPOS[tipo]}/brands/${codigo_marca}/models/${codigo_modelo}/years`;
      if (codigo_fipe) {
        url = `${FIPE_API}/${TIPOS[tipo]}/${codigo_fipe}/years`;
      }

      try {
        const anos = await fetchJson<Item[]>(url);
        const listaAnos = anos.map((a) => `- ${formatAno(a)} (ano '${a.code}')`).join("\n");

        if (!ano) {
          return textResult(`Anos disponíveis (${anos.length}):\n${listaAnos}`);
        }

        // o código do ano vem como "2016-3" (ano-combustível)
        let anoBuscado = ano;
        if (ano.toLowerCase().replace(" ", "") === "0km") {
          anoBuscado = "32000";
        }
        const candidatos = anos.filter(
          (a) => a.code === anoBuscado || a.code.startsWith(`${anoBuscado}-`),
        );

        if (candidatos.length === 0) {
          return errorResult(`Ano ${ano} não disponível para este veículo. Anos:\n${listaAnos}`);
        }
        if (candidatos.length > 1) {
          const lista = candidatos.map((a) => `- ${formatAno(a)} (ano '${a.code}')`).join("\n");
          return textResult(
            `Há mais de uma versão de combustível em ${ano}. Repita com o código do ano:\n${lista}`,
          );
        }

        const anoEscolhido = candidatos[0] as Item;
        const preco = await fetchJson<Preco>(`${url}/${anoEscolhido.code}`);
        const anoModelo = preco.modelYear === 32000 ? "Zero KM" : preco.modelYear;

        const text = [
          `${preco.brand} ${preco.model}`,
          `Ano: ${anoModelo}`,
          `Combustível: ${preco.fuel}`,
          `Preço FIPE: ${preco.price}`,
          `Código FIPE: ${preco.codeFipe}`,
          `Referência: ${preco.referenceMonth}`,
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
  registerBuscarVeiculo(server);
  registerConsultarPreco(server);
}
