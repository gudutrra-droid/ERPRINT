// Cliente da Shopee Open Platform API v2.
// Docs: https://open.shopee.com/documents — chamadas assinadas com HMAC-SHA256.
// Roda em Cloudflare Workers via Web Crypto (crypto.subtle), sem dependência de Node.
export interface ShopeeEnv {
  partnerId: string;
  partnerKey: string;
  environment: "sandbox" | "production";
  hostOverride?: string;
}

export function shopeeHost(env: ShopeeEnv): string {
  if (env.hostOverride) return env.hostOverride;
  return env.environment === "production"
    ? "https://partner.shopeemobile.com"
    : "https://openplatform.sandbox.test-stable.shopee.sg";
}

const encoder = new TextEncoder();

async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function signBase(env: ShopeeEnv, path: string, timestamp: number, accessToken?: string, shopId?: string): string {
  return `${env.partnerId}${path}${timestamp}${accessToken ?? ""}${shopId ?? ""}`;
}

export interface ShopeeCallOptions {
  method?: "GET" | "POST";
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  accessToken?: string;
  shopId?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function shopeeCall(env: ShopeeEnv, path: string, opts: ShopeeCallOptions = {}): Promise<any> {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = await hmacSha256Hex(
    env.partnerKey,
    signBase(env, path, timestamp, opts.accessToken, opts.shopId),
  );

  const params = new URLSearchParams();
  params.set("partner_id", env.partnerId);
  params.set("timestamp", String(timestamp));
  params.set("sign", signature);
  if (opts.accessToken) params.set("access_token", opts.accessToken);
  if (opts.shopId) params.set("shop_id", opts.shopId);
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined) params.set(k, String(v));
  }

  const url = `${shopeeHost(env)}${path}?${params.toString()}`;
  const res = await fetch(url, {
    method: opts.method ?? "GET",
    headers: { "Content-Type": "application/json" },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  const text = await res.text();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Resposta inválida da Shopee (HTTP ${res.status}): ${text.slice(0, 300)}`);
  }
  if (json.error && json.error !== "" && json.error !== 0) {
    throw new Error(`Shopee ${path}: ${json.error} — ${json.message ?? ""}`);
  }
  return json;
}

/** URL para o lojista autorizar o app na loja (abre no navegador). */
export async function buildAuthUrl(env: ShopeeEnv, redirectUrl: string): Promise<string> {
  const path = "/api/v2/shop/auth_partner";
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = await hmacSha256Hex(env.partnerKey, signBase(env, path, timestamp));
  const params = new URLSearchParams({
    partner_id: env.partnerId,
    timestamp: String(timestamp),
    sign: signature,
    redirect: redirectUrl,
  });
  return `${shopeeHost(env)}${path}?${params.toString()}`;
}

export async function getAccessToken(env: ShopeeEnv, code: string, shopId: string) {
  const json = await shopeeCall(env, "/api/v2/auth/token/get", {
    method: "POST",
    body: { code, shop_id: Number(shopId), partner_id: Number(env.partnerId) },
  });
  return {
    accessToken: json.access_token as string,
    refreshToken: json.refresh_token as string,
    expiresInS: Number(json.expire_in ?? 14400),
  };
}

export async function refreshAccessToken(env: ShopeeEnv, refreshToken: string, shopId: string) {
  const json = await shopeeCall(env, "/api/v2/auth/access_token/get", {
    method: "POST",
    body: { refresh_token: refreshToken, shop_id: Number(shopId), partner_id: Number(env.partnerId) },
  });
  return {
    accessToken: json.access_token as string,
    refreshToken: (json.refresh_token as string) ?? refreshToken,
    expiresInS: Number(json.expire_in ?? 14400),
  };
}

export async function getShopInfo(env: ShopeeEnv, accessToken: string, shopId: string) {
  return shopeeCall(env, "/api/v2/shop/get_shop_info", { accessToken, shopId });
}

export interface OrderListItem {
  order_sn: string;
  order_status?: string;
}

/** Lista pedidos num intervalo (máx. 15 dias por chamada). Pagina automaticamente. */
export async function listOrders(
  env: ShopeeEnv,
  accessToken: string,
  shopId: string,
  timeFrom: number,
  timeTo: number,
  timeRangeField: "create_time" | "update_time" = "update_time",
): Promise<OrderListItem[]> {
  const out: OrderListItem[] = [];
  let cursor = "";
  for (let page = 0; page < 200; page++) {
    const json = await shopeeCall(env, "/api/v2/order/get_order_list", {
      query: {
        time_range_field: timeRangeField,
        time_from: timeFrom,
        time_to: timeTo,
        page_size: 100,
        cursor: cursor || undefined,
        response_optional_fields: "order_status",
      },
      accessToken,
      shopId,
    });
    const resp = json.response ?? {};
    out.push(...(resp.order_list ?? []));
    if (!resp.more || !resp.next_cursor) break;
    cursor = resp.next_cursor;
  }
  return out;
}

export interface ShopeeOrderItem {
  item_id: number;
  item_name: string;
  item_sku?: string;
  model_id: number;
  model_name?: string;
  model_sku?: string;
  model_quantity_purchased: number;
  model_discounted_price: number;
  model_original_price?: number;
  image_info?: { image_url?: string };
}

export interface ShopeeOrderDetail {
  order_sn: string;
  order_status: string;
  create_time: number;
  update_time: number;
  buyer_username?: string;
  total_amount?: number;
  item_list: ShopeeOrderItem[];
}

export async function getOrderDetails(
  env: ShopeeEnv,
  accessToken: string,
  shopId: string,
  orderSns: string[],
): Promise<ShopeeOrderDetail[]> {
  const out: ShopeeOrderDetail[] = [];
  for (let i = 0; i < orderSns.length; i += 50) {
    const batch = orderSns.slice(i, i + 50);
    const json = await shopeeCall(env, "/api/v2/order/get_order_detail", {
      query: {
        order_sn_list: batch.join(","),
        response_optional_fields:
          "buyer_username,item_list,total_amount,order_status,create_time,update_time",
      },
      accessToken,
      shopId,
    });
    out.push(...((json.response?.order_list ?? []) as ShopeeOrderDetail[]));
  }
  return out;
}

/**
 * Gasto diário com anúncios CPC num intervalo. A API limita o intervalo ao
 * mesmo mês, então dividimos nas viradas de mês. Retorna mapa ISO(YYYY-MM-DD) → reais.
 */
export async function getAdsDailySpend(
  env: ShopeeEnv,
  accessToken: string,
  shopId: string,
  from: Date,
  to: Date,
): Promise<Map<string, number>> {
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmtShopee = (d: Date) => `${pad(d.getUTCDate())}-${pad(d.getUTCMonth() + 1)}-${d.getUTCFullYear()}`;
  const shopeeDateToIso = (s: string): string | null => {
    const m = String(s).match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    const m2 = String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m2) return s;
    return null;
  };

  const out = new Map<string, number>();
  const windows: Array<{ start: Date; end: Date }> = [];
  let cursor = new Date(from);
  while (cursor <= to) {
    const endOfMonth = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0));
    const end = endOfMonth < to ? endOfMonth : to;
    windows.push({ start: new Date(cursor), end });
    cursor = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate() + 1));
  }

  for (const w of windows) {
    const json = await shopeeCall(env, "/api/v2/ads/get_all_cpc_ads_daily_performance", {
      query: { start_date: fmtShopee(w.start), end_date: fmtShopee(w.end) },
      accessToken,
      shopId,
    });
    const resp = json.response ?? json.result ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: any[] = Array.isArray(resp) ? resp : (resp.day_list ?? resp.data ?? resp.list ?? []);
    for (const row of rows) {
      const iso = shopeeDateToIso(row.date ?? row.day ?? "");
      if (!iso) continue;
      const expense = Number(row.expense ?? row.cost ?? 0);
      if (!isFinite(expense)) continue;
      out.set(iso, Math.round(expense * 100) / 100);
    }
  }
  return out;
}
