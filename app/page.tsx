import type { Metadata } from "next";
import { ModuleCard } from "./components/module-card";
import { Sidebar } from "./components/sidebar";
import { StatCard } from "./components/stat-card";
import { modules } from "./lib/modules";

export const metadata: Metadata = {
  title: "Painel",
  description: "Visão geral da operação de produção 3D e vendas da ERPrint.",
};

export default function Home() {
  return (
    <div className="app-shell">
      <Sidebar />

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Visão geral</p>
            <h1>Bom trabalho, ERPrint.</h1>
          </div>
          <div className="topbar-actions">
            <span className="environment-badge">Base inicial</span>
            <button className="secondary-button" type="button">
              Configurar empresa
            </button>
          </div>
        </header>

        <section className="hero-card" aria-labelledby="hero-title">
          <div className="hero-copy">
            <span className="hero-kicker">ERP para impressão 3D</span>
            <h2 id="hero-title">Sua operação, da impressão à entrega.</h2>
            <p>
              A fundação do sistema está pronta. A partir daqui, cada módulo
              será construído com seus dados, regras e automações reais.
            </p>
          </div>
          <div className="hero-progress" aria-label="Progresso da implantação">
            <div className="progress-ring">
              <strong>0%</strong>
              <span>implantado</span>
            </div>
            <div>
              <strong>Próximo passo</strong>
              <span>Definir o primeiro módulo</span>
            </div>
          </div>
        </section>

        <section className="stats-grid" aria-label="Indicadores principais">
          <StatCard
            label="Pedidos em produção"
            value="0"
            detail="Fila ainda não configurada"
            tone="blue"
          />
          <StatCard
            label="Vendas Shopee"
            value="R$ 0"
            detail="Integração pendente"
            tone="orange"
          />
          <StatCard
            label="Produtos cadastrados"
            value="0"
            detail="Catálogo a ser criado"
            tone="violet"
          />
          <StatCard
            label="Resultado do mês"
            value="R$ 0"
            detail="Financeiro planejado"
            tone="green"
          />
        </section>

        <section className="dashboard-section" aria-labelledby="modules-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Mapa do sistema</p>
              <h2 id="modules-title">Módulos planejados</h2>
            </div>
            <span className="section-note">Construiremos um por vez</span>
          </div>

          <div className="modules-grid">
            {modules
              .filter((module) => module.id !== "dashboard")
              .map((module, index) => (
                <ModuleCard key={module.id} module={module} order={index + 1} />
              ))}
          </div>
        </section>

        <section className="foundation-card" aria-labelledby="foundation-title">
          <div>
            <p className="eyebrow">Etapa 0</p>
            <h2 id="foundation-title">Fundação do projeto</h2>
            <p>
              Estrutura modular, painel responsivo, banco preparado para evoluir
              e documentação do produto já fazem parte desta base.
            </p>
          </div>
          <ul className="checklist">
            <li><span aria-hidden="true">✓</span> Estrutura do aplicativo</li>
            <li><span aria-hidden="true">✓</span> Navegação dos módulos</li>
            <li><span aria-hidden="true">✓</span> Estratégia de dados</li>
            <li><span aria-hidden="true">✓</span> Versionamento seguro</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
