"use client";

import Link from "next/link";
import { useState } from "react";

type FeeRange = {
  id: string;
  minSaleCents: number;
  maxSaleCents: number | null;
  percentageFeeBps: number;
  fixedFeeCents: number;
};

type EditableChannel = {
  id: string;
  name: string;
  percentageFeeBps: number;
  fixedFeeCents: number;
  shippingFeeBps: number;
  shippingFeeCents: number;
  feeRanges: FeeRange[];
};

type RangeDraft = {
  key: string;
  minValue: string;
  maxValue: string;
  percentageFee: string;
  fixedFee: string;
};

function moneyInput(value: number) {
  return (value / 100).toFixed(2);
}

function percentageInput(value: number) {
  return (value / 100).toFixed(2).replace(/\.00$/, "");
}

function draftFromRange(range: FeeRange): RangeDraft {
  return {
    key: range.id,
    minValue: moneyInput(range.minSaleCents),
    maxValue: range.maxSaleCents === null ? "" : moneyInput(range.maxSaleCents),
    percentageFee: percentageInput(range.percentageFeeBps),
    fixedFee: moneyInput(range.fixedFeeCents),
  };
}

function emptyRange(): RangeDraft {
  return {
    key: crypto.randomUUID(),
    minValue: "",
    maxValue: "",
    percentageFee: "",
    fixedFee: "",
  };
}

export function ChannelForm({ channel }: { channel: EditableChannel | null }) {
  const [ranges, setRanges] = useState<RangeDraft[]>(
    channel?.feeRanges.map(draftFromRange) ?? [],
  );

  function updateRange(key: string, field: keyof Omit<RangeDraft, "key">, value: string) {
    setRanges((current) => current.map((range) => (
      range.key === key ? { ...range, [field]: value } : range
    )));
  }

  return (
    <form className="printer-form channel-form" action="/api/sales-channels" method="post">
      <input type="hidden" name="intent" value="save" />
      <input
        type="hidden"
        name="feeRanges"
        value={JSON.stringify(ranges.map((range) => ({
          minValue: range.minValue,
          maxValue: range.maxValue,
          percentageFee: range.percentageFee,
          fixedFee: range.fixedFee,
        })))}
      />
      {channel ? <input type="hidden" name="channelId" value={channel.id} /> : null}

      <label>
        <span>Nome do canal</span>
        <input
          name="name"
          required
          minLength={2}
          maxLength={80}
          defaultValue={channel?.name ?? ""}
          placeholder="Ex.: Shopee"
          autoFocus
        />
      </label>

      <fieldset className="channel-fieldset">
        <legend>Taxas padrão</legend>
        <p>Aplicadas quando o valor da venda não se enquadrar em nenhuma faixa.</p>
        <div className="channel-fields-grid">
          <label>
            <span>Taxa percentual</span>
            <div className="input-affix">
              <input
                name="percentageFee"
                type="number"
                inputMode="decimal"
                min="0"
                max="100"
                step="0.01"
                defaultValue={channel ? percentageInput(channel.percentageFeeBps) : ""}
                placeholder="18"
              />
              <b>%</b>
            </div>
          </label>
          <label>
            <span>Taxa fixa</span>
            <div className="input-affix prefix">
              <b>R$</b>
              <input
                name="fixedFee"
                type="number"
                inputMode="decimal"
                min="0"
                max="1000000"
                step="0.01"
                defaultValue={channel ? moneyInput(channel.fixedFeeCents) : ""}
                placeholder="4,38"
              />
            </div>
          </label>
        </div>
      </fieldset>

      <fieldset className="channel-fieldset">
        <legend>Taxas de frete <small>opcional</small></legend>
        <p>Use percentual, valor fixo ou ambos quando o canal cobrar participação no frete.</p>
        <div className="channel-fields-grid">
          <label>
            <span>Frete percentual</span>
            <div className="input-affix">
              <input
                name="shippingFeePercentage"
                type="number"
                inputMode="decimal"
                min="0"
                max="100"
                step="0.01"
                defaultValue={channel ? percentageInput(channel.shippingFeeBps) : ""}
                placeholder="0"
              />
              <b>%</b>
            </div>
          </label>
          <label>
            <span>Frete fixo</span>
            <div className="input-affix prefix">
              <b>R$</b>
              <input
                name="shippingFeeFixed"
                type="number"
                inputMode="decimal"
                min="0"
                max="1000000"
                step="0.01"
                defaultValue={channel ? moneyInput(channel.shippingFeeCents) : ""}
                placeholder="0,00"
              />
            </div>
          </label>
        </div>
      </fieldset>

      <fieldset className="channel-fieldset channel-ranges-fieldset">
        <div className="channel-ranges-heading">
          <div>
            <legend>Faixas por valor da venda <small>opcional</small></legend>
            <p>Cada faixa substitui a taxa percentual e a taxa fixa padrão.</p>
          </div>
          <button type="button" className="range-add-button" onClick={() => setRanges((current) => [...current, emptyRange()])}>
            <span aria-hidden="true">+</span> Adicionar faixa
          </button>
        </div>

        {ranges.length === 0 ? (
          <p className="range-empty">Nenhuma faixa configurada. As taxas padrão serão usadas em todas as vendas.</p>
        ) : (
          <div className="fee-range-list">
            <div className="fee-range-labels" aria-hidden="true">
              <span>De (R$)</span><span>Até (R$)</span><span>Taxa %</span><span>Taxa fixa</span><span />
            </div>
            {ranges.map((range, index) => (
              <div className="fee-range-row" key={range.key}>
                <input
                  aria-label={`Valor inicial da faixa ${index + 1}`}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  required
                  value={range.minValue}
                  onChange={(event) => updateRange(range.key, "minValue", event.target.value)}
                  placeholder="0,00"
                />
                <input
                  aria-label={`Valor final da faixa ${index + 1}`}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={range.maxValue}
                  onChange={(event) => updateRange(range.key, "maxValue", event.target.value)}
                  placeholder="Sem limite"
                />
                <input
                  aria-label={`Taxa percentual da faixa ${index + 1}`}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="100"
                  step="0.01"
                  required
                  value={range.percentageFee}
                  onChange={(event) => updateRange(range.key, "percentageFee", event.target.value)}
                  placeholder="0"
                />
                <input
                  aria-label={`Taxa fixa da faixa ${index + 1}`}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  required
                  value={range.fixedFee}
                  onChange={(event) => updateRange(range.key, "fixedFee", event.target.value)}
                  placeholder="0,00"
                />
                <button
                  type="button"
                  className="range-remove-button"
                  aria-label={`Remover faixa ${index + 1}`}
                  onClick={() => setRanges((current) => current.filter((item) => item.key !== range.key))}
                >
                  ×
                </button>
              </div>
            ))}
            <small className="range-help">Deixe “Até” vazio somente na última faixa para indicar que ela não possui limite.</small>
          </div>
        )}
      </fieldset>

      <div className="printer-form-actions">
        {channel ? <Link href="/cadastros/canais-de-venda">Cancelar</Link> : null}
        <button className="primary-button" type="submit">
          {channel ? "Salvar alterações" : "Cadastrar canal"}
        </button>
      </div>
    </form>
  );
}
