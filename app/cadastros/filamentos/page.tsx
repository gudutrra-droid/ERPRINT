import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCompanyForUser } from "../../../db/companies";
import { getFilamentsForCompany } from "../../../db/filaments";
import { Sidebar } from "../../components/sidebar";
import { requireAppUser } from "../../current-user";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Filamentos",
  description: "Cadastro de filamentos e custo de material por grama.",
};

type FilamentsPageProps = {
  searchParams: Promise<{ success?: string; error?: string; edit?: string }>;
};

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

function pricePerGram(valueCents: number) {
  return (valueCents / 100 / 1000).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
}

export default async function FilamentsPage({ searchParams }: FilamentsPageProps) {
  const user = await requireAppUser("/cadastros/filamentos");
  const company = await getCompanyForUser(user);
  if (!company) redirect("/onboarding");

  const filamentList = await getFilamentsForCompany(company.id);
  const { success, error, edit } = await searchParams;
  const editingFilament = edit ? filamentList.find((filament) => filament.id === edit) ?? null : null;
  const activeCount = filamentList.filter((filament) => filament.active).length;

  return (
    <div className="app-shell">
      <Sidebar
        companyName={company.name}
        userEmail={user.email}
        provider={user.provider}
        active="filaments"
      />

      <main className="main-content settings-main printers-main">
        <div className="settings-container printers-container">
          <header className="settings-header printers-header">
            <div>
              <p className="eyebrow">Materiais</p>
              <h1>Filamentos</h1>
              <p>Cadastre o custo por quilo de cada material para calcular automaticamente o valor usado em cada peça.</p>
            </div>
            <span className="company-status"><i aria-hidden="true" /> {activeCount} {activeCount === 1 ? "ativo" : "ativos"}</span>
          </header>

          {success ? <p className="settings-message success" role="status">{success}</p> : null}
          {error ? <p className="settings-message error" role="alert">{error}</p> : null}

          <div className="printers-workspace">
            <section className="printer-form-card" aria-labelledby="filament-form-title">
              <div className="printer-card-heading">
                <span className="printer-form-icon filament-form-icon" aria-hidden="true"><span className="filament-glyph" /></span>
                <div>
                  <p className="eyebrow">{editingFilament ? "Edição" : "Novo material"}</p>
                  <h2 id="filament-form-title">{editingFilament ? "Editar filamento" : "Cadastrar filamento"}</h2>
                </div>
              </div>

              <form className="printer-form" action="/api/filaments" method="post">
                <input type="hidden" name="intent" value="save" />
                {editingFilament ? <input type="hidden" name="filamentId" value={editingFilament.id} /> : null}

                <label>
                  <span>Nome do filamento</span>
                  <input name="name" required minLength={2} maxLength={80} defaultValue={editingFilament?.name ?? ""} placeholder="Ex.: PLA Premium" autoFocus />
                  <small>Use um nome que diferencie o material durante a precificação.</small>
                </label>
                <div className="printer-form-row">
                  <label>
                    <span>Material</span>
                    <select name="material" required defaultValue={editingFilament?.material ?? "PLA"}>
                      <option value="PLA">PLA</option>
                      <option value="PETG">PETG</option>
                      <option value="ABS">ABS</option>
                      <option value="ASA">ASA</option>
                      <option value="TPU">TPU</option>
                      <option value="PA">Nylon (PA)</option>
                      <option value="PC">Policarbonato (PC)</option>
                      <option value="HIPS">HIPS</option>
                      <option value="PVA">PVA</option>
                      <option value="OTHER">Outro</option>
                    </select>
                  </label>
                  <label>
                    <span>Marca <small>opcional</small></span>
                    <input name="brand" maxLength={80} defaultValue={editingFilament?.brand ?? ""} placeholder="Ex.: Voolt3D" />
                  </label>
                </div>
                <label>
                  <span>Valor pago por quilo</span>
                  <div className="input-affix prefix printer-power-input">
                    <b>R$</b>
                    <input name="pricePerKg" type="number" inputMode="decimal" required min="0.01" max="1000000" step="0.01" defaultValue={editingFilament ? inputMoney(editingFilament.pricePerKgCents) : ""} placeholder="89,90" />
                    <em>/ kg</em>
                  </div>
                  <small>Informe o valor equivalente a 1 kg, independentemente do peso da embalagem.</small>
                </label>

                <div className="printer-form-actions">
                  {editingFilament ? <Link href="/cadastros/filamentos">Cancelar</Link> : null}
                  <button className="primary-button" type="submit">
                    {editingFilament ? "Salvar alterações" : "Cadastrar filamento"}
                  </button>
                </div>
              </form>

              <aside className="energy-note filament-note">
                <span aria-hidden="true">R$/g</span>
                <p><strong>Como será calculado</strong>Valor por quilo ÷ 1.000 × gramagem utilizada na peça.</p>
              </aside>
            </section>

            <section className="printer-list-card" aria-labelledby="filament-list-title">
              <div className="printer-list-heading">
                <div>
                  <p className="eyebrow">Materiais</p>
                  <h2 id="filament-list-title">Filamentos cadastrados</h2>
                </div>
                <span>{filamentList.length}</span>
              </div>

              {filamentList.length === 0 ? (
                <div className="printer-empty-state">
                  <span aria-hidden="true"><span className="filament-glyph" /></span>
                  <h3>Nenhum filamento cadastrado</h3>
                  <p>Use o formulário ao lado para adicionar o primeiro material.</p>
                </div>
              ) : (
                <div className="printer-list">
                  {filamentList.map((filament) => (
                    <article className={`printer-row filament-row${filament.active ? "" : " inactive"}`} key={filament.id}>
                      <span className="printer-row-icon filament-row-icon" aria-hidden="true"><span className="filament-glyph" /></span>
                      <div className="printer-identity">
                        <h3>{filament.name}</h3>
                        <p>{filament.material}{filament.brand ? ` · ${filament.brand}` : ""}</p>
                        <small>Cor não utilizada no cálculo</small>
                      </div>
                      <div className="printer-metrics filament-metrics">
                        <span><small>Quilo</small><strong>{displayMoney(filament.pricePerKgCents)}</strong></span>
                        <span><small>Grama</small><strong>{pricePerGram(filament.pricePerKgCents)}<em>/g</em></strong></span>
                      </div>
                      <span className={`printer-status${filament.active ? " active" : ""}`}>
                        <i aria-hidden="true" /> {filament.active ? "Ativo" : "Inativo"}
                      </span>
                      <div className="printer-actions">
                        <Link href={`/cadastros/filamentos?edit=${encodeURIComponent(filament.id)}`}>Editar</Link>
                        <form action="/api/filaments" method="post">
                          <input type="hidden" name="intent" value="toggle" />
                          <input type="hidden" name="filamentId" value={filament.id} />
                          <button type="submit">{filament.active ? "Desativar" : "Ativar"}</button>
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
