// Endpoint único de leitura e ações da integração Shopee (tudo com escopo de empresa).
import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { getCompanyForUser } from "../../../db/companies";
import {
  getIntegrationsForCompany,
  getOwnedIntegration,
  getPendingItemsForCompany,
  getShopeeConfig,
  getSyncLogsForCompany,
  maskKey,
} from "../../../db/shopee";
import { shopeeConfigs, shopeeIntegrations } from "../../../db/schema";
import { getAppUser } from "../../current-user";
import { getShopeeEnv, syncIntegration, backfillOrders } from "../../../lib/shopee/sync";
import { buildAuthUrl } from "../../../lib/shopee/client";

const nowIso = () => new Date().toISOString();

async function requireCompany() {
  const user = await getAppUser();
  if (!user) return { error: Response.json({ error: "Não autenticado." }, { status: 401 }) };
  const company = await getCompanyForUser(user);
  if (!company) return { error: Response.json({ error: "Empresa não encontrada." }, { status: 400 }) };
  return { company };
}

/** GET: devolve tudo que a página precisa numa só chamada. */
export async function GET() {
  const { company, error } = await requireCompany();
  if (error) return error;

  const [config, integrations, pending, logs] = await Promise.all([
    getShopeeConfig(company.id),
    getIntegrationsForCompany(company.id),
    getPendingItemsForCompany(company.id),
    getSyncLogsForCompany(company.id),
  ]);

  return Response.json({
    config: {
      partnerId: config?.partnerId ?? "",
      partnerKeySet: Boolean(config?.partnerKey),
      partnerKeyHint: maskKey(config?.partnerKey),
      environment: config?.environment ?? "production",
    },
    integrations: integrations.map((i) => ({
      id: i.id,
      shopId: i.shopId,
      shopName: i.shopName,
      environment: i.environment,
      salesChannelId: i.salesChannelId,
      autoSyncSales: i.autoSyncSales,
      syncIntervalS: i.syncIntervalS,
      autoSyncAds: i.autoSyncAds,
      adsSyncIntervalS: i.adsSyncIntervalS,
      lastSyncAt: i.lastSyncAt,
      lastAdsSyncAt: i.lastAdsSyncAt,
    })),
    pending,
    logs,
  });
}

/** POST: todas as ações mutáveis via { action, ... }. */
export async function POST(request: Request) {
  const { company, error } = await requireCompany();
  if (error) return error;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(body?.action ?? "");
  const db = getDb();

  try {
    switch (action) {
      case "save-config": {
        const partnerId = String(body.partnerId ?? "").trim();
        const partnerKey = String(body.partnerKey ?? "").trim();
        const environment = body.environment === "sandbox" ? "sandbox" : "production";
        const existing = await getShopeeConfig(company.id);
        if (existing) {
          await db
            .update(shopeeConfigs)
            .set({
              partnerId,
              environment,
              ...(partnerKey ? { partnerKey } : {}),
              updatedAt: nowIso(),
            })
            .where(eq(shopeeConfigs.id, existing.id));
        } else {
          await db.insert(shopeeConfigs).values({
            id: crypto.randomUUID(),
            companyId: company.id,
            partnerId,
            partnerKey: partnerKey || null,
            environment,
          });
        }
        return Response.json({ ok: true });
      }

      case "auth-url": {
        const env = await getShopeeEnv(company.id);
        if (!env) return Response.json({ error: "Configure o Partner ID e a Partner Key primeiro." }, { status: 400 });
        const origin = new URL(request.url).origin;
        const redirect = `${origin}/api/shopee/callback`;
        const url = await buildAuthUrl(env, redirect);
        return Response.json({ url, redirect });
      }

      case "sync": {
        const integ = await getOwnedIntegration(company.id, String(body.id ?? ""));
        if (!integ) return Response.json({ error: "Loja não encontrada." }, { status: 404 });
        const result = await syncIntegration(integ.id);
        return Response.json(result);
      }

      case "ads-sync": {
        const integ = await getOwnedIntegration(company.id, String(body.id ?? ""));
        if (!integ) return Response.json({ error: "Loja não encontrada." }, { status: 404 });
        const { syncAdsSpend } = await import("../../../lib/shopee/ads");
        const result = await syncAdsSpend(integ.id);
        return Response.json(result);
      }

      case "backfill": {
        const integ = await getOwnedIntegration(company.id, String(body.id ?? ""));
        if (!integ) return Response.json({ error: "Loja não encontrada." }, { status: 404 });
        const fromStr = String(body.from ?? "");
        const from = fromStr ? new Date(`${fromStr}T00:00:00.000Z`) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        if (isNaN(from.getTime())) return Response.json({ error: "Data inicial inválida." }, { status: 400 });
        // roda em segundo plano; progresso fica no histórico
        void backfillOrders(integ.id, from);
        return Response.json({ ok: true, message: "Importação iniciada — acompanhe no histórico." });
      }

      case "patch-integration": {
        const integ = await getOwnedIntegration(company.id, String(body.id ?? ""));
        if (!integ) return Response.json({ error: "Loja não encontrada." }, { status: 404 });
        const patch: Record<string, unknown> = {};
        if (body.salesChannelId !== undefined) patch.salesChannelId = body.salesChannelId || null;
        if (body.autoSyncSales !== undefined) patch.autoSyncSales = Boolean(body.autoSyncSales);
        if (body.syncIntervalS !== undefined) patch.syncIntervalS = Math.max(60, Number(body.syncIntervalS));
        if (body.autoSyncAds !== undefined) patch.autoSyncAds = Boolean(body.autoSyncAds);
        if (body.adsSyncIntervalS !== undefined) patch.adsSyncIntervalS = Math.max(60, Number(body.adsSyncIntervalS));
        await db
          .update(shopeeIntegrations)
          .set(patch)
          .where(and(eq(shopeeIntegrations.id, integ.id), eq(shopeeIntegrations.companyId, company.id)));
        return Response.json({ ok: true });
      }

      case "delete-integration": {
        const integ = await getOwnedIntegration(company.id, String(body.id ?? ""));
        if (!integ) return Response.json({ error: "Loja não encontrada." }, { status: 404 });
        await db.delete(shopeeIntegrations).where(eq(shopeeIntegrations.id, integ.id));
        return Response.json({ ok: true });
      }

      default:
        return Response.json({ error: "Ação desconhecida." }, { status: 400 });
    }
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
