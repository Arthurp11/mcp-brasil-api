# mcp-brasil-api

Projeto pessoal para aprender: um servidor MCP que expõe dados públicos brasileiros (BrasilAPI + IBGE) como tools para IAs.

## Tools

| Tool | O que faz | Fonte |
| --- | --- | --- |
| `consultar_cep` | Endereço completo de um CEP | BrasilAPI |
| `consultar_cnpj` | Dados cadastrais e sócios de uma empresa (aceita CNPJ alfanumérico) | BrasilAPI |
| `listar_feriados` | Feriados nacionais de um ano (padrão: ano atual) | BrasilAPI |
| `listar_municipios` | Municípios de uma UF com código IBGE, com filtro opcional por nome | IBGE |

## Como usar

Requer Node 22+.

```bash
npm install
npm run build
npm run inspect   # testa as tools no MCP Inspector
```

Para usar no Claude Code:

```bash
claude mcp add brasil-api -- node /caminho/para/mcp-brasil-api/dist/index.js
```
