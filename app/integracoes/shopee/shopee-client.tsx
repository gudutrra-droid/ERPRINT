"use client";

import { useCallback, useEffect, useState } from "react";

type Config = {
  partnerId: string;
  partnerKeySet: boolean;
  partnerKeyHint: string | null;
  environment: string;
};
type Integration = {
  id: string;
  shopId: string;
  shopName: string | null;
  environment: string;
  salesChannelId: string | null;
  autoSyncSales: boolean;
  syncIntervalS: number;
  autoSyncAds: boolean;
  adsSyncIntervalS: number;
  lastSyncAt: string | null;
  lastAdsSyncAt: string | null;
};
type PendingItem = {
  id: string;
  shopeeItemName: string | null;
  shopeeItemId: string;
  shopeeSku: string | null;
  shopeeImageUrl: string | null;
  occurrences: number;
};
type SyncLog = {
  id: string;
  syncType: string;
  status: string;
  message: string | null;
  ordersImported: number;
  ordersPending: number;
  startedAt: string;
};
type Payload = { config: Config; integrations: Integration[]; pending: PendingItem[]; logs: SyncLog[] };
type Channel = { id: string; name: string };

type Toast = { kind: "success" | "error" | "info"; text: string } | null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function api(action: string, extra: Record<string, unknown> = {}): Promise<any> {
  const res = await fetch("/api/shopee", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...extra }),
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) throw new Error(json?.error ?? `Erro ${res.status}`);
  return json;
}

function fmtDateTime(iso: string | null) {
  if (!iso) return "nunca";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function ShopeeClient({ initial, channels }: { initial: Payload; channels: Channel[] }) {
  const [data, setData] = useState<Payload>(initial);
  const [tab, setTab] = useState<"conexao" | "pendentes" | "historico">("conexao");
  const [toast, setToast] = useState<Toast>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [partnerId, setPartnerId] = useState(initial.config.partnerId);
  const [partnerKey, setPartnerKey] = useState("");
  const [environment, setEnvironment] = useState(initial.config.environment);
  const [backfillFrom, setBackfillFrom] = useState("2024-01-01");

  const refresh = useCallback(async () => {
    const res = await fetch("/api/shopee");
    if (res.ok) setData(await res.json());
  }, []);

  useEffect(() => {
    const id = setInterval(refresh, 15000);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    const errorMsg = params.get("error");
    if (!connected && !errorMsg) return;
    window.history.replaceState({}, "", "/integracoes/shopee");
    // defer para fora do ciclo do efeito (evita set-state síncrono no effect)
    queueMicrotask(() => {
      if (connected) {
        setToast({ kind: "success", text: "Loja conectada! As vendas vão entrar sozinhas." });
        void refresh();
      } else if (errorMsg) {
        setToast({ kind: "error", text: errorMsg });
      }
    });
  }, [refresh]);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      setToast({ kind: "error", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(null);
    }
  };

  const saveConfig = () =>
    run("config", async () => {
      await api("save-config", { partnerId, partnerKey, environment });
      setPartnerKey("");
      setToast({ kind: "success", text: "Chaves salvas." });
      await refresh();
    });

  const connectShop = () =>
    run("connect", async () => {
      const { url } = await api("auth-url");
      window.open(url, "_blank");
      setToast({ kind: "info", text: "Autorize a loja na aba que abriu. Ao voltar, ela aparece aqui sozinha." });
    });

  const syncNow = (id: string) =>
    run(`sync-${id}`, async () => {
      const r = await api("sync", { id });
      setToast({ kind: "success", text: `${r.imported ?? 0} venda(s) nova(s), ${r.pending ?? 0} sem vínculo de produto.` });
      await refresh();
    });

  const syncAds = (id: string) =>
    run(`ads-${id}`, async () => {
      const r = await api("ads-sync", { id });
      setToast({ kind: "success", text: `ADS: ${r.created ?? 0} dia(s) novo(s), ${r.updated ?? 0} atualizado(s).` });
      await refresh();
    });

  const backfill = (id: string) =>
    run(`backfill-${id}`, async () => {
      await api("backfill", { id, from: backfillFrom });
      setToast({ kind: "success", text: "Importação do histórico iniciada — acompanhe em Histórico." });
      await refresh();
    });

  const patch = (id: string, p: Record<string, unknown>) =>
    run(`patch-${id}`, async () => {
      await api("patch-integration", { id, ...p });
      await refresh();
    });

  const disconnect = (id: string) =>
    run(`del-${id}`, async () => {
      if (!window.confirm("Desconectar esta loja? As vendas já importadas continuam salvas.")) return;
      await api("delete-integration", { id });
      setToast({ kind: "success", text: "Loja desconectada." });
      await refresh();
    });

  const { config, integrations, pending, logs } = data;

  return (
    <div className="shopee">
      {toast ? <div className={`shopee-toast ${toast.kind}`} role="status">{toast.text}</div> : null}

      <div className="shopee-tabs" role="tablist">
        <button role="tab" aria-selected={tab === "conexao"} onClick={() => setTab("conexao")}>Conexão</button>
        <button role="tab" aria-selected={tab === "pendentes"} onClick={() => setTab("pendentes")}>
          Sem vínculo{pending.length > 0 ? <span className="shopee-count">{pending.length}</span> : null}
        </button>
        <button role="tab" aria-selected={tab === "historico"} onClick={() => setTab("historico")}>Histórico</button>
      </div>

      {tab === "conexao" ? (
        <div className="shopee-stack">
          <section className="glass-card">
            <div className="card-head">
              <div>
                <p className="eyebrow">Passo 1</p>
                <h2>Chaves da API</h2>
              </div>
            </div>
            <p className="card-hint">
              No painel <a href="https://open.shopee.com" target="_blank" rel="noreferrer">open.shopee.com</a> → sua app → App Information.
              Use as chaves <b>Live</b> para a loja real; as de <b>Test</b> só funcionam no sandbox.
            </p>
            <div className="shopee-fields">
              <label>
                <span>Partner ID</span>
                <input value={partnerId} onChange={(e) => setPartnerId(e.target.value)} placeholder="2037214" inputMode="numeric" />
              </label>
              <label>
                <span>Partner Key {config.partnerKeySet ? <small>salva: {config.partnerKeyHint}</small> : null}</span>
                <input
                  type="password"
                  value={partnerKey}
                  onChange={(e) => setPartnerKey(e.target.value)}
                  placeholder={config.partnerKeySet ? "•••••• (deixe vazio para manter)" : "shpk..."}
                />
              </label>
              <label>
                <span>Ambiente</span>
                <select value={environment} onChange={(e) => setEnvironment(e.target.value)}>
                  <option value="production">Produção (loja real)</option>
                  <option value="sandbox">Sandbox (teste)</option>
                </select>
              </label>
            </div>
            <div className="card-actions">
              <button className="primary-button" onClick={saveConfig} disabled={busy === "config"}>
                {busy === "config" ? "Salvando…" : "Salvar chaves"}
              </button>
            </div>
          </section>

          <section className="glass-card">
            <div className="card-head">
              <div>
                <p className="eyebrow">Passo 2</p>
                <h2>Lojas conectadas</h2>
              </div>
              <button className="primary-button" onClick={connectShop} disabled={busy === "connect"}>
                Conectar loja Shopee
              </button>
            </div>
            <p className="card-hint">
              Depois de salvar as chaves, conecte a loja. Os pedidos novos entram sozinhos — a sincronização
              roda automaticamente <b>a cada 1 minuto</b>.
            </p>

            {integrations.length === 0 ? (
              <div className="shopee-empty">
                <p>Nenhuma loja conectada ainda.</p>
                <span>Salve as chaves acima e clique em “Conectar loja Shopee”.</span>
              </div>
            ) : (
              <div className="shopee-stores">
                {integrations.map((integ) => (
                  <article className="shopee-store" key={integ.id}>
                    <header>
                      <div>
                        <h3>
                          {integ.shopName ?? `Loja ${integ.shopId}`}
                          <span className={`env-badge ${integ.environment}`}>
                            {integ.environment === "production" ? "Produção" : "Sandbox"}
                          </span>
                        </h3>
                        <p>Shop ID {integ.shopId} · Última sync: {fmtDateTime(integ.lastSyncAt)}</p>
                      </div>
                      <div className="store-actions">
                        <button className="ghost-btn" onClick={() => syncNow(integ.id)} disabled={busy === `sync-${integ.id}`}>
                          {busy === `sync-${integ.id}` ? "Sincronizando…" : "Sincronizar agora"}
                        </button>
                        <button className="ghost-btn danger" onClick={() => disconnect(integ.id)} disabled={busy === `del-${integ.id}`}>
                          Desconectar
                        </button>
                      </div>
                    </header>

                    <div className="store-grid">
                      <label>
                        <span>Canal de venda <small>para custos/comissões</small></span>
                        <select
                          value={integ.salesChannelId ?? ""}
                          onChange={(e) => patch(integ.id, { salesChannelId: e.target.value })}
                        >
                          <option value="">Escolha o canal…</option>
                          {channels.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </label>

                      <div className="store-toggles">
                        <label className="switch-row">
                          <input
                            type="checkbox"
                            checked={integ.autoSyncSales}
                            onChange={(e) => patch(integ.id, { autoSyncSales: e.target.checked })}
                          />
                          <span>Vendas automáticas <small>a cada minuto</small></span>
                        </label>
                        <label className="switch-row">
                          <input
                            type="checkbox"
                            checked={integ.autoSyncAds}
                            onChange={(e) => patch(integ.id, { autoSyncAds: e.target.checked })}
                          />
                          <span>Gasto com ADS automático</span>
                          <button className="mini-btn" onClick={() => syncAds(integ.id)} disabled={busy === `ads-${integ.id}`}>
                            {busy === `ads-${integ.id}` ? "…" : "agora"}
                          </button>
                        </label>
                        <p className="store-note">Última sync de ADS: {fmtDateTime(integ.lastAdsSyncAt)}</p>
                      </div>

                      <div className="store-backfill">
                        <label>
                          <span>Importar histórico desde</span>
                          <input type="date" value={backfillFrom} onChange={(e) => setBackfillFrom(e.target.value)} />
                        </label>
                        <button className="ghost-btn" onClick={() => backfill(integ.id)} disabled={busy === `backfill-${integ.id}`}>
                          Importar
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}

      {tab === "pendentes" ? (
        <section className="glass-card">
          <div className="card-head">
            <div>
              <p className="eyebrow">Anúncios sem produto</p>
              <h2>Itens sem vínculo</h2>
            </div>
          </div>
          <p className="card-hint">
            Estes anúncios da Shopee já estão sendo vendidos e contam no faturamento. Quando o módulo de
            Produtos existir, você vincula cada um a um produto do app para calcular custo e lucro real.
          </p>
          {pending.length === 0 ? (
            <div className="shopee-empty"><p>Nenhum item pendente 🎉</p></div>
          ) : (
            <div className="pending-list">
              {pending.map((item) => (
                <div className="pending-row" key={item.id}>
                  {item.shopeeImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.shopeeImageUrl} alt="" />
                  ) : (
                    <div className="pending-thumb" aria-hidden="true" />
                  )}
                  <div className="pending-info">
                    <strong>{item.shopeeItemName ?? item.shopeeItemId}</strong>
                    <span>SKU: {item.shopeeSku || "—"} · {item.occurrences} venda(s)</span>
                  </div>
                  <span className="pending-tag">Aguardando catálogo</span>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {tab === "historico" ? (
        <section className="glass-card">
          <div className="card-head">
            <div>
              <p className="eyebrow">Sincronizações</p>
              <h2>Histórico</h2>
            </div>
          </div>
          {logs.length === 0 ? (
            <div className="shopee-empty"><p>Nenhuma sincronização ainda.</p></div>
          ) : (
            <div className="log-list">
              {logs.map((log) => (
                <div className="log-row" key={log.id}>
                  <span className="log-when">{fmtDateTime(log.startedAt)}</span>
                  <span className="log-type">
                    {log.syncType === "backfill" ? "Histórico" : log.syncType === "ads" ? "ADS" : "Pedidos"}
                  </span>
                  <span className={`log-status ${log.status}`}>
                    {log.status === "success" ? "OK" : log.status === "error" ? "Erro" : "Rodando"}
                  </span>
                  <span className="log-msg">{log.message}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
