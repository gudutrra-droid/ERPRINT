import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getChatGPTUser } from "./chatgpt-auth";
import { getPasswordAuth } from "./lib/auth-server";

export type AppUser = {
  id: string;
  displayName: string;
  email: string;
  fullName: string | null;
  provider: "password" | "chatgpt";
};

export async function getAppUser(): Promise<AppUser | null> {
  const requestHeaders = await headers();
  const cookie = requestHeaders.get("cookie") ?? "";
  const hasPasswordSession = /(?:^|;\s*)(?:__Secure-)?better-auth\.session_token=/.test(cookie);

  if (hasPasswordSession) {
    const session = await getPasswordAuth().api.getSession({ headers: requestHeaders });
    if (session?.user) {
      return {
        id: session.user.id,
        displayName: session.user.name || session.user.email,
        email: session.user.email.toLowerCase(),
        fullName: session.user.name || null,
        provider: "password",
      };
    }
  }

  const chatGPTUser = await getChatGPTUser();
  if (!chatGPTUser) return null;

  return {
    id: `chatgpt:${chatGPTUser.email.toLowerCase()}`,
    displayName: chatGPTUser.displayName,
    email: chatGPTUser.email.toLowerCase(),
    fullName: chatGPTUser.fullName,
    provider: "chatgpt",
  };
}

export async function requireAppUser(returnTo: string): Promise<AppUser> {
  const user = await getAppUser();
  if (user) return user;

  const target = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";
  redirect(`/?return_to=${encodeURIComponent(target)}`);
}
