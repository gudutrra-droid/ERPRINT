import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCompanyForUser } from "../../../db/companies";
import { Sidebar } from "../../components/sidebar";
import { requireAppUser } from "../../current-user";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dados da empresa",
  description: "Dados cadastrais, fiscais e operacionais da empresa no ERPrint.",
};

type CompanySettingsProps = {
  searchParams: Promise<{ success?: string; error?: string }>;
};

function formatCnpj(value: string | null) {
  const digits = value?.replace(/\D/g, "") ?? "";
  if (digits.length !== 14) return value ?? "";
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function formatPostalCode(value: string | null) {
  const digits = value?.replace(/\D/g, "") ?? "";
  if (digits.length !== 8) return value ?? "";
  return digits.replace(/^(\d{5})(\d{3})$/, "$1-$2");
}

function decimalValue(value: number) {
  return (value / 100).toFixed(2);
}

export default async function CompanySettings({ searchParams }: CompanySettingsProps) {
  const user = await requireAppUser("/configuracoes/empresa");
  const company = await getCompanyForUser(user);
  if (!company) redirect("/onboarding");
  const { success, error } = await searchParams;

  return (
    <div className="app-shell">
      <Sidebar
        companyName={company.name}
        userEmail={user.email}
        active="company"
      />

      <main className="main-content settings-main">
        <div className="settings-container">
          <header className="settings-header">
            <div>
              <p className="eyebrow">Configurações</p>
              <h1>Dados da empresa</h1>
              <p>Centralize as informações usadas nos documentos, custos e cálculos do ERP.</p>
            </div>
            <span className="company-status"><i aria-hidden="true" /> Cadastro ativo</span>
          </header>

          {success ? <p className="settings-message success" role="status">{success}</p> : null}
          {error ? <p className="settings-message error" role="alert">{error}</p> : null}

          <form className="settings-form" action="/api/companies/settings" method="post">
            <section className="settings-section" aria-labelledby="identification-title">
              <div className="section-heading">
                <span>01</span>
                <div>
                  <h2 id="identification-title">Identificação</h2>
                  <p>Informações cadastrais e fiscais que identificam o negócio.</p>
                </div>
              </div>

              <div className="settings-fields">
                <label className="field-span-6">
                  <span>Nome fantasia</span>
                  <input name="name" required minLength={2} maxLength={120} defaultValue={company.name} autoComplete="organization" />
                </label>
                <label className="field-span-6">
                  <span>Razão social <small>opcional</small></span>
                  <input name="legalName" maxLength={160} defaultValue={company.legalName ?? ""} />
                </label>
                <label className="field-span-4">
                  <span>CNPJ <small>opcional</small></span>
                  <input name="cnpj" inputMode="numeric" maxLength={18} defaultValue={formatCnpj(company.cnpj)} placeholder="00.000.000/0000-00" />
                </label>
                <label className="field-span-4">
                  <span>Inscrição estadual <small>opcional</small></span>
                  <input name="stateRegistration" maxLength={30} defaultValue={company.stateRegistration ?? ""} />
                </label>
                <label className="field-span-4">
                  <span>Inscrição municipal <small>opcional</small></span>
                  <input name="municipalRegistration" maxLength={30} defaultValue={company.municipalRegistration ?? ""} />
                </label>
                <label className="field-span-6">
                  <span>Segmento</span>
                  <select name="segment" defaultValue={company.segment} required>
                    <option value="3d-printing">Impressão 3D</option>
                    <option value="maker">Produtos maker</option>
                    <option value="manufacturing">Manufatura</option>
                    <option value="retail">Comércio e marketplace</option>
                    <option value="other">Outro</option>
                  </select>
                </label>
                <label className="field-span-6">
                  <span>E-mail do proprietário</span>
                  <input value={company.ownerEmail} disabled aria-describedby="owner-email-help" />
                  <small id="owner-email-help" className="field-help">Vinculado à conta principal e não editável aqui.</small>
                </label>
              </div>
            </section>

            <section className="settings-section" aria-labelledby="contact-title">
              <div className="section-heading">
                <span>02</span>
                <div>
                  <h2 id="contact-title">Contato e endereço</h2>
                  <p>Dados comerciais e localização principal da operação.</p>
                </div>
              </div>

              <div className="settings-fields">
                <label className="field-span-4">
                  <span>E-mail comercial <small>opcional</small></span>
                  <input name="businessEmail" type="email" maxLength={160} defaultValue={company.businessEmail ?? ""} autoComplete="email" placeholder="contato@suaempresa.com" />
                </label>
                <label className="field-span-4">
                  <span>Telefone <small>opcional</small></span>
                  <input name="phone" type="tel" maxLength={30} defaultValue={company.phone ?? ""} autoComplete="tel" placeholder="(00) 00000-0000" />
                </label>
                <label className="field-span-4">
                  <span>Site <small>opcional</small></span>
                  <input name="website" type="url" maxLength={240} defaultValue={company.website ?? ""} autoComplete="url" placeholder="https://suaempresa.com" />
                </label>
                <label className="field-span-3">
                  <span>CEP <small>opcional</small></span>
                  <input name="postalCode" inputMode="numeric" maxLength={9} defaultValue={formatPostalCode(company.postalCode)} autoComplete="postal-code" placeholder="00000-000" />
                </label>
                <label className="field-span-6">
                  <span>Logradouro <small>opcional</small></span>
                  <input name="street" maxLength={160} defaultValue={company.street ?? ""} autoComplete="address-line1" placeholder="Rua, avenida ou estrada" />
                </label>
                <label className="field-span-3">
                  <span>Número <small>opcional</small></span>
                  <input name="addressNumber" maxLength={20} defaultValue={company.addressNumber ?? ""} />
                </label>
                <label className="field-span-4">
                  <span>Complemento <small>opcional</small></span>
                  <input name="addressComplement" maxLength={100} defaultValue={company.addressComplement ?? ""} autoComplete="address-line2" />
                </label>
                <label className="field-span-4">
                  <span>Bairro <small>opcional</small></span>
                  <input name="district" maxLength={100} defaultValue={company.district ?? ""} />
                </label>
                <label className="field-span-4">
                  <span>Cidade <small>opcional</small></span>
                  <input name="city" maxLength={100} defaultValue={company.city ?? ""} autoComplete="address-level2" />
                </label>
                <label className="field-span-3">
                  <span>UF <small>opcional</small></span>
                  <input name="state" maxLength={2} defaultValue={company.state ?? ""} autoComplete="address-level1" placeholder="SP" />
                </label>
                <label className="field-span-5">
                  <span>País</span>
                  <input name="country" maxLength={80} defaultValue={company.country} autoComplete="country-name" />
                </label>
              </div>
            </section>

            <section className="settings-section" aria-labelledby="fiscal-title">
              <div className="section-heading">
                <span>03</span>
                <div>
                  <h2 id="fiscal-title">Fiscal e regional</h2>
                  <p>Parâmetros padrão para impostos, valores e datas.</p>
                </div>
              </div>

              <div className="settings-fields">
                <label className="field-span-6">
                  <span>Regime tributário</span>
                  <select name="taxRegime" defaultValue={company.taxRegime} required>
                    <option value="mei">MEI</option>
                    <option value="simples_nacional">Simples Nacional</option>
                    <option value="lucro_presumido">Lucro Presumido</option>
                    <option value="lucro_real">Lucro Real</option>
                    <option value="other">Outro</option>
                  </select>
                </label>
                <label className="field-span-6">
                  <span>Alíquota padrão de imposto</span>
                  <div className="input-affix"><input name="taxRate" type="number" inputMode="decimal" min="0" max="100" step="0.01" defaultValue={decimalValue(company.taxRateBps)} /><b>%</b></div>
                  <small className="field-help">Usada como referência inicial nos cálculos de venda.</small>
                </label>
                <label className="field-span-6">
                  <span>Moeda padrão</span>
                  <select name="currency" defaultValue={company.currency} required>
                    <option value="BRL">Real brasileiro (BRL)</option>
                    <option value="USD">Dólar americano (USD)</option>
                    <option value="EUR">Euro (EUR)</option>
                  </select>
                </label>
                <label className="field-span-6">
                  <span>Fuso horário</span>
                  <select name="timezone" defaultValue={company.timezone} required>
                    <option value="America/Sao_Paulo">Brasília — São Paulo</option>
                    <option value="America/Manaus">Amazonas — Manaus</option>
                    <option value="America/Cuiaba">Mato Grosso — Cuiabá</option>
                    <option value="America/Rio_Branco">Acre — Rio Branco</option>
                  </select>
                </label>
              </div>
            </section>

            <section className="settings-section cost-section" aria-labelledby="cost-title">
              <div className="section-heading">
                <span>04</span>
                <div>
                  <h2 id="cost-title">Custos e precificação</h2>
                  <p>Valores-base para calcular o custo real dos produtos impressos.</p>
                </div>
              </div>

              <div className="settings-fields">
                <label className="field-span-4">
                  <span>Tarifa de energia</span>
                  <div className="input-affix prefix"><b>R$</b><input name="electricityRate" type="number" inputMode="decimal" min="0" max="1000" step="0.01" defaultValue={decimalValue(company.electricityRateCents)} /><em>/ kWh</em></div>
                  <small className="field-help">Consulte o valor total por kWh na conta de luz.</small>
                </label>
                <label className="field-span-4">
                  <span>Custos fixos mensais</span>
                  <div className="input-affix prefix"><b>R$</b><input name="monthlyFixedCosts" type="number" inputMode="decimal" min="0" max="1000000000" step="0.01" defaultValue={decimalValue(company.monthlyFixedCostsCents)} /></div>
                  <small className="field-help">Aluguel, internet, sistemas e outros custos recorrentes.</small>
                </label>
                <label className="field-span-4">
                  <span>Margem de lucro padrão</span>
                  <div className="input-affix"><input name="defaultProfitMargin" type="number" inputMode="decimal" min="0" max="1000" step="0.01" defaultValue={decimalValue(company.defaultProfitMarginBps)} /><b>%</b></div>
                  <small className="field-help">Ponto de partida para sugestões de preço.</small>
                </label>
              </div>
            </section>

            <footer className="settings-actions">
              <div>
                <strong>Salvar alterações</strong>
                <span>Os novos valores serão usados nos próximos cálculos.</span>
              </div>
              <button className="primary-button" type="submit">Salvar dados da empresa</button>
            </footer>
          </form>
        </div>
      </main>
    </div>
  );
}
