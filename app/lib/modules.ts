export type ErpModule = {
  id: string;
  shortLabel: string;
  label: string;
  description: string;
  scope: string;
  href: string;
  status: "Base" | "Planejado";
};

export const modules: ErpModule[] = [
  {
    id: "dashboard",
    shortLabel: "PA",
    label: "Painel",
    description: "Visão consolidada da operação.",
    scope: "Indicadores e alertas",
    href: "/",
    status: "Base",
  },
  {
    id: "products",
    shortLabel: "PR",
    label: "Produtos",
    description: "Catálogo, variações, arquivos 3D, custos e preços de venda.",
    scope: "Cadastro e precificação",
    href: "#products",
    status: "Planejado",
  },
  {
    id: "production",
    shortLabel: "PD",
    label: "Produção",
    description: "Ordens, fila de impressão, máquinas, etapas e apontamentos.",
    scope: "Chão de fábrica 3D",
    href: "#production",
    status: "Planejado",
  },
  {
    id: "orders",
    shortLabel: "PE",
    label: "Pedidos",
    description: "Pedidos, itens, prazos, separação, embalagem e expedição.",
    scope: "Venda até a entrega",
    href: "#orders",
    status: "Planejado",
  },
  {
    id: "marketplaces",
    shortLabel: "MP",
    label: "Marketplaces",
    description: "Integração Shopee e preparação para outros canais de venda.",
    scope: "Shopee em primeiro lugar",
    href: "#marketplaces",
    status: "Planejado",
  },
  {
    id: "inventory",
    shortLabel: "ES",
    label: "Estoque",
    description: "Filamentos, insumos, produtos acabados e movimentações.",
    scope: "Materiais e disponibilidade",
    href: "#inventory",
    status: "Planejado",
  },
  {
    id: "finance",
    shortLabel: "FN",
    label: "Financeiro",
    description: "Custos, taxas, receitas, despesas, margens e resultados.",
    scope: "Rentabilidade real",
    href: "#finance",
    status: "Planejado",
  },
];
