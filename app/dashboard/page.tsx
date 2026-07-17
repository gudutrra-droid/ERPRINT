import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCompanyForUser } from "../../db/companies";
import { Sidebar } from "../components/sidebar";
import { requireAppUser } from "../current-user";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bem-vindo",
  description: "Espaço de trabalho da sua empresa no ERPrint.",
};

export default async function Dashboard() {
  const user = await requireAppUser("/dashboard");
  const company = await getCompanyForUser(user);
  if (!company) redirect("/onboarding");

  return (
    <div className="app-shell">
      <Sidebar
        companyName={company.name}
        userEmail={user.email}
        provider={user.provider}
      />

      <main className="main-content">
        <section className="welcome-state" aria-labelledby="welcome-title">
          <p>Bem-vindo ao ERPrint</p>
          <h1 id="welcome-title">{company.name}</h1>
        </section>
      </main>
    </div>
  );
}
