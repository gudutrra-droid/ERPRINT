# ERPrint ERP

Sistema de gestão da ERPrint para centralizar produção de produtos 3D, catálogo,
estoque, pedidos e vendas em marketplaces — começando pela Shopee.

## Estado atual

Esta primeira etapa entrega a fundação do produto:

- painel inicial responsivo;
- navegação e mapa dos módulos;
- estrutura preparada para rotas e componentes por domínio;
- suporte a banco relacional D1 e migrações Drizzle quando o primeiro módulo exigir dados;
- testes de renderização e build de produção.

Os indicadores exibem zero de propósito: nenhum dado real será inventado antes da
construção dos módulos.

## Módulos planejados

1. Produtos e catálogo
2. Produção 3D
3. Pedidos
4. Marketplaces, com Shopee como prioridade
5. Estoque
6. Financeiro

Consulte [docs/ROADMAP.md](docs/ROADMAP.md) para a ordem sugerida e
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) para as decisões técnicas.

## Desenvolvimento local

Requisitos: Node.js 22.13 ou superior.

```bash
npm install
npm run dev
```

Verificações:

```bash
npm run build
npm test
```

As credenciais e variáveis locais devem ficar em arquivos `.env*`, que não são
versionados.
