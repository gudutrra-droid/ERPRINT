# Arquitetura do ERPrint ERP

## Princípios

- Construir um módulo por vez, com fronteiras claras.
- Manter as regras do negócio independentes da interface.
- Persistir dados operacionais no banco; preferências visuais podem ficar no navegador.
- Integrar marketplaces por adaptadores, evitando acoplar todo o ERP à Shopee.
- Versionar mudanças pequenas e verificáveis ao final de cada etapa.

## Estrutura inicial

- `app/components`: componentes compartilhados do painel.
- `app/lib/modules.ts`: registro central dos módulos e da navegação.
- `app`: rotas e composição da interface.
- `db/schema.ts`: tabelas relacionais adicionadas conforme cada módulo for construído.
- `drizzle`: migrações versionadas do banco.
- `worker`: entrada do aplicativo para execução hospedada.
- `tests`: verificações automatizadas do comportamento renderizado.

## Dados

O ERP precisará de persistência relacional. A opção preparada no projeto é o
Cloudflare D1 com Drizzle ORM. O vínculo será ativado junto do primeiro módulo
que salvar dados, evitando tabelas genéricas antes de as regras reais serem
definidas.

Arquivos 3D, imagens e documentos grandes deverão usar armazenamento de objetos
(R2), mantendo apenas seus metadados relacionais no banco.

## Integração Shopee

A integração será isolada em uma camada própria. Pedidos e produtos internos
terão identificadores do ERP, enquanto os códigos da Shopee serão referências
externas. Isso permite adicionar outros marketplaces sem duplicar as regras de
produção, estoque e financeiro.

## Segurança

- Nenhuma credencial será colocada no repositório.
- Acesso ao ERP publicado deverá ser privado.
- Operações de escrita terão validação no servidor.
- Integrações externas usarão segredos configurados no ambiente de hospedagem.
