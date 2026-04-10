import { Router, type IRouter } from "express";
import { getUncachableStripeClient } from "../stripeClient";

const router: IRouter = Router();

// ── POST /api/payouts/create-connect-account ────────────────────────────────
// Creates a new Stripe Connect Express account for a landscaper.
router.post("/create-connect-account", async (req, res) => {
  try {
    const stripe = await getUncachableStripeClient();
    const { email } = req.body as { email?: string };

    const account = await stripe.accounts.create({
      type: "express",
      country: "US",
      ...(email ? { email } : {}),
      capabilities: {
        transfers: { requested: true },
      },
      settings: {
        payouts: {
          schedule: { interval: "manual" },
        },
      },
    });

    res.json({ accountId: account.id });
  } catch (err: any) {
    console.error("create-connect-account error:", err.message);

    // Stripe returns this message when the platform account has not enabled
    // the Connect product at https://dashboard.stripe.com/connect
    const msg: string = err?.message ?? "";
    if (
      msg.includes("signed up for Connect") ||
      msg.includes("dashboard.stripe.com/connect") ||
      err?.code === "account_invalid"
    ) {
      return res.status(503).json({
        errorCode: "CONNECT_NOT_ENABLED",
        error:
          "Stripe bank payouts are not yet activated for this platform. " +
          "Use the Manual Payout options (PayPal, Zelle, or Venmo) below while this is being set up.",
      });
    }

    res.status(500).json({ error: msg || "Failed to create Connect account" });
  }
});

// ── POST /api/payouts/onboarding-link ────────────────────────────────────────
// Returns a Stripe-hosted onboarding URL for the landscaper to set up payouts.
router.post("/onboarding-link", async (req, res) => {
  try {
    const stripe = await getUncachableStripeClient();
    const { accountId } = req.body as { accountId: string };

    if (!accountId) {
      return res.status(400).json({ error: "accountId is required" });
    }

    const replitDomain = process.env["REPLIT_DOMAINS"]?.split(",")[0];
    const baseUrl = replitDomain
      ? `https://${replitDomain}`
      : `https://${req.get("host")}`;

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/api/payouts/onboarding-refresh?accountId=${accountId}`,
      return_url:  `${baseUrl}/api/payouts/onboarding-return`,
      type: "account_onboarding",
    });

    res.json({ url: link.url });
  } catch (err: any) {
    console.error("onboarding-link error:", err.message);
    res.status(500).json({ error: err.message ?? "Failed to create onboarding link" });
  }
});

// ── GET /api/payouts/onboarding-return ───────────────────────────────────────
// Stripe redirects here after the landscaper finishes onboarding.
router.get("/onboarding-return", (_req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Stripe Account Connected</title>
      <style>
        body { background: #0A0A0A; color: #fff; font-family: -apple-system, sans-serif;
               display: flex; align-items: center; justify-content: center; min-height: 100vh;
               flex-direction: column; gap: 16px; padding: 24px; text-align: center; margin: 0; }
        .icon { font-size: 64px; }
        h1 { color: #34FF7A; margin: 0; font-size: 24px; }
        p { color: #AAAAAA; margin: 0; line-height: 1.6; max-width: 340px; }
        .note { font-size: 13px; color: #555; margin-top: 8px; }
      </style>
    </head>
    <body>
      <div class="icon">✅</div>
      <h1>Stripe Account Connected!</h1>
      <p>Your payout account has been set up successfully.<br>Return to the TheLawnServices app to make withdrawals.</p>
      <p class="note">You can close this tab and return to the app.</p>
    </body>
    </html>
  `);
});

// ── GET /api/payouts/onboarding-refresh ──────────────────────────────────────
// Stripe redirects here if the onboarding link expires — we regenerate it.
router.get("/onboarding-refresh", async (req, res) => {
  const { accountId } = req.query as { accountId?: string };
  if (!accountId) {
    return res.status(400).send("Missing accountId");
  }
  try {
    const stripe = await getUncachableStripeClient();
    const replitDomain = process.env["REPLIT_DOMAINS"]?.split(",")[0];
    const baseUrl = replitDomain
      ? `https://${replitDomain}`
      : `https://${req.get("host")}`;
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/api/payouts/onboarding-refresh?accountId=${accountId}`,
      return_url:  `${baseUrl}/api/payouts/onboarding-return`,
      type: "account_onboarding",
    });
    res.redirect(link.url);
  } catch (err: any) {
    res.status(500).send(`Error: ${err.message}`);
  }
});

// ── GET /api/payouts/account-status/:accountId ───────────────────────────────
// Returns the current status of a Connect account.
router.get("/account-status/:accountId", async (req, res) => {
  try {
    const stripe = await getUncachableStripeClient();
    const account = await stripe.accounts.retrieve(req.params.accountId);

    res.json({
      accountId: account.id,
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      requirements: account.requirements?.currently_due ?? [],
    });
  } catch (err: any) {
    console.error("account-status error:", err.message);
    res.status(500).json({ error: err.message ?? "Failed to retrieve account status" });
  }
});

// ── POST /api/payouts/withdraw ────────────────────────────────────────────────
// Transfers funds from the platform to the landscaper's Connect account,
// then immediately triggers a payout to their bank/card.
// Pass instant=true for instant debit card payouts (1.5% fee applies).
router.post("/withdraw", async (req, res) => {
  try {
    const stripe = await getUncachableStripeClient();
    const { accountId, amount, description, instant } = req.body as {
      accountId: string;
      amount: number;
      description?: string;
      instant?: boolean;
    };

    if (!accountId) return res.status(400).json({ error: "accountId is required" });
    if (!amount || amount <= 0) return res.status(400).json({ error: "Amount must be greater than $0" });

    const amountCents = Math.round(amount * 100);

    // Step 1: Transfer from platform → landscaper's Connect account
    const transfer = await stripe.transfers.create({
      amount: amountCents,
      currency: "usd",
      destination: accountId,
      description: description ?? "Wallet withdrawal — TheLawnServices",
    });

    // Step 2: Trigger a payout from the Connect account to their bank/card.
    // instant=true uses `method: "instant"` for debit card instant payouts.
    let payout: any = null;
    try {
      payout = await stripe.payouts.create(
        {
          amount: amountCents,
          currency: "usd",
          description: description ?? "Wallet payout — TheLawnServices",
          statement_descriptor: "THELAWNSERVICES",
          ...(instant ? { method: "instant" } : {}),
        },
        { stripeAccount: accountId }
      );
    } catch (payoutErr: any) {
      // Payout might fail if account isn't fully verified yet — transfer still succeeds
      console.warn("Payout creation failed (transfer succeeded):", payoutErr.message);
    }

    res.json({
      success: true,
      transferId: transfer.id,
      payoutId: payout?.id ?? null,
      amount: transfer.amount / 100,
      status: payout?.status ?? "transfer_only",
      instant: instant ?? false,
      arrivalDate: instant
        ? "Within minutes"
        : payout?.arrival_date
          ? new Date(payout.arrival_date * 1000).toLocaleDateString("en-US", {
              month: "short", day: "numeric", year: "numeric",
            })
          : null,
    });
  } catch (err: any) {
    console.error("withdraw error:", err.message);
    res.status(500).json({ error: err.message ?? "Withdrawal failed" });
  }
});

export default router;
