import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCompanyForUser } from "../../../db/companies";
import { getSuppliesForCompany } from "../../../db/supplies";
import { Sidebar } from "../../components/sidebar";
import { requireAppUser } from "../../current-user";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Insumos",
  description: "Cadastro de insumos e custo unitário para precificação.",
};

type SuppliesPageProps = {
  searchParams: Promise<{ success?: string; error?: string; edit?: string }>;
};

const categoryLabels: Record<string, string> = {
  packaging: "Embalagem",
  hardware: "Ferragem",
  finishing: "Acabamento",
  electronics: "Eletrônico",
  adhesive: "Cola e adesivo",
  other: "Outro",
};

function inputUnitPrice(value: number) {
  return (value / 10_000).toFixed(4);
}

function displayUnitPrice(value: number) {
  return (value / 10_000).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
}

function displayQuantityCost(value: number, quantity: number) {
  return (value / 10_000 * quantity).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
}

export default async function SuppliesPage({ searchParams }: SuppliesPageProps) {
  const user = await requireAppUser("/cadastros/insumos");
  const company = await getCompanyForUser(user);
  if (!company) redirect("/onboarding");

  const supplyList = await getSuppliesForCompany(company.id);
  const { success, error, edit } = await searchParams;
  const editingSupply = edit ? supplyList.find((supply) => supply.id === edit) ?? null : null;
  const activeCount = supplyList.filter((supply) => supply.active).length;

  return (
    <div className="app-shell">
      <Sidebar
        companyName={company.name}
        userEmail={user.email}
        provider={user.provider}
        active="supplies"
      />

      <main className="main-content settings-main printers-main">
        <div className="settings-container printers-container">
          <header className="settings-header printers-header">
            <div>
              <p className="eyebrow">Materiais</p>
              <h1>Insumos</h1>
              <p>Cadastre itens consumidos por unidade para compor o custo exato de cada produto.</p>
            </div>
            <span className="company-status"><i aria-hidden="true" /> {activeCount} {activeCount === 1 ? "ativo" : "ativos"}</span>
          </header>

          {success ? <p className="settings-message success" role="status">{success}</p> : null}
          {error ? <p className="settings-message error" role="alert">{error}</p> : null}

          <div className="printers-workspace">
            <section className="printer-form-card" aria-labelledby="supply-form-title">
              <div className="printer-card-heading">
                <span className="printer-form-icon supply-form-icon" aria-hidden="true"><span className="supply-glyph" /></span>
                <div>
                  <p className="eyebrow">{editingSupply ? "Edição" : "Novo item"}</p>
                  <h2 id="supply-form-title">{editingSupply ? "Editar insumo" : "Cadastrar insumo"}</h2>
                </div>
              </div>

              <form className="printer-form" action="/api/supplies" method="post">
                <input type="hidden" name="intent" value="save" />
                {editingSupply ? <input type="hidden" name="supplyId" value={editingSupply.id} /> : null}

                <label>
                  <span>Nome do insumo</span>
                  <input name="name" required minLength={2} maxLength={100} defaultValue={editingSupply?.name ?? ""} placeholder="Ex.: Caixa para envio" autoFocus />
                  <small>Identifique claramente o item que será adicionado ao produto.</small>
                </label>
                <label>
                  <span>Categoria</span>
                  <select name="category" required defaultValue={editingSupply?.category ?? "packaging"}>
                    <option value="packaging">Embalagem</option>
                    <option value="hardware">Ferragem</option>
                    <option value="finishing">Acabamento</option>
                    <option value="electronics">Eletrônico</option>
                    <option value="adhesive">Cola e adesivo</option>
                    <option value="other">Outro</option>
                  </select>
                </label>
                <label>
                  <span>Valor por unidade</span>
                  <div className="input-affix prefix printer-power-input">
                    <b>R$</b>
                    <input name="unitPrice" type="number" inputMode="decimal" required min="0.0001" max="1000000" step="0.0001" defaultValue={editingSupply ? inputUnitPrice(editingSupply.unitPriceTenThousandths) : ""} placeholder="0,2500" />
                    <em>/ un</em>
                  </div>
                  <small>O valor aceita quatro casas decimais para manter precisão em itens baratos.</small>
                </label>

                <div className="printer-form-actions">
                  {editingSupply ? <Link href="/cadastros/insumos">Cancelar</Link> : null}
                  <button className="primary-button" type="submit">
                    {editingSupply ? "Salvar alterações" : "Cadastrar insumo"}
                  </button>
                </div>
              </form>

              <aside className="energy-note supply-note">
                <span aria-hidden="true">R$/un</span>
                <p><strong>Como será calculado</strong>Valor unitário × quantidade utilizada em cada produto.</p>
              </aside>
            </section>

            <section className="printer-list-card" aria-labelledby="supply-list-title">
              <div className="printer-list-heading">
                <div>
                  <p className="eyebrow">Itens</p>
                  <h2 id="supply-list-title">Insumos cadastrados</h2>
                </div>
                <span>{supplyList.length}</span>
              </div>

              {supplyList.length === 0 ? (
                <div className="printer-empty-state">
                  <span aria-hidden="true"><span className="supply-glyph" /></span>
                  <h3>Nenhum insumo cadastrado</h3>
                  <p>Use o formulário ao lado para adicionar o primeiro item.</p>
                </div>
              ) : (
                <div className="printer-list">
                  {supplyList.map((supply) => (
                    <article className={`printer-row supply-row${supply.active ? "" : " inactive"}`} key={supply.id}>
                      <span className="printer-row-icon supply-row-icon" aria-hidden="true"><span className="supply-glyph" /></span>
                      <div className="printer-identity">
                        <h3>{supply.name}</h3>
                        <p>{categoryLabels[supply.category] ?? "Outro"}</p>
                        <small>Adicionado por quantidade na precificação</small>
                      </div>
                      <div className="printer-metrics supply-metrics">
                        <span><small>Unidade</small><strong>{displayUnitPrice(supply.unitPriceTenThousandths)}</strong></span>
                        <span><small>10 un.</small><strong>{displayQuantityCost(supply.unitPriceTenThousandths, 10)}</strong></span>
                      </div>
                      <span className={`printer-status${supply.active ? " active" : ""}`}>
                        <i aria-hidden="true" /> {supply.active ? "Ativo" : "Inativo"}
                      </span>
                      <div className="printer-actions">
                        <Link href={`/cadastros/insumos?edit=${encodeURIComponent(supply.id)}`}>Editar</Link>
                        <form action="/api/supplies" method="post">
                          <input type="hidden" name="intent" value="toggle" />
                          <input type="hidden" name="supplyId" value={supply.id} />
                          <button type="submit">{supply.active ? "Desativar" : "Ativar"}</button>
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
