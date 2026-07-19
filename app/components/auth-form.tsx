"use client";

import { FormEvent, useState } from "react";
import { authClient } from "../lib/auth-client";

type AuthFormProps = {
  returnTo: string;
};

export function AuthForm({ returnTo }: AuthFormProps) {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "").trim();

    try {
      const result =
        mode === "sign-up"
          ? await authClient.signUp.email({ name, email, password })
          : await authClient.signIn.email({ email, password, rememberMe: true });

      if (result.error) {
        const message = result.error.message ?? "Não foi possível continuar.";
        setError(translateAuthError(message));
        return;
      }

      window.location.assign(mode === "sign-up" ? "/onboarding" : returnTo);
    } catch {
      setError("Não foi possível conectar. Tente novamente em alguns instantes.");
    } finally {
      setPending(false);
    }
  }

  function changeMode(nextMode: "sign-in" | "sign-up") {
    setMode(nextMode);
    setError(null);
  }

  return (
    <div className="password-auth">
      <div className="auth-tabs" role="tablist" aria-label="Acesso ao ERPrint">
        <button type="button" role="tab" aria-selected={mode === "sign-in"} onClick={() => changeMode("sign-in")}>Entrar</button>
        <button type="button" role="tab" aria-selected={mode === "sign-up"} onClick={() => changeMode("sign-up")}>Criar conta</button>
      </div>

      <form className="login-form" onSubmit={submit}>
        {mode === "sign-up" ? (
          <label>
            <span>Seu nome</span>
            <input name="name" type="text" required minLength={2} maxLength={80} autoComplete="name" placeholder="Como podemos chamar você?" />
          </label>
        ) : null}
        <label>
          <span>E-mail</span>
          <input name="email" type="email" required maxLength={254} autoComplete="email" placeholder="voce@empresa.com" />
        </label>
        <label>
          <span>Senha</span>
          <input name="password" type="password" required minLength={8} maxLength={128} autoComplete={mode === "sign-up" ? "new-password" : "current-password"} placeholder={mode === "sign-up" ? "Mínimo de 8 caracteres" : "Sua senha"} />
        </label>

        {error ? <p className="auth-error" role="alert">{error}</p> : null}

        <button className="primary-button" type="submit" disabled={pending}>
          <span>{pending ? "Aguarde…" : mode === "sign-up" ? "Criar minha conta" : "Entrar no ERPrint"}</span>
          <span aria-hidden="true">→</span>
        </button>
      </form>

      <p className="auth-security"><i aria-hidden="true" /> Senha protegida e sessão criptografada.</p>
    </div>
  );
}

function translateAuthError(message: string) {
  if (/invalid email or password|invalid password|user not found/i.test(message)) return "E-mail ou senha incorretos.";
  if (/already exists|already registered/i.test(message)) return "Já existe uma conta com este e-mail.";
  if (/password.*8|too short/i.test(message)) return "A senha precisa ter pelo menos 8 caracteres.";
  if (/too many|rate limit/i.test(message)) return "Muitas tentativas. Aguarde um minuto e tente novamente.";
  return message;
}
