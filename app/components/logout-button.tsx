"use client";

import { useState } from "react";
import { authClient } from "../lib/auth-client";

export function LogoutButton() {
  const [pending, setPending] = useState(false);

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
