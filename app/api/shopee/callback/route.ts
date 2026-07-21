// Retorno do fluxo de autorização da Shopee. A loja redireciona o navegador
// para cá com code + shop_id; trocamos por tokens e gravamos a integração.
// Como é navegação de topo no nosso domínio, o cookie de sessão vem junto —
// então escopamos pela empresa do usuário logado.
import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { getCompanyForUser } from "../../../../db/companies";
import { getShopeeConfig } from "../../../../db/shopee";
import { shopeeIntegrations } from "../../../../db/schema";
import { getAppUser } from "../../../current-user";
import { getAccessToken, getShopInfo, type ShopeeEnv } from "../../../../lib/shopee/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const shopPage = new URL("/integracoes/shopee", url.origin);

  const fail = (msg: string) => {
    shopPage.searchParams.set("error", msg);
    return Response.redirect(shopPage, 303);
  };

  const user = await getAppUser();
  if (!user) return Response.redirect(new URL("/", url.origin), 303);
  const company = await getCompanyForUser(user);
  if (!company) return Response.redirect(new URL("/onboarding", url.origin), 303);

  const code = String(url.searchParams.get("code") ?? "");
  const shopId = String(url.searchParams.get("shop_id") ?? "");
  if (!code || !shopId) return fail("Retorno da Shopee sem código de autorização.");

  const config = await getShopeeConfig(company.id);
  if (!config || !config.partnerId || !config.partnerKey) {
    return fail("Configuração da Shopee ausente.");
  }
  const env: ShopeeEnv = {
    partnerId: config.partnerId,
    partnerKey: config.partnerKey,
    environment: config.environment === "production" ? "production" : "sandbox",
  };

  try {
    const token = await getAccessToken(env, code, shopId);
    let shopName: string | null = null;
    try {
      const info = await getShopInfo(env, token.accessToken, shopId);
      shopName = info.shop_name ?? info.response?.shop_name ?? null;
    } catch {
      /* nome é opcional */
    }

    const db = getDb();
    // upsert manual por shop_id (uma loja só pode estar em uma empresa)
    const [current] = await db
      .select({ id: shopeeIntegrations.id })
      .from(shopeeIntegrations)
      .where(eq(shopeeIntegrations.shopId, shopId))
      .limit(1);

    const tokenExpiresAt = new Date(Date.now() + token.expiresInS * 1000).toISOString();
    if (current) {
      await db
        .update(shopeeIntegrations)
        .set({
          shopName: shopName ?? undefined,
          accessToken: token.accessToken,
          refreshToken: token.refreshToken,
          tokenExpiresAt,
          environment: env.environment,
        })
        .where(eq(shopeeIntegrations.id, current.id));
    } else {
      await db.insert(shopeeIntegrations).values({
        id: crypto.randomUUID(),
        companyId: company.id,
        shopId,
        shopName,
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        tokenExpiresAt,
        environment: env.environment,
      });
    }

    shopPage.searchParams.set("connected", "1");
    return Response.redirect(shopPage, 303);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Erro ao conectar a loja.");
  }
}
