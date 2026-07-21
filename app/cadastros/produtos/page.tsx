import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCompanyForUser } from "../../../db/companies";
import { loadCostContext, computeProductBreakdown } from "../../../db/cost";
import { getProductsForCompany } from "../../../db/products";
import { Sidebar } from "../../components/sidebar";
import { requireAppUser } from "../../current-user";
import { ProductsClient } from "./products-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Produtos",
  description: "Cadastro de produtos com cálculo de custo de produção e lucro.",
};

export default async function ProductsPage() {
  const user = await requireAppUser("/cadastros/produtos");
  const company = await getCompanyForUser(user);
  if (!company) redirect("/onboarding");

  const [productList, ctx] = await Promise.all([
    getProductsForCompany(company.id),
    loadCostContext(company.id),
  ]);

  const products = productList.map((p) => {
    const b = computeProductBreakdown(p, ctx);
    return {
      id: p.id,
      name: p.name,
      productType: p.productType,
      active: p.active,
      salePriceCents: p.salePriceCents,
      printerId: p.printerId,
      filamentId: p.filamentId,
      printTimeHours: p.printTimeHours,
      printTimeMinutes: p.printTimeMinutes,
      filamentGrams: p.filamentGrams,
      batchUnits: p.batchUnits,
      purchaseCostCents: p.purchaseCostCents,
      salesChannelId: p.salesChannelId,
      supplies: p.supplies.map((s) => ({ supplyId: s.supplyId, quantity: s.quantity })),
      productionCostCents: Math.round(b.productionCost * 100),
      channelCostCents: Math.round(b.channelCost * 100),
      taxCostCents: Math.round(b.taxCost * 100),
      profitCents: Math.round(b.profit * 100),
      margin: b.margin,
    };
  });

  const refs = {
    printers: ctx.printers
      .filter((p) => p.active)
      .map((p) => ({
        id: p.id,
        name: p.name,
        powerWatts: p.powerWatts,
        purchasePriceCents: p.purchasePriceCents,
        usefulLifeHours: p.usefulLifeHours,
      })),
    filaments: ctx.filaments
      .filter((f) => f.active)
      .map((f) => ({ id: f.id, name: f.name, pricePerKgCents: f.pricePerKgCents })),
    supplies: ctx.supplies
      .filter((s) => s.active)
      .map((s) => ({ id: s.id, name: s.name, unitPriceTenThousandths: s.unitPriceTenThousandths })),
    channels: ctx.channels
      .filter((c) => c.active)
      .map((c) => ({
        id: c.id,
        name: c.name,
        percentageFeeBps: c.percentageFeeBps,
        fixedFeeCents: c.fixedFeeCents,
        shippingFeeBps: c.shippingFeeBps,
        shippingFeeCents: c.shippingFeeCents,
      })),
    feeRanges: ctx.feeRanges.map((r) => ({
      salesChannelId: r.salesChannelId,
      minSaleCents: r.minSaleCents,
      maxSaleCents: r.maxSaleCents,
      percentageFeeBps: r.percentageFeeBps,
      fixedFeeCents: r.fixedFeeCents,
    })),
    company: {
      kwhCost: ctx.company?.kwhCost ?? 0,
      paysTax: ctx.company?.paysTax ?? false,
      taxRate: ctx.company?.taxRate ?? 0,
    },
  };

  return (
    <div className="app-shell">
      <Sidebar companyName={company.name} userEmail={user.email} active="products" />
      <main className="main-content settings-main">
        <div className="settings-container printers-container">
          <header className="settings-header">
            <div>
              <p className="eyebrow">Catálogo</p>
              <h1>Produtos</h1>
              <p>Cadastre seus produtos para o ERPrint calcular o custo real e descontar automaticamente nas vendas da Shopee.</p>
            </div>
            <span className="company-status"><i aria-hidden="true" /> {products.filter((p) => p.active).length} ativo(s)</span>
          </header>

          <ProductsClient products={products} refs={refs} />
        </div>
      </main>
    </div>
  );
}
