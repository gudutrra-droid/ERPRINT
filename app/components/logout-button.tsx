"use client";

import { useState } from "react";
import { authClient } from "../lib/auth-client";
import { chatGPTSignOutPath } from "../lib/chatgpt-auth-paths";

type LogoutButtonProps = { provider: "password" | "chatgpt" };

export function LogoutButton({ provider }: LogoutButtonProps) {
  const [pending, setPending] = useState(false);

  if (provider === "chatgpt") {
    return <a href={chatGPTSignOutPath("/")} aria-label="Sair do ERPrint">↗</a>;
  }

  return (
    <button
      className="logout-button"
      type="button"
      aria-label="Sair do ERPrint"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await authClient.signOut();
        window.location.assign("/");
      }}
    >
      ↗
    </button>
  );
}
