# mcp-brasil-api

[![CI](https://github.com/Arthurp11/mcp-brasil-api/actions/workflows/ci.yml/badge.svg)](https://github.com/Arthurp11/mcp-brasil-api/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/mcp-brasil-api)](https://www.npmjs.com/package/mcp-brasil-api)

Projeto pessoal para aprender: um servidor MCP que expõe dados públicos brasileiros (BrasilAPI + IBGE) como tools para IAs.

## Tools

| Tool                | O que faz                                                           | Fonte     |
| ------------------- | ------------------------------------------------------------------- | --------- |
| `consultar_cep`     | Endereço completo de um CEP                                         | BrasilAPI |
| `consultar_cnpj`    | Dados cadastrais e sócios de uma empresa (aceita CNPJ alfanumérico) | BrasilAPI |
| `listar_feriados`   | Feriados nacionais de um ano (padrão: ano atual)                    | BrasilAPI |
| `listar_municipios` | Municípios de uma UF com código IBGE, com filtro opcional por nome  | IBGE      |

## Instalação

Requer Node 22+. Não precisa clonar o repositório: o pacote está no npm e roda via `npx`.

**Claude Code:**

```bash
claude mcp add brasil-api -- npx -y mcp-brasil-api
```

**Claude Desktop, Cursor e outros clientes MCP** — adicione ao arquivo de configuração de servidores MCP do cliente:

```json
{
  "mcpServers": {
    "brasil-api": {
      "command": "npx",
      "args": ["-y", "mcp-brasil-api"]
    }
  }
}
```

Depois é só pedir em linguagem natural, por exemplo: _"qual o endereço do CEP 01001-000?"_ ou _"quais os feriados de 2027?"_.

## Desenvolvimento

```bash
npm install
npm run build
npm test          # compila e roda os testes unitários
npm run check     # lint + formatação (Biome)
npm run inspect   # testa as tools no MCP Inspector
```

Para usar a versão local no Claude Code:

```bash
claude mcp add brasil-api-dev -- node /caminho/para/mcp-brasil-api/dist/index.js
```

## Publicando uma nova versão

O CI roda lint e testes a cada push. A publicação no npm é feita pelo GitHub Actions (trusted publishing, sem token) quando uma tag de versão é enviada:

```bash
npm version patch        # ou minor/major: atualiza o package.json, commita e cria a tag
git push --follow-tags
```
