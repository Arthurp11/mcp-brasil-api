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

## Como usar

Requer Node 22+.

```bash
npm install
npm run build
npm test          # roda os testes unitários
npm run inspect   # testa as tools no MCP Inspector
```

Para usar no Claude Code:

```bash
claude mcp add brasil-api -- node /caminho/para/mcp-brasil-api/dist/index.js
```

Ou instale o comando globalmente (`npm install -g .` dentro da pasta) e use:

```bash
claude mcp add brasil-api -- mcp-brasil-api
```
