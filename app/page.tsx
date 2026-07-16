import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { chatGPTSignInPath, getChatGPTUser } from "./chatgpt-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Acesse a gestão integrada da sua operação de impressão 3D.",
};

export default async function Home() {
  const user = await getChatGPTUser();

  if (user) {
    const { getCompanyForUser } = await import("../db/companies");
    const company = await getCompanyForUser(user.email);
    redirect(company ? "/dashboard" : "/onboarding");
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-labelledby="login-title">
        <Link className="auth-brand" href="/" aria-label="ERPrint — início">
          <span className="brand-glyph" aria-hidden="true">E</span>
          <span>ERPrint</span>
        </Link>

        <div className="auth-copy">
          <p className="eyebrow">ERP para impressão 3D</p>
          <h1 id="login-title">Sua operação 3D,<br />em um só lugar.</h1>
          <p>
            Produção, pedidos, estoque e Shopee conectados em uma experiência
            simples, segura e feita para crescer com sua empresa.
          </p>
        </div>

        <div className="auth-action">
          <a className="primary-button chatgpt-button" href={chatGPTSignInPath("/onboarding")}>
            <span className="chatgpt-mark" aria-hidden="true">✦</span>
            Continuar com ChatGPT
            <span className="button-arrow" aria-hidden="true">→</span>
          </a>
          <p><span aria-hidden="true">●</span> Acesso seguro. Sem mais uma senha para lembrar.</p>
        </div>

        <footer className="auth-footer">© {new Date().getFullYear()} ERPrint · Duttra</footer>
      </section>

      <section className="spatial-stage" aria-label="Visão do espaço de trabalho ERPrint">
        <div className="stage-orb stage-orb-one" />
        <div className="stage-orb stage-orb-two" />
        <div className="stage-header">
          <div>
            <span className="stage-label">ESPAÇO DE TRABALHO</span>
            <strong>Operação conectada</strong>
          </div>
          <span className="live-pill"><i /> Tudo em ordem</span>
        </div>

        <div className="ghost-dashboard" aria-hidden="true">
          <div className="ghost-sidebar">
            <span className="ghost-logo">E</span>
            <i className="active" /><i /><i /><i /><i />
          </div>
          <div className="ghost-content">
            <div className="ghost-title"><span /><small /></div>
            <div className="ghost-stats">
              <article><span>PRODUÇÃO</span><strong>24</strong><i /></article>
              <article><span>PEDIDOS</span><strong>18</strong><i /></article>
              <article><span>ESTOQUE</span><strong>96%</strong><i /></article>
            </div>
            <div className="ghost-chart">
              <div className="chart-heading"><span /><small /></div>
              <div className="chart-bars">
                {[38, 56, 44, 72, 61, 88, 76, 94].map((height, index) => (
                  <i key={index} style={{ height: `${height}%` }} />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="stage-caption">
          <p>Do arquivo à entrega</p>
          <span>Uma visão limpa de cada etapa da sua operação.</span>
        </div>
      </section>
    </main>
  );
}
