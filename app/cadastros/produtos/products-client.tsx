"use client";

import { useMemo, useState } from "react";
import { calculatePricing, resolveChannelRates } from "../../../lib/pricing";

type Printer = { id: string; name: string; powerWatts: number; purchasePriceCents: number; usefulLifeHours: number };
type Filament = { id: string; name: string; pricePerKgCents: number };
type Supply = { id: string; name: string; unitPriceTenThousandths: number };
type Channel = { id: string; name: string; percentageFeeBps: number; fixedFeeCents: number; shippingFeeBps: number; shippingFeeCents: number };
type FeeRange = { salesChannelId: string; minSaleCents: number; maxSaleCents: number | null; percentageFeeBps: number; fixedFeeCents: number };
type Refs = {
  printers: Printer[];
  filaments: Filament[];
  supplies: Supply[];
  channels: Channel[];
  feeRanges: FeeRange[];
  company: { kwhCost: number; paysTax: boolean; taxRate: number };
};
type SupplyLine = { supplyId: string; quantity: number };
type Product = {
  id: string;
  name: string;
  productType: string;
  active: boolean;
  salePriceCents: number;
  printerId: string | null;
  filamentId: string | null;
  printTimeHours: number;
  printTimeMinutes: number;
  filamentGrams: number;
  batchUnits: number;
  purchaseCostCents: number;
  salesChannelId: string | null;
  supplies: SupplyLine[];
  productionCostCents: number;
  channelCostCents: number;
  taxCostCents: number;
  profitCents: number;
  margin: number;
};

const money = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
function parseReais(v: string): number {
  const raw = v.trim();
  if (!raw) return 0;
  const n = Number(raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw);
  return Number.isFinite(n) ? n : 0;
}

type FormState = {
  productId: string;
  name: string;
  productType: "production" | "resale";
  salePrice: string;
  salesChannelId: string;
  printerId: string;
  filamentId: string;
  printTimeHours: string;
  printTimeMinutes: string;
  filamentGrams: string;
  batchUnits: string;
  purchaseCost: string;
  supplies: { supplyId: string; quantity: string }[];
};

const emptyForm = (): FormState => ({
  productId: "",
  name: "",
  productType: "production",
  salePrice: "",
  salesChannelId: "",
  printerId: "",
  filamentId: "",
  printTimeHours: "",
  printTimeMinutes: "",
  filamentGrams: "",
  batchUnits: "1",
  purchaseCost: "",
  supplies: [],
});

export function ProductsClient({ products, refs }: { products: Product[]; refs: Refs }) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditing = Boolean(form.productId);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const preview = useMemo(() => {
    const isResale = form.productType === "resale";
    const printer = refs.printers.find((p) => p.id === form.printerId);
    const filament = refs.filaments.find((f) => f.id === form.filamentId);
    const channel = refs.channels.find((c) => c.id === form.salesChannelId);
    const salePrice = parseReais(form.salePrice);
    const suppliesCost = form.supplies.reduce((sum, s) => {
      const sup = refs.supplies.find((x) => x.id === s.supplyId);
      return sup ? sum + (sup.unitPriceTenThousandths / 10000) * parseReais(s.quantity) : sum;
    }, 0);
    const rates = resolveChannelRates(
      channel,
      channel ? refs.feeRanges.filter((r) => r.salesChannelId === channel.id) : [],
      salePrice,
    );
    // Lote: tempo e filamento informados são o TOTAL da impressão; divide por peça.
    const batch = Math.max(1, Math.trunc(parseReais(form.batchUnits)) || 1);
    const perUnitMinutes =
      (parseReais(form.printTimeHours) * 60 + parseReais(form.printTimeMinutes)) / batch;

    return calculatePricing({
      printTimeHours: isResale ? 0 : Math.floor(perUnitMinutes / 60),
      printTimeMinutes: isResale ? 0 : perUnitMinutes % 60,
      printerPurchasePrice: isResale || !printer ? 0 : printer.purchasePriceCents / 100,
      printerLifespanHours: isResale || !printer ? 1 : printer.usefulLifeHours || 1,
      printerWattage: isResale || !printer ? 0 : printer.powerWatts,
      kwhCost: isResale ? 0 : refs.company.kwhCost,
      filamentPricePerKg: isResale || !filament ? 0 : filament.pricePerKgCents / 100,
      filamentGrams: isResale ? 0 : parseReais(form.filamentGrams) / batch,
      suppliesCost,
      commissionPercent: rates.commissionPercent,
      fixedFee: rates.fixedFee,
      freeShippingPercent: rates.freeShippingPercent,
      paysTax: refs.company.paysTax,
      taxRate: refs.company.taxRate,
      salePrice,
      purchaseCost: isResale ? parseReais(form.purchaseCost) : 0,
    });
  }, [form, refs]);

  const batchUnits = Math.max(1, Math.trunc(parseReais(form.batchUnits)) || 1);
  const perUnitLabel = useMemo(() => {
    const totalMin = parseReais(form.printTimeHours) * 60 + parseReais(form.printTimeMinutes);
    const perUnit = totalMin / batchUnits;
    const h = Math.floor(perUnit / 60);
    const m = Math.round(perUnit % 60);
    return {
      time: h > 0 ? `${h}h ${m}min` : `${m}min`,
      grams: `${(parseReais(form.filamentGrams) / batchUnits).toFixed(1)} g`,
    };
  }, [form.printTimeHours, form.printTimeMinutes, form.filamentGrams, batchUnits]);

  const editProduct = (p: Product) => {
    setError(null);
    setForm({
      productId: p.id,
      name: p.name,
      productType: p.productType === "resale" ? "resale" : "production",
      salePrice: p.salePriceCents ? (p.salePriceCents / 100).toString() : "",
      salesChannelId: p.salesChannelId ?? "",
      printerId: p.printerId ?? "",
      filamentId: p.filamentId ?? "",
      printTimeHours: p.printTimeHours ? String(p.printTimeHours) : "",
      printTimeMinutes: p.printTimeMinutes ? String(p.printTimeMinutes) : "",
      filamentGrams: p.filamentGrams ? String(p.filamentGrams) : "",
      batchUnits: String(p.batchUnits || 1),
      purchaseCost: p.purchaseCostCents ? (p.purchaseCostCents / 100).toString() : "",
      supplies: p.supplies.map((s) => ({ supplyId: s.supplyId, quantity: String(s.quantity) })),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const post = async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = (await res.json().catch(() => ({}))) as any;
    if (!res.ok) throw new Error(json?.error ?? `Erro ${res.status}`);
    return json;
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await post({
        action: "save",
        productId: form.productId || undefined,
        name: form.name,
        productType: form.productType,
        salePrice: form.salePrice,
        salesChannelId: form.salesChannelId,
        printerId: form.printerId,
        filamentId: form.filamentId,
        printTimeHours: form.printTimeHours,
        printTimeMinutes: form.printTimeMinutes,
        filamentGrams: form.filamentGrams,
        batchUnits: form.batchUnits,
        purchaseCost: form.purchaseCost,
        supplies: form.supplies.filter((s) => s.supplyId),
      });
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  const toggle = async (p: Product) => {
    try {
      await post({ action: "toggle", productId: p.id });
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const remove = async (p: Product) => {
    if (!window.confirm(`Excluir "${p.name}"? As vendas já importadas continuam salvas.`)) return;
    try {
      await post({ action: "delete", productId: p.id });
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const addSupply = () => set("supplies", [...form.supplies, { supplyId: "", quantity: "1" }]);
  const updateSupply = (i: number, patch: Partial<{ supplyId: string; quantity: string }>) =>
    set("supplies", form.supplies.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const removeSupply = (i: number) => set("supplies", form.supplies.filter((_, idx) => idx !== i));

  return (
    <div className="printers-workspace products-workspace">
      <section className="printer-form-card product-form-card">
        <div className="printer-card-heading">
          <span className="printer-form-icon product-form-icon" aria-hidden="true"><span className="dashboard-glyph" /></span>
          <div>
            <p className="eyebrow">{isEditing ? "Edição" : "Novo produto"}</p>
            <h2>{isEditing ? "Editar produto" : "Cadastrar produto"}</h2>
          </div>
        </div>

        <div className="type-switch" role="tablist" aria-label="Tipo de produto">
          <button type="button" role="tab" aria-selected={form.productType === "production"} onClick={() => set("productType", "production")}>
            Impresso 3D
          </button>
          <button type="button" role="tab" aria-selected={form.productType === "resale"} onClick={() => set("productType", "resale")}>
            Revenda
          </button>
        </div>

        <div className="printer-form">
          <label>
            <span>Nome do produto</span>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex.: Suporte de talheres — Preto" maxLength={120} />
          </label>

          {form.productType === "production" ? (
            <>
              <div className="printer-form-row">
                <label>
                  <span>Impressora</span>
                  <select value={form.printerId} onChange={(e) => set("printerId", e.target.value)}>
                    <option value="">Selecione…</option>
                    {refs.printers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </label>
                <label>
                  <span>Filamento</span>
                  <select value={form.filamentId} onChange={(e) => set("filamentId", e.target.value)}>
                    <option value="">Selecione…</option>
                    {refs.filaments.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </label>
              </div>
              <label className="batch-field">
                <span>Peças por impressão <small>lote</small></span>
                <div className="input-affix"><input type="number" min="1" step="1" value={form.batchUnits} onChange={(e) => set("batchUnits", e.target.value)} placeholder="1" /><b>peça(s)</b></div>
                <small>
                  {batchUnits > 1
                    ? `Informe o tempo e o filamento TOTAIS da impressão — o app divide por ${batchUnits} para achar o custo de cada peça.`
                    : "Se você imprime várias peças de uma vez, aumente aqui e informe o tempo e o filamento totais do lote."}
                </small>
              </label>

              <div className="printer-form-row">
                <label>
                  <span>Tempo de impressão {batchUnits > 1 ? <small>total do lote</small> : null}</span>
                  <div className="time-inputs">
                    <div className="input-affix"><input type="number" min="0" value={form.printTimeHours} onChange={(e) => set("printTimeHours", e.target.value)} placeholder="0" /><b>h</b></div>
                    <div className="input-affix"><input type="number" min="0" max="59" value={form.printTimeMinutes} onChange={(e) => set("printTimeMinutes", e.target.value)} placeholder="0" /><b>min</b></div>
                  </div>
                </label>
                <label>
                  <span>Filamento usado {batchUnits > 1 ? <small>total do lote</small> : null}</span>
                  <div className="input-affix"><input type="number" min="0" step="0.1" value={form.filamentGrams} onChange={(e) => set("filamentGrams", e.target.value)} placeholder="0" /><b>g</b></div>
                </label>
              </div>

              {batchUnits > 1 ? (
                <p className="batch-hint">
                  Por peça: <strong>{perUnitLabel.time}</strong> de impressão e <strong>{perUnitLabel.grams}</strong> de filamento.
                </p>
              ) : null}

              <div className="supplies-block">
                <div className="supplies-head">
                  <span>Insumos <small>embalagem, etiqueta, etc.</small></span>
                  <button type="button" className="range-add-button" onClick={addSupply}><span>+</span> Adicionar</button>
                </div>
                {form.supplies.length === 0 ? (
                  <p className="supplies-empty">Nenhum insumo — opcional.</p>
                ) : (
                  form.supplies.map((s, i) => (
                    <div className="supply-line" key={i}>
                      <select value={s.supplyId} onChange={(e) => updateSupply(i, { supplyId: e.target.value })}>
                        <option value="">Selecione o insumo…</option>
                        {refs.supplies.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                      </select>
                      <div className="input-affix"><input type="number" min="0" step="0.01" value={s.quantity} onChange={(e) => updateSupply(i, { quantity: e.target.value })} /><b>un</b></div>
                      <button type="button" className="range-remove-button" onClick={() => removeSupply(i)} aria-label="Remover">×</button>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <label>
              <span>Custo de compra <small>quanto você paga no produto</small></span>
              <div className="input-affix prefix"><b>R$</b><input type="number" min="0" step="0.01" value={form.purchaseCost} onChange={(e) => set("purchaseCost", e.target.value)} placeholder="0,00" /></div>
            </label>
          )}

          <div className="printer-form-row">
            <label>
              <span>Canal de venda</span>
              <select value={form.salesChannelId} onChange={(e) => set("salesChannelId", e.target.value)}>
                <option value="">Selecione…</option>
                {refs.channels.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label>
              <span>Preço de venda <small>referência</small></span>
              <div className="input-affix prefix"><b>R$</b><input type="number" min="0" step="0.01" value={form.salePrice} onChange={(e) => set("salePrice", e.target.value)} placeholder="0,00" /></div>
            </label>
          </div>

          {error ? <p className="auth-error">{error}</p> : null}

          <div className="printer-form-actions">
            {isEditing ? <a onClick={() => { setForm(emptyForm()); setError(null); }} style={{ cursor: "pointer" }}>Cancelar</a> : null}
            <button className="primary-button" onClick={save} disabled={busy}>
              {busy ? "Salvando…" : isEditing ? "Salvar alterações" : "Cadastrar produto"}
            </button>
          </div>
        </div>

        <div className="cost-preview" aria-label="Prévia de custo">
          <div className="cost-preview-head">Prévia do custo</div>
          <div className="cost-line"><span>Custo de produção</span><strong>{money(Math.round(preview.productionCost * 100))}</strong></div>
          <div className="cost-line"><span>Taxas do canal</span><strong>{money(Math.round(preview.channelCost * 100))}</strong></div>
          {refs.company.paysTax ? <div className="cost-line"><span>Imposto</span><strong>{money(Math.round(preview.taxCost * 100))}</strong></div> : null}
          <div className="cost-line total"><span>Lucro por venda</span><strong className={preview.profit >= 0 ? "pos" : "neg"}>{money(Math.round(preview.profit * 100))}</strong></div>
          <div className="cost-line sub"><span>Margem</span><strong>{preview.margin.toFixed(1)}%</strong></div>
        </div>
      </section>

      <section className="printer-list-card">
        <div className="printer-list-heading">
          <div>
            <p className="eyebrow">Catálogo</p>
            <h2>Produtos cadastrados</h2>
          </div>
          <span>{products.length}</span>
        </div>

        {products.length === 0 ? (
          <div className="printer-empty-state">
            <span aria-hidden="true"><span className="dashboard-glyph" /></span>
            <h3>Nenhum produto cadastrado</h3>
            <p>Cadastre seu primeiro produto ao lado. Depois é só vincular aos anúncios da Shopee.</p>
          </div>
        ) : (
          <div className="printer-list">
            {products.map((p) => (
              <article className={`product-row${p.active ? "" : " inactive"}`} key={p.id}>
                <div className="printer-identity">
                  <h3>{p.name}</h3>
                  <p>
                    {p.productType === "resale" ? "Revenda" : "Impresso 3D"} · Venda {money(p.salePriceCents)}
                    {p.productType !== "resale" && p.batchUnits > 1 ? ` · lote de ${p.batchUnits}` : ""}
                  </p>
                </div>
                <div className="product-metrics">
                  <span><small>Custo prod.</small><strong>{money(p.productionCostCents)}</strong></span>
                  <span><small>Lucro</small><strong className={p.profitCents >= 0 ? "pos" : "neg"}>{money(p.profitCents)}</strong></span>
                  <span><small>Margem</small><strong>{p.margin.toFixed(0)}%</strong></span>
                </div>
                <div className="printer-actions">
                  <button onClick={() => editProduct(p)}>Editar</button>
                  <button onClick={() => toggle(p)}>{p.active ? "Desativar" : "Ativar"}</button>
                  <button onClick={() => remove(p)}>Excluir</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
