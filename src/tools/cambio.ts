import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { formatDate, getYesterday, toIsoDate } from "../lib/format.js";
import { fetchJson } from "../lib/http.js";
import { errorMessage, errorResult, textResult } from "../lib/result.js";

const MOEDAS = ["USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "DKK", "NOK", "SEK"] as const;

interface Cotacao {
  cotacao_compra: number;
  cotacao_venda: number;
  data_hora_cotacao: string;
  tipo_boletim: string;
}

interface CambioResponse {
  cotacoes: Cotacao[];
  moeda: string;
}

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 4,
});

export function registerCambioTool(server: McpServer): void {
  server.registerTool(
    "cotacao_moeda",
    {
      title: "Cotação de moeda",
      description:
        "Cotação oficial (PTAX do Banco Central) de uma moeda estrangeira em reais, em uma data. Não há cotação do dia de hoje: o padrão é ontem. Em fins de semana e feriados, retorna o último dia útil anterior.",
      inputSchema: z.object({
        moeda: z
          .string()
          .trim()
          .toUpperCase()
          .pipe(z.enum(MOEDAS, `Moeda inválida. Disponíveis: ${MOEDAS.join(", ")}.`))
          .describe(`Código da moeda: ${MOEDAS.join(", ")}`),
        data: z
          .string()
          .regex(
            /^(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})$/,
            "Data inválida. Use AAAA-MM-DD ou DD/MM/AAAA.",
          )
          .optional()
          .describe(
            "Data da cotação (a partir de 28/11/1984). Se omitida, usa ontem. Ex: '2026-03-15'",
          ),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ moeda, data }) => {
      // a API não tem a cotação do dia atual, então o padrão é ontem
      const iso = data ? toIsoDate(data) : getYesterday();

      try {
        const res = await fetchJson<CambioResponse>(
          `https://brasilapi.com.br/api/cambio/v1/cotacao/${moeda}/${iso}`,
        );

        // o último boletim do dia é o de fechamento
        const ultima = res.cotacoes.at(-1);
        if (!ultima) {
          return errorResult(`Sem cotação de ${moeda} para ${formatDate(iso)}.`);
        }

        const dataCotacao = ultima.data_hora_cotacao.slice(0, 10);
        const lines = [
          `Cotação ${moeda}/BRL em ${formatDate(dataCotacao)} (${ultima.tipo_boletim.toLowerCase()}):`,
          `Compra: ${brl.format(ultima.cotacao_compra)}`,
          `Venda: ${brl.format(ultima.cotacao_venda)}`,
        ];
        if (dataCotacao !== iso) {
          lines.push(
            `Obs: ${formatDate(iso)} não teve cotação (fim de semana ou feriado), mostrando o último dia útil anterior.`,
          );
        }
        return textResult(lines.join("\n"));
      } catch (error) {
        return errorResult(
          `Erro ao consultar a cotação de ${moeda} em ${formatDate(iso)}: ${errorMessage(error)}`,
        );
      }
    },
  );
}
