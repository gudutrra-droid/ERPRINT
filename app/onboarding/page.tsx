import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCompanyForUser } from "../../db/companies";
import { LogoutButton } from "../components/logout-button";
import { requireAppUser } from "../current-user";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Configurar empresa",
  description: "Crie o espaço de trabalho da sua empresa no ERPrint.",
};

type OnboardingProps = { searchParams: Promise<{ error?: string }> };

export default async function Onboarding({ searchParams }: OnboardingProps) {
  const user = await requireAppUser("/onboarding");
  const company = await getCompanyForUser(user);
  if (company) redirect("/dashboard");
  const { error } = await searchParams;

  return (
    <main className="onboarding-shell">
      <header className="onboarding-header">
        <Link className="auth-brand" href="/" aria-label="ERPrint — início">
          <span className="brand-glyph" aria-hidden="true">E</span>
          <span>ERPrint</span>
        </Link>
        <div className="user-chip">
          <span>{user.displayName}</span>
          <LogoutButton provider={user.provider} />
        </div>
      </header>

      <section className="onboarding-grid">
        <div className="onboarding-intro">
          <p className="eyebrow">Primeiros passos</p>
          <h1>Vamos preparar<br />seu espaço.</h1>
          <p>Alguns dados agora deixam o ERP pronto para representar sua operação.</p>

          <ol className="setup-steps" aria-label="Etapas de configuração">
            <li className="done"><span>1</span><div><strong>Conta</strong><small>Identidade confirmada</small></div></li>
            <li className="current"><span>2</span><div><strong>Empresa</strong><small>Dados do negócio</small></div></li>
            <li><span>3</span><div><strong>Pronto</strong><small>Seu painel ERPrint</small></div></li>
          </ol>
        </div>

        <div className="setup-card">
          <div className="setup-card-heading">
            <span className="step-number">02</span>
            <div>
              <p className="eyebrow">Seu negócio</p>
              <h2>Configure sua empresa</h2>
              <p>Você poderá editar essas informações mais tarde.</p>
            </div>
          </div>

          {error ? <p className="form-error" role="alert">{error}</p> : null}

          <form className="company-form" action="/api/companies" method="post">
            <label>
              <span>Nome da empresa</span>
              <input name="name" required minLength={2} maxLength={120} placeholder="Ex.: Duttra Impressão 3D" autoComplete="organization" autoFocus />
            </label>
            <div className="form-row">
              <label>
                <span>CNPJ <small>opcional</small></span>
                <input name="cnpj" inputMode="numeric" maxLength={18} placeholder="00.000.000/0000-00" autoComplete="off" />
              </label>
              <label>
                <span>Segmento</span>
                <select name="segment" defaultValue="3d-printing" required>
                  <option value="3d-printing">Impressão 3D</option>
                  <option value="maker">Produtos maker</option>
                  <option value="manufacturing">Manufatura</option>
                  <option value="retail">Comércio e marketplace</option>
                  <option value="other">Outro</option>
                </select>
              </label>
            </div>
            <button className="primary-button" type="submit">
              Criar espaço de trabalho <span aria-hidden="true">→</span>
            </button>
          </form>
          <p className="privacy-note">Seus dados ficam protegidos e são usados somente para operar o ERPrint.</p>
        </div>
      </section>
    </main>
  );
}
