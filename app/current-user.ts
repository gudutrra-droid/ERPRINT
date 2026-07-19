import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getPasswordAuth } from "./lib/auth-server";

export type AppUser = {
  id: string;
  displayName: string;
  email: string;
  fullName: string | null;
};

export async function getAppUser(): Promise<AppUser | null> {
  const requestHeaders = await headers();
  const cookie = requestHeaders.get("cookie") ?? "";
  const hasPasswordSession = /(?:^|;\s*)(?:__Secure-)?better-auth\.session_token=/.test(cookie);
  if (!hasPasswordSession) return null;

  const session = await getPasswordAuth().api.getSession({ headers: requestHeaders });
  if (!session?.user) return null;

  return {
    id: session.user.id,
    displayName: session.user.name || session.user.email,
    email: session.user.email.toLowerCase(),
    fullName: session.user.name || null,
  };
}

export async function requireAppUser(returnTo: string): Promise<AppUser> {
  const user = await getAppUser();
  if (user) return user;

  const target = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";
  redirect(`/?return_to=${encodeURIComponent(target)}`);
}
