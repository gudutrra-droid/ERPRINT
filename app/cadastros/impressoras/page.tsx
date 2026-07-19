import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCompanyForUser } from "../../../db/companies";
import { getPrintersForCompany } from "../../../db/printers";
import { Sidebar } from "../../components/sidebar";
import { requireAppUser } from "../../current-user";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Impressoras",
  description: "Cadastro de impressoras 3D e consumo elétrico da operação.",
};

type PrintersPageProps = {
  searchParams: Promise<{ success?: string; error?: string; edit?: string }>;
};

function inputPower(powerWatts: number) {
  return String(powerWatts);
}

function displayPower(powerWatts: number) {
  return powerWatts.toLocaleString("pt-BR");
}

function inputMoney(valueCents: number) {
  return (valueCents / 100).toFixed(2);
}

function displayMoney(valueCents: number) {
  return (valueCents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function depreciationPerHour(valueCents: number, usefulLifeHours: number) {
  if (!usefulLifeHours) return "Não informado";
  return (valueCents / 100 / usefulLifeHours).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
}

export default async function PrintersPage({ searchParams }: PrintersPageProps) {
  const user = await requireAppUser("/cadastros/impressoras");
  const company = await getCompanyForUser(user);
  if (!company) redirect("/onboarding");

  const printerList = await getPrintersForCompany(company.id);
  const { success, error, edit } = await searchParams;
  const editingPrinter = edit ? printerList.find((printer) => printer.id === edit) ?? null : null;
  const activeCount = printerList.filter((printer) => printer.active).length;

  return (
    <div className="app-shell">
      <Sidebar
        companyName={company.name}
        userEmail={user.email}
        active="printers"
      />

      <main className="main-content settings-main printers-main">
        <div className="settings-container printers-container">
          <header className="settings-header printers-header">
            <div>
              <p className="eyebrow">Produção</p>
              <h1>Impressoras</h1>
              <p>Cadastre os equipamentos usados na fabricação e informe a potência para calcular o custo de energia.</p>
            </div>
            <span className="company-status"><i aria-hidden="true" /> {activeCount} {activeCount === 1 ? "ativa" : "ativas"}</span>
          </header>

          {success ? <p className="settings-message success" role="status">{success}</p> : null}
          {error ? <p className="settings-message error" role="alert">{error}</p> : null}

          <div className="printers-workspace">
            <section className="printer-form-card" aria-labelledby="printer-form-title">
              <div className="printer-card-heading">
                <span className="printer-form-icon" aria-hidden="true"><span className="printer-glyph" /></span>
                <div>
                  <p className="eyebrow">{editingPrinter ? "Edição" : "Novo equipamento"}</p>
                  <h2 id="printer-form-title">{editingPrinter ? "Editar impressora" : "Cadastrar impressora"}</h2>
                </div>
              </div>

              <form className="printer-form" action="/api/printers" method="post">
                <input type="hidden" name="intent" value="save" />
                {editingPrinter ? <input type="hidden" name="printerId" value={editingPrinter.id} /> : null}

                <label>
                  <span>Nome da impressora</span>
                  <input name="name" required minLength={2} maxLength={80} defaultValue={editingPrinter?.name ?? ""} placeholder="Ex.: Ender da bancada 01" autoFocus />
                  <small>Use um nome fácil de reconhecer durante a precificação.</small>
                </label>
                <div className="printer-form-row">
                  <label>
                    <span>Marca</span>
                    <input name="brand" required minLength={2} maxLength={80} defaultValue={editingPrinter?.brand ?? ""} placeholder="Ex.: Creality" />
                  </label>
                  <label>
                    <span>Modelo</span>
                    <input name="model" required minLength={1} maxLength={100} defaultValue={editingPrinter?.model ?? ""} placeholder="Ex.: Ender-3 V3 KE" />
                  </label>
                </div>
                <div className="printer-form-row">
                  <label>
                    <span>Valor pago</span>
                    <div className="input-affix prefix printer-power-input">
                      <b>R$</b>
                      <input name="purchasePrice" type="number" inputMode="decimal" required min="0.01" max="100000000" step="0.01" defaultValue={editingPrinter ? inputMoney(editingPrinter.purchasePriceCents) : ""} placeholder="2.500,00" />
                    </div>
                    <small>Valor total de aquisição do equipamento.</small>
                  </label>
                  <label>
                    <span>Vida útil estimada</span>
                    <div className="input-affix printer-power-input">
                      <input name="usefulLifeHours" type="number" inputMode="numeric" required min="1" max="1000000" step="1" defaultValue={editingPrinter?.usefulLifeHours || ""} placeholder="10.000" />
                      <b>horas</b>
                    </div>
                    <small>Total de horas de trabalho antes da substituição.</small>
                  </label>
                </div>
                <label>
                  <span>Consumo energético</span>
                  <div className="input-affix printer-power-input">
                    <input name="powerWhPerHour" type="number" inputMode="decimal" required min="1" max="100000" step="1" defaultValue={editingPrinter ? inputPower(editingPrinter.powerWatts) : ""} placeholder="350" />
                    <b>Wh/h</b>
                  </div>
                  <small>Informe quantos watt-hora a impressora consome a cada hora de trabalho.</small>
                </label>

                <div className="printer-form-actions">
                  {editingPrinter ? <Link href="/cadastros/impressoras">Cancelar</Link> : null}
                  <button className="primary-button" type="submit">
                    {editingPrinter ? "Salvar alterações" : "Cadastrar impressora"}
                  </button>
                </div>
              </form>

              <aside className="energy-note">
                <span aria-hidden="true">R$/h</span>
                <p><strong>Como será calculado</strong>Depreciação: valor pago ÷ vida útil. Energia: Wh/h ÷ 1.000 × tarifa por kWh.</p>
              </aside>
            </section>

            <section className="printer-list-card" aria-labelledby="printer-list-title">
              <div className="printer-list-heading">
                <div>
                  <p className="eyebrow">Equipamentos</p>
                  <h2 id="printer-list-title">Impressoras cadastradas</h2>
                </div>
                <span>{printerList.length}</span>
              </div>

              {printerList.length === 0 ? (
                <div className="printer-empty-state">
                  <span aria-hidden="true"><span className="printer-glyph" /></span>
                  <h3>Nenhuma impressora cadastrada</h3>
                  <p>Use o formulário ao lado para adicionar o primeiro equipamento.</p>
                </div>
              ) : (
                <div className="printer-list">
                  {printerList.map((printer) => (
                    <article className={`printer-row${printer.active ? "" : " inactive"}`} key={printer.id}>
                      <span className="printer-row-icon" aria-hidden="true"><span className="printer-glyph" /></span>
                      <div className="printer-identity">
                        <h3>{printer.name}</h3>
                        <p>{printer.brand} · {printer.model}</p>
                        <small>{displayMoney(printer.purchasePriceCents)} · {printer.usefulLifeHours.toLocaleString("pt-BR")} h de vida útil</small>
                      </div>
                      <div className="printer-metrics">
                        <span><small>Energia</small><strong>{displayPower(printer.powerWatts)} Wh/h</strong></span>
                        <span><small>Depreciação</small><strong>{depreciationPerHour(printer.purchasePriceCents, printer.usefulLifeHours)}<em>/h</em></strong></span>
                      </div>
                      <span className={`printer-status${printer.active ? " active" : ""}`}>
                        <i aria-hidden="true" /> {printer.active ? "Ativa" : "Inativa"}
                      </span>
                      <div className="printer-actions">
                        <Link href={`/cadastros/impressoras?edit=${encodeURIComponent(printer.id)}`}>Editar</Link>
                        <form action="/api/printers" method="post">
                          <input type="hidden" name="intent" value="toggle" />
                          <input type="hidden" name="printerId" value={printer.id} />
                          <button type="submit">{printer.active ? "Desativar" : "Ativar"}</button>
                        </form>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
