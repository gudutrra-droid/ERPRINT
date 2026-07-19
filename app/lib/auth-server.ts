import { env } from "cloudflare:workers";
import { betterAuth } from "better-auth";

type AuthEnvironment = {
  DB: D1Database;
  BETTER_AUTH_SECRET?: string;
};

export function getPasswordAuth() {
  const authEnv = env as unknown as AuthEnvironment;
  const secret = authEnv.BETTER_AUTH_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET precisa ter pelo menos 32 caracteres.");
  }

  return betterAuth({
    appName: "ERPrint",
    database: authEnv.DB,
    secret,
    basePath: "/api/auth",
    trustedOrigins: [
      "https://erprint.dutrra.com",
      "http://localhost:3000",
      "http://localhost:5173",
    ],
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      autoSignIn: true,
      requireEmailVerification: false,
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 20,
    },
    advanced: {
      database: { generateId: "uuid" },
      ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
    },
  });
}
