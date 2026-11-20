import { createRequire } from "node:module";
import { McpServer } from "@modelcontextprotocol/server";
import { registerBancosTool } from "./tools/bancos.js";
import { registerCambioTool } from "./tools/cambio.js";
import { registerCepTool } from "./tools/cep.js";
import { registerCnpjTool } from "./tools/cnpj.js";
import { registerDddTool } from "./tools/ddd.js";
import { registerFeriadosTool } from "./tools/feriados.js";
import { registerFipeTools } from "./tools/fipe.js";
import { registerMunicipiosTool } from "./tools/municipios.js";

// pega nome e versão do package.json para não precisar atualizar em dois lugares
const pkg = createRequire(import.meta.url)("../package.json") as { name: string; version: string };

export function createServer(): McpServer {
  const server = new McpServer({ name: pkg.name, version: pkg.version });

  registerCepTool(server);
  registerCnpjTool(server);
  registerFeriadosTool(server);
  registerMunicipiosTool(server);
  registerDddTool(server);
  registerBancosTool(server);
  registerCambioTool(server);
  registerFipeTools(server);

  return server;
}
