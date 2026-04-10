/**
 * Stripe client — prefers the Replit connector integration when available,
 * falls back to STRIPE_SECRET_KEY / STRIPE_PUBLISHABLE_KEY env vars.
 */
import Stripe from "stripe";

async function getCredentials(): Promise<{ publishableKey: string; secretKey: string }> {
  // ── 1. Try Replit Connectors service ────────────────────────────────────
  const hostname = process.env["REPLIT_CONNECTORS_HOSTNAME"];
  const xReplitToken = process.env["REPL_IDENTITY"]
    ? "repl " + process.env["REPL_IDENTITY"]
    : process.env["WEB_REPL_RENEWAL"]
      ? "depl " + process.env["WEB_REPL_RENEWAL"]
      : null;

  if (hostname && xReplitToken) {
    try {
      const isProduction = process.env["REPLIT_DEPLOYMENT"] === "1";
      const targetEnvironment = isProduction ? "production" : "development";
      const url = new URL(`https://${hostname}/api/v2/connection`);
      url.searchParams.set("include_secrets", "true");
      url.searchParams.set("connector_names", "stripe");
      url.searchParams.set("environment", targetEnvironment);

      const response = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
          "X-Replit-Token": xReplitToken,
        },
      });

      const data = await response.json();
      const settings = data.items?.[0]?.settings;
      if (settings?.secret) {
        return {
          publishableKey: settings.publishable as string ?? "",
          secretKey: settings.secret as string,
        };
      }
    } catch (_) {
      // fall through to env var
    }
  }

  // ── 2. Fall back to environment variables ────────────────────────────────
  const secretKey = process.env["STRIPE_SECRET_KEY"];
  if (secretKey) {
    const publishableKey = process.env["STRIPE_PUBLISHABLE_KEY"] ?? "";
    return { publishableKey, secretKey };
  }

  throw new Error("Stripe credentials not found — set STRIPE_SECRET_KEY or connect via the Replit Stripe integration.");
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  const { secretKey } = await getCredentials();
  return new Stripe(secretKey, {
    apiVersion: "2025-08-27.basil" as any,
  });
}

export async function getStripePublishableKey(): Promise<string> {
  const { publishableKey } = await getCredentials();
  return publishableKey;
}

export async function getStripeSecretKey(): Promise<string> {
  const { secretKey } = await getCredentials();
  return secretKey;
}

let stripeSync: any = null;

export async function getStripeSync() {
  if (!stripeSync) {
    const { StripeSync } = await import("stripe-replit-sync");
    const secretKey = await getStripeSecretKey();
    stripeSync = new StripeSync({
      poolConfig: {
        connectionString: process.env["DATABASE_URL"]!,
        max: 2,
      },
      stripeSecretKey: secretKey,
    });
  }
  return stripeSync;
}
