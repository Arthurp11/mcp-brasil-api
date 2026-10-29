import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { formatDate, isValidCnpj, normalizeCnpj } from "../lib/format.js";
import { fetchJson, HttpError } from "../lib/http.js";

const MAX_SOCIOS = 10;

interface Socio {
  nome_socio: string;
  qualificacao_socio: string;
}

interface CnpjResponse {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  descricao_situacao_cadastral: string;
  data_inicio_atividade: string;
  cnae_fiscal_descricao: string;
  natureza_juridica: string;
  porte: string;
  capital_social: number;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  qsa: Socio[];
}

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function formatCnpj(data: CnpjResponse): string {
  const endereco = [data.logradouro, data.numero, data.complemento].filter(Boolean).join(", ");

  const lines = [
    `CNPJ: ${data.cnpj}`,
    `Razão social: ${data.razao_social}`,
    `Nome fantasia: ${data.nome_fantasia || "não informado"}`,
    `Situação cadastral: ${data.descricao_situacao_cadastral}`,
    `Data de abertura: ${formatDate(data.data_inicio_atividade)}`,
    `Atividade principal: ${data.cnae_fiscal_descricao}`,
    `Natureza jurídica: ${data.natureza_juridica}`,
    `Porte: ${data.porte}`,
    `Capital social: ${currency.format(data.capital_social)}`,
    `Endereço: ${endereco} - ${data.bairro}, ${data.municipio}/${data.uf}, CEP ${data.cep}`,
  ];

  const socios = data.qsa ?? [];
  if (socios.length > 0) {
    lines.push("", `Sócios (${socios.length}):`);
    for (const socio of socios.slice(0, MAX_SOCIOS)) {
      lines.push(`- ${socio.nome_socio} (${socio.qualificacao_socio})`);
    }
    if (socios.length > MAX_SOCIOS) {
      lines.push(`... e mais ${socios.length - MAX_SOCIOS} sócios.`);
    }
  }

  return lines.join("\n");
}

export function registerCnpjTool(server: McpServer): void {
  server.registerTool(
    "consultar_cnpj",
    {
      title: "Consultar CNPJ",
      description:
        "Busca os dados de uma empresa brasileira pelo CNPJ: razão social, situação cadastral, atividade principal, data de abertura, endereço e sócios.",
      inputSchema: z.object({
        cnpj: z
          .string()
          .regex(
            /^[0-9A-Za-z]{2}\.?[0-9A-Za-z]{3}\.?[0-9A-Za-z]{3}\/?[0-9A-Za-z]{4}-?\d{2}$/,
            "CNPJ inválido. Deve conter 14 caracteres, com ou sem pontuação.",
          )
          .refine(isValidCnpj, "CNPJ inválido: dígitos verificadores não conferem.")
          .describe("CNPJ a ser consultado, com ou sem pontuação. Ex: '00.000.000/0001-91'"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ cnpj }) => {
      try {
        const data = await fetchJson<CnpjResponse>(
          `https://brasilapi.com.br/api/cnpj/v1/${normalizeCnpj(cnpj)}`,
        );
        return { content: [{ type: "text", text: formatCnpj(data) }] };
      } catch (error) {
        if (error instanceof HttpError && error.status === 404) {
          return {
            content: [{ type: "text", text: `CNPJ ${cnpj} não encontrado.` }],
            isError: true,
          };
        }

        const message = error instanceof Error ? error.message : "Erro desconhecido.";
        return {
          content: [{ type: "text", text: `Erro ao consultar o CNPJ ${cnpj}: ${message}` }],
          isError: true,
        };
      }
    },
  );
}
