import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

export function createServer(): McpServer {
  const server = new McpServer({ name: "mcp-brasil-api", version: "0.1.0" });

  server.registerTool(
    "ping",
    {
      title: "Ping",
      description:
        "Verifica se o servidor MCP está funcionando. Responde 'pong' seguido da mensagem enviada.",
      inputSchema: z.object({
        mensagem: z
          .string()
          .optional()
          .describe("Mensagem opcional a ser devolvida junto com o 'pong'. Ex: 'teste'"),
      }),
    },
    async ({ mensagem }) => {
      return {
        content: [{ type: "text", text: `pong: ${mensagem ?? "olá!"}` }],
      };
    },
  );

  return server;
}
