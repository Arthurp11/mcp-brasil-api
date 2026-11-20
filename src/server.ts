import { createRequire } from "node:module";
import { McpServer } from "@modelcontextprotocol/server";
import { registerCepTool } from "./tools/cep.js";
import { registerCnpjTool } from "./tools/cnpj.js";
import { registerFeriadosTool } from "./tools/feriados.js";
import { registerMunicipiosTool } from "./tools/municipios.js";

// Lê nome e versão do package.json (fica em ../ tanto a partir de src/ quanto de dist/)
const pkg = createRequire(import.meta.url)("../package.json") as { name: string; version: string };

export function createServer(): McpServer {
  const server = new McpServer({ name: pkg.name, version: pkg.version });

  registerCepTool(server);
  registerCnpjTool(server);
  registerFeriadosTool(server);
  registerMunicipiosTool(server);

  return server;
}
