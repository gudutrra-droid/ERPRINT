// Contexto de custo: carrega tudo que o motor de precificação precisa e monta
// o breakdown de um produto. Usado pela tela de Produtos (prévia ao vivo) e
// pela importação da Shopee (snapshot congelado no momento da venda).
import { eq, inArray } from "drizzle-orm";
import { getDb } from ".";
import {
  companies,
  filaments,
  printers,
  productSupplies,
  products,
  salesChannelFeeRanges,
  salesChannels,
  supplies,
} from "./schema";
import { calculatePricing, resolveChannelRates, type PricingBreakdown } from "../lib/pricing";

export interface CostContext {
  printers: (typeof printers.$inferSelect)[];
  filaments: (typeof filaments.$inferSelect)[];
  supplies: (typeof supplies.$inferSelect)[];
  productSupplies: (typeof productSupplies.$inferSelect)[];
  channels: (typeof salesChannels.$inferSelect)[];
  feeRanges: (typeof salesChannelFeeRanges.$inferSelect)[];
  company: { kwhCost: number; paysTax: boolean; taxRate: number } | null;
}

export async function loadCostContext(companyId: string): Promise<CostContext> {
  const db = getDb();
  const [printerRows, filamentRows, supplyRows, channelRows, companyRows] = await Promise.all([
    db.select().from(printers).where(eq(printers.companyId, companyId)),
    db.select().from(filaments).where(eq(filaments.companyId, companyId)),
    db.select().from(supplies).where(eq(supplies.companyId, companyId)),
    db.select().from(salesChannels).where(eq(salesChannels.companyId, companyId)),
    db.select().from(companies).where(eq(companies.id, companyId)).limit(1),
  ]);

  const channelIds = channelRows.map((c) => c.id);
  const feeRanges = channelIds.length
    ? await db.select().from(salesChannelFeeRanges).where(inArray(salesChannelFeeRanges.salesChannelId, channelIds))
    : [];

  const productIds = (await db.select({ id: products.id }).from(products).where(eq(products.companyId, companyId))).map((p) => p.id);
  const psRows = productIds.length
    ? await db.select().from(productSupplies).where(inArray(productSupplies.productId, productIds))
    : [];

  const company = companyRows[0]
    ? {
        kwhCost: companyRows[0].electricityRateCents / 100,
        taxRate: companyRows[0].taxRateBps / 100,
        paysTax: companyRows[0].taxRateBps > 0,
      }
    : null;

  return {
    printers: printerRows,
    filaments: filamentRows,
    supplies: supplyRows,
    productSupplies: psRows,
    channels: channelRows,
    feeRanges,
    company,
  };
}

type ProductRow = typeof products.$inferSelect;

/** Custo dos insumos de um produto, em reais. */
function suppliesCostReais(product: ProductRow, ctx: CostContext): number {
  const list = ctx.productSupplies.filter((ps) => ps.productId === product.id);
  return list.reduce((sum, ps) => {
    const supply = ctx.supplies.find((s) => s.id === ps.supplyId);
    if (!supply) return sum;
    return sum + (supply.unitPriceTenThousandths / 10000) * ps.quantity;
  }, 0);
}

/**
 * Breakdown completo de custo/lucro de um produto para um preço de venda (reais).
 * Se salePriceReais não vier, usa o preço de venda cadastrado no produto.
 */
export function computeProductBreakdown(
  product: ProductRow,
  ctx: CostContext,
  salePriceReais?: number,
  channelIdOverride?: string | null,
): PricingBreakdown {
  const isResale = product.productType === "resale";
  const printer = product.printerId ? ctx.printers.find((p) => p.id === product.printerId) : null;
  const filament = product.filamentId ? ctx.filaments.find((f) => f.id === product.filamentId) : null;

  const channelId = channelIdOverride ?? product.salesChannelId;
  const channel = channelId ? ctx.channels.find((c) => c.id === channelId) : null;
  const salePrice = salePriceReais ?? product.salePriceCents / 100;
  const rates = resolveChannelRates(
    channel,
    channel ? ctx.feeRanges.filter((r) => r.salesChannelId === channel.id) : [],
    salePrice,
  );

  // Lote: tempo e filamento cadastrados são o TOTAL da impressão; divide por peça.
  const batch = Math.max(1, product.batchUnits || 1);
  const totalMinutes = (product.printTimeHours * 60 + product.printTimeMinutes) / batch;

  return calculatePricing({
    printTimeHours: isResale ? 0 : Math.floor(totalMinutes / 60),
    printTimeMinutes: isResale ? 0 : totalMinutes % 60,
    printerPurchasePrice: isResale || !printer ? 0 : printer.purchasePriceCents / 100,
    printerLifespanHours: isResale || !printer ? 1 : printer.usefulLifeHours || 1,
    printerWattage: isResale || !printer ? 0 : printer.powerWatts,
    kwhCost: isResale ? 0 : (ctx.company?.kwhCost ?? 0),
    filamentPricePerKg: isResale || !filament ? 0 : filament.pricePerKgCents / 100,
    filamentGrams: isResale ? 0 : product.filamentGrams / batch,
    suppliesCost: suppliesCostReais(product, ctx),
    commissionPercent: rates.commissionPercent,
    fixedFee: rates.fixedFee,
    freeShippingPercent: rates.freeShippingPercent,
    paysTax: ctx.company?.paysTax ?? false,
    taxRate: ctx.company?.taxRate ?? 0,
    salePrice,
    purchaseCost: isResale ? product.purchaseCostCents / 100 : 0,
  });
}

export interface SaleCostSnapshot {
  productionCostCents: number;
  channelCostCents: number;
  taxCostCents: number;
}

/** Custos unitários congelados para gravar na venda (em centavos). */
export function snapshotForSale(
  product: ProductRow,
  ctx: CostContext,
  salePriceReais: number,
  channelIdOverride?: string | null,
): SaleCostSnapshot {
  const b = computeProductBreakdown(product, ctx, salePriceReais, channelIdOverride);
  return {
    productionCostCents: Math.round(b.productionCost * 100),
    channelCostCents: Math.round(b.channelCost * 100),
    taxCostCents: Math.round(b.taxCost * 100),
  };
}
