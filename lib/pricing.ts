// Motor de custo/lucro — porte fiel do gestaoprint-pro (src/lib/pricing.ts).
// Trabalha em reais (float) internamente; conversão de/para centavos fica nas
// bordas. Toda função de cálculo do app deve passar por aqui para não divergir.

export interface PricingInputs {
  printTimeHours: number;
  printTimeMinutes: number;
  printerPurchasePrice: number;
  printerLifespanHours: number;
  printerWattage: number;
  kwhCost: number;
  filamentPricePerKg: number;
  filamentGrams: number;
  suppliesCost: number;
  commissionPercent: number;
  fixedFee: number;
  freeShippingPercent: number;
  paysTax: boolean;
  taxRate: number;
  salePrice: number;
  purchaseCost?: number;
}

export interface PricingBreakdown {
  energyCost: number;
  depreciationCost: number;
  filamentCost: number;
  suppliesCost: number;
  productionCost: number;
  commissionCost: number;
  fixedFee: number;
  freeShippingCost: number;
  channelCost: number;
  taxCost: number;
  totalCost: number;
  profit: number;
  margin: number;
}

export function calculatePricing(inputs: PricingInputs): PricingBreakdown {
  const printTimeTotal = inputs.printTimeHours + inputs.printTimeMinutes / 60;

  const energyCost = (inputs.printerWattage / 1000) * printTimeTotal * inputs.kwhCost;
  const depreciationCost =
    inputs.printerLifespanHours > 0
      ? (inputs.printerPurchasePrice / inputs.printerLifespanHours) * printTimeTotal
      : 0;
  const filamentCost = (inputs.filamentGrams / 1000) * inputs.filamentPricePerKg;
  const productionCost =
    energyCost + depreciationCost + filamentCost + inputs.suppliesCost + (inputs.purchaseCost ?? 0);

  const commissionCost = (inputs.commissionPercent / 100) * inputs.salePrice;
  const freeShippingCost = (inputs.freeShippingPercent / 100) * inputs.salePrice;
  const channelCost = commissionCost + inputs.fixedFee + freeShippingCost;

  const taxCost = inputs.paysTax ? (inputs.taxRate / 100) * inputs.salePrice : 0;

  const totalCost = productionCost + channelCost + taxCost;
  const profit = inputs.salePrice - totalCost;
  const margin = inputs.salePrice > 0 ? (profit / inputs.salePrice) * 100 : 0;

  return {
    energyCost,
    depreciationCost,
    filamentCost,
    suppliesCost: inputs.suppliesCost,
    productionCost,
    commissionCost,
    fixedFee: inputs.fixedFee,
    freeShippingCost,
    channelCost,
    taxCost,
    totalCost,
    profit,
    margin,
  };
}

// ── Resolução das taxas do canal (com faixas por valor de venda) ──

export interface ChannelRates {
  commissionPercent: number;
  fixedFee: number;
  freeShippingPercent: number;
}

export interface FeeRangeLike {
  minSaleCents: number;
  maxSaleCents: number | null;
  percentageFeeBps: number;
  fixedFeeCents: number;
}

export interface ChannelLike {
  percentageFeeBps: number;
  fixedFeeCents: number;
  shippingFeeBps: number;
  shippingFeeCents: number;
}

/**
 * Resolve comissão e taxa fixa de um canal para um preço de venda, usando as
 * faixas (fee ranges) quando existirem. Frete grátis vem sempre do canal.
 * salePriceReais e retorno em reais/percentuais.
 */
export function resolveChannelRates(
  channel: ChannelLike | null | undefined,
  ranges: FeeRangeLike[] | null | undefined,
  salePriceReais: number,
): ChannelRates {
  if (!channel) return { commissionPercent: 0, fixedFee: 0, freeShippingPercent: 0 };

  const freeShippingPercent = channel.shippingFeeBps / 100;
  const channelRanges = (ranges ?? []).slice();

  if (channelRanges.length === 0) {
    return {
      commissionPercent: channel.percentageFeeBps / 100,
      fixedFee: channel.fixedFeeCents / 100,
      freeShippingPercent,
    };
  }

  const saleCents = Math.round(salePriceReais * 100);
  const sorted = channelRanges.sort((a, b) => a.minSaleCents - b.minSaleCents);
  const tier =
    sorted.find((r) => {
      const max = r.maxSaleCents ?? Infinity;
      return saleCents >= r.minSaleCents && saleCents <= max;
    }) ?? (saleCents < sorted[0].minSaleCents ? sorted[0] : sorted[sorted.length - 1]);

  return {
    commissionPercent: tier.percentageFeeBps / 100,
    fixedFee: tier.fixedFeeCents / 100,
    freeShippingPercent,
  };
}
