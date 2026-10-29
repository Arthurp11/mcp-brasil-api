import { McpServer } from "@modelcontextprotocol/server";
import { registerCepTool } from "./tools/cep.js";

export function createServer(): McpServer {
  const server = new McpServer({ name: "mcp-brasil-api", version: "0.1.0" });

  registerCepTool(server);

  return server;
}
