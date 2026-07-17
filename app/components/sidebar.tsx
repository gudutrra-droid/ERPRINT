import { LogoutButton } from "./logout-button";

type SidebarProps = {
  companyName: string;
  userEmail: string;
  provider: "password" | "chatgpt";
};

export function Sidebar({ companyName, userEmail, provider }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">E</div>
        <div><strong>ERPrint</strong><span>Gestão integrada</span></div>
      </div>

      <div className="sidebar-footer">
        <div className="company-avatar" aria-hidden="true">
          {companyName.slice(0, 1).toUpperCase()}
        </div>
        <div className="company-identity">
          <strong>{companyName}</strong>
          <span>{userEmail}</span>
        </div>
        <LogoutButton provider={provider} />
      </div>
    </aside>
  );
}
