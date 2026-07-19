import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { getCompanyForUser } from "../../../db/companies";
import { salesChannelFeeRanges, salesChannels } from "../../../db/schema";
import { getAppUser } from "../../current-user";

type RawFeeRange = {
  minValue?: unknown;
  maxValue?: unknown;
  percentageFee?: unknown;
  fixedFee?: unknown;
};

function channelsRedirect(
  request: Request,
  key: "success" | "error",
  message: string,
  editId?: string,
) {
  const url = new URL("/cadastros/canais-de-venda", request.url);
  url.searchParams.set(key, message);
  if (editId) url.searchParams.set("edit", editId);
  return Response.redirect(url, 303);
}

function decimalValue(value: unknown, fallback = 0) {
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  return Number(normalized);
}

function moneyCents(value: unknown, label: string, fallback = 0) {
  const amount = decimalValue(value, fallback);
  if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000) {
    throw new Error(`Informe um valor válido para ${label}.`);
  }
  return Math.round(amount * 100);
}

function percentageBps(value: unknown, label: string) {
  const percentage = decimalValue(value);
  if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
    throw new Error(`Informe um percentual válido para ${label}.`);
  }
  return Math.round(percentage * 100);
}

function parseFeeRanges(raw: FormDataEntryValue | null) {
  let input: unknown;
  try {
    input = JSON.parse(String(raw ?? "[]"));
  } catch {
    throw new Error("Não foi possível ler as faixas de taxas.");
  }

  if (!Array.isArray(input)) throw new Error("As faixas de taxas são inválidas.");
  if (input.length > 20) throw new Error("Cadastre no máximo 20 faixas por canal.");

  const ranges = input.map((item, index) => {
    const range = (item ?? {}) as RawFeeRange;
    const minRaw = String(range.minValue ?? "").trim();
    if (!minRaw) throw new Error(`Informe o valor inicial da faixa ${index + 1}.`);

    const minSaleCents = moneyCents(range.minValue, `o início da faixa ${index + 1}`);
    const maxRaw = String(range.maxValue ?? "").trim();
    const maxSaleCents = maxRaw
      ? moneyCents(range.maxValue, `o fim da faixa ${index + 1}`)
      : null;
    const percentageFeeBps = percentageBps(
      range.percentageFee,
      `a taxa da faixa ${index + 1}`,
    );
    const fixedFeeCents = moneyCents(range.fixedFee, `a taxa fixa da faixa ${index + 1}`);

    if (maxSaleCents !== null && maxSaleCents < minSaleCents) {
      throw new Error(`O valor final da faixa ${index + 1} deve ser maior ou igual ao inicial.`);
    }

    return { minSaleCents, maxSaleCents, percentageFeeBps, fixedFeeCents };
  }).sort((a, b) => a.minSaleCents - b.minSaleCents);

  for (let index = 1; index < ranges.length; index += 1) {
    const previous = ranges[index - 1];
    const current = ranges[index];
    if (previous.maxSaleCents === null) {
      throw new Error("Somente a última faixa pode ficar sem valor final.");
    }
    if (current.minSaleCents <= previous.maxSaleCents) {
      throw new Error("As faixas de valor não podem se sobrepor.");
    }
  }

  return ranges;
}

export async function POST(request: Request) {
  const user = await getAppUser();
  if (!user) return Response.json({ error: "Não autenticado." }, { status: 401 });

  const company = await getCompanyForUser(user);
  if (!company) return Response.redirect(new URL("/onboarding", request.url), 303);

  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "save");
  const channelId = String(formData.get("channelId") ?? "").trim();
  const db = getDb();

  const ownedChannel = channelId
    ? await db
        .select({ id: salesChannels.id, active: salesChannels.active })
        .from(salesChannels)
        .where(and(eq(salesChannels.id, channelId), eq(salesChannels.companyId, company.id)))
        .limit(1)
        .then(([channel]) => channel ?? null)
    : null;

  if (intent === "toggle") {
    if (!ownedChannel) return channelsRedirect(request, "error", "Canal não encontrado.");
    await db
      .update(salesChannels)
      .set({ active: !ownedChannel.active, updatedAt: new Date().toISOString() })
      .where(and(eq(salesChannels.id, ownedChannel.id), eq(salesChannels.companyId, company.id)));
    return channelsRedirect(
      request,
      "success",
      ownedChannel.active ? "Canal desativado." : "Canal ativado.",
    );
  }

  try {
    const name = String(formData.get("name") ?? "").trim();
    if (name.length < 2 || name.length > 80) {
      throw new Error("Informe um nome entre 2 e 80 caracteres.");
    }

    const values = {
      name,
      percentageFeeBps: percentageBps(formData.get("percentageFee"), "a taxa padrão"),
      fixedFeeCents: moneyCents(formData.get("fixedFee"), "a taxa fixa padrão"),
      shippingFeeBps: percentageBps(formData.get("shippingFeePercentage"), "a taxa de frete"),
      shippingFeeCents: moneyCents(formData.get("shippingFeeFixed"), "o frete fixo"),
      updatedAt: new Date().toISOString(),
    };
    const ranges = parseFeeRanges(formData.get("feeRanges"));

    if (channelId) {
      if (!ownedChannel) return channelsRedirect(request, "error", "Canal não encontrado.");
      const updateChannel = db
        .update(salesChannels)
        .set(values)
        .where(and(eq(salesChannels.id, ownedChannel.id), eq(salesChannels.companyId, company.id)));
      const removeOldRanges = db
        .delete(salesChannelFeeRanges)
        .where(eq(salesChannelFeeRanges.salesChannelId, ownedChannel.id));

      if (ranges.length > 0) {
        await db.batch([
          updateChannel,
          removeOldRanges,
          db.insert(salesChannelFeeRanges).values(ranges.map((range, position) => ({
            id: crypto.randomUUID(),
            salesChannelId: ownedChannel.id,
            ...range,
            position,
          }))),
        ]);
      } else {
        await db.batch([updateChannel, removeOldRanges]);
      }
      return channelsRedirect(request, "success", "Canal atualizado.");
    }

    const newChannelId = crypto.randomUUID();
    const insertChannel = db.insert(salesChannels).values({
      id: newChannelId,
      companyId: company.id,
      ...values,
    });
    if (ranges.length > 0) {
      await db.batch([
        insertChannel,
        db.insert(salesChannelFeeRanges).values(ranges.map((range, position) => ({
          id: crypto.randomUUID(),
          salesChannelId: newChannelId,
          ...range,
          position,
        }))),
      ]);
    } else {
      await insertChannel;
    }
    return channelsRedirect(request, "success", "Canal cadastrado.");
  } catch (error) {
    const duplicate = error instanceof Error && /unique|constraint/i.test(error.message);
    const message = duplicate
      ? "Já existe um canal com esse nome."
      : error instanceof Error
        ? error.message
        : "Não foi possível salvar o canal.";
    return channelsRedirect(request, "error", message, channelId || undefined);
  }
}
