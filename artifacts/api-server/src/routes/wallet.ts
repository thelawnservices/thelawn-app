import { Router, type IRouter } from "express";
import nodemailer from "nodemailer";
import { pool } from "../db";

function createTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  return nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
}

async function sendWithdrawalEmail(
  landscaperName: string,
  amount: number,
  method: string,
  payoutDetails: string,
) {
  const transporter = createTransporter();
  if (!transporter) return;
  const amountFmt = `$${amount.toFixed(2)}`;
  const now = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
  await transporter.sendMail({
    from: `"TheLawn Payouts" <${process.env.GMAIL_USER}>`,
    to: "TheLawnServices@gmail.com",
    subject: `💸 Withdrawal Request — ${landscaperName} — ${amountFmt} via ${method}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:auto;background:#0a0a0a;color:#fff;border-radius:12px;padding:32px;">
        <h2 style="color:#34FF7A;margin:0 0 8px">Withdrawal Request</h2>
        <p style="color:#aaa;margin:0 0 24px;font-size:14px">Submitted ${now}</p>
        <table style="width:100%;border-collapse:collapse;font-size:15px">
          <tr><td style="padding:10px 0;color:#888;width:140px">Landscaper</td><td style="color:#fff;font-weight:600">${landscaperName}</td></tr>
          <tr><td style="padding:10px 0;color:#888">Amount</td><td style="color:#34FF7A;font-weight:700;font-size:20px">${amountFmt}</td></tr>
          <tr><td style="padding:10px 0;color:#888">Method</td><td style="color:#fff">${method}</td></tr>
          <tr><td style="padding:10px 0;color:#888;vertical-align:top">Payout Info</td><td style="color:#fff;white-space:pre-line">${payoutDetails || "No details provided"}</td></tr>
        </table>
        <div style="margin-top:24px;padding:16px;background:#1a1a1a;border-radius:8px;border-left:3px solid #34FF7A">
          <p style="margin:0;font-size:13px;color:#aaa">⚡ The landscaper's wallet balance has already been deducted. Please process this payout as soon as possible.</p>
        </div>
      </div>
    `,
  });
}

const router: IRouter = Router();

// ── GET /api/wallet/balance?name=GreenScape+Pros ──────────────────────────
router.get("/balance", async (req, res) => {
  const name = (req.query.name as string | undefined)?.trim();
  if (!name) return res.status(400).json({ error: "name is required" });

  try {
    const earningsRes = await pool.query<{ total: string }>(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM lawn_earnings WHERE landscaper_name = $1`,
      [name]
    );
    const withdrawalsRes = await pool.query<{ total: string }>(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM lawn_withdrawals WHERE landscaper_name = $1`,
      [name]
    );

    const earned = parseFloat(earningsRes.rows[0]?.total ?? "0");
    const withdrawn = parseFloat(withdrawalsRes.rows[0]?.total ?? "0");
    const balance = parseFloat((earned - withdrawn).toFixed(2));

    res.json({ balance, earned, withdrawn });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/wallet/transactions?name=GreenScape+Pros ─────────────────────
router.get("/transactions", async (req, res) => {
  const name = (req.query.name as string | undefined)?.trim();
  if (!name) return res.status(400).json({ error: "name is required" });

  try {
    const earningsRows = await pool.query(
      `SELECT id, amount, service_name, service_date, created_at
       FROM lawn_earnings WHERE landscaper_name = $1 ORDER BY created_at DESC LIMIT 50`,
      [name]
    );
    const withdrawalRows = await pool.query(
      `SELECT id, amount, method, status, created_at
       FROM lawn_withdrawals WHERE landscaper_name = $1 ORDER BY created_at DESC LIMIT 50`,
      [name]
    );

    const credits = earningsRows.rows.map((r) => ({
      id: `earn_${r.id}`,
      type: "credit" as const,
      amount: parseFloat(r.amount),
      description: r.service_name
        ? `${r.service_name} — Payment Received`
        : "Job Payment Received",
      date: new Date(r.created_at).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric",
      }),
      status: "completed" as const,
    }));

    const debits = withdrawalRows.rows.map((r) => ({
      id: `wd_${r.id}`,
      type: "debit" as const,
      amount: parseFloat(r.amount),
      description: `Withdrawal — ${r.method}`,
      date: new Date(r.created_at).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric",
      }),
      status: r.status === "completed" ? ("completed" as const) : ("pending" as const),
    }));

    const all = [...credits, ...debits].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    res.json({ transactions: all });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/wallet/credit ───────────────────────────────────────────────
// Called after a successful Stripe Checkout — records earnings for landscaper.
router.post("/credit", async (req, res) => {
  const { landscaperName, sessionId, amount, serviceName, serviceDate } =
    req.body as {
      landscaperName: string;
      sessionId: string;
      amount: number;
      serviceName?: string;
      serviceDate?: string;
    };

  if (!landscaperName || !sessionId || !amount) {
    return res.status(400).json({ error: "landscaperName, sessionId and amount are required" });
  }

  try {
    await pool.query(
      `INSERT INTO lawn_earnings (landscaper_name, session_id, amount, service_name, service_date)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (session_id) DO NOTHING`,
      [landscaperName, sessionId, amount, serviceName ?? "", serviceDate ?? ""]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/wallet/record-withdrawal ───────────────────────────────────
// Records a withdrawal in the DB and emails the admin for manual methods.
router.post("/record-withdrawal", async (req, res) => {
  const { landscaperName, amount, method, payoutDetails, stripeTransferId, stripePayoutId, status } =
    req.body as {
      landscaperName: string;
      amount: number;
      method: string;
      payoutDetails?: string;
      stripeTransferId?: string;
      stripePayoutId?: string;
      status?: string;
    };

  if (!landscaperName || !amount || !method) {
    return res.status(400).json({ error: "landscaperName, amount and method are required" });
  }

  try {
    await pool.query(
      `INSERT INTO lawn_withdrawals (landscaper_name, amount, method, stripe_transfer_id, stripe_payout_id, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [landscaperName, amount, method, stripeTransferId ?? null, stripePayoutId ?? null, status ?? "pending"]
    );

    // For manual methods (not Stripe), email admin to process the payout
    const isManual = !stripeTransferId;
    if (isManual) {
      sendWithdrawalEmail(landscaperName, amount, method, payoutDetails ?? "").catch(
        (err) => console.error("Withdrawal email error:", err)
      );
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/wallet/save-connect-account ─────────────────────────────────
router.post("/save-connect-account", async (req, res) => {
  const { landscaperName, accountId } = req.body as {
    landscaperName: string;
    accountId: string;
  };
  if (!landscaperName || !accountId) {
    return res.status(400).json({ error: "landscaperName and accountId are required" });
  }
  try {
    await pool.query(
      `INSERT INTO lawn_connect_accounts (landscaper_name, account_id)
       VALUES ($1, $2)
       ON CONFLICT (landscaper_name) DO UPDATE SET account_id = $2`,
      [landscaperName, accountId]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/wallet/connect-account?name=GreenScape+Pros ─────────────────
router.get("/connect-account", async (req, res) => {
  const name = (req.query.name as string | undefined)?.trim();
  if (!name) return res.status(400).json({ error: "name is required" });
  try {
    const result = await pool.query(
      `SELECT account_id FROM lawn_connect_accounts WHERE landscaper_name = $1`,
      [name]
    );
    if (result.rows.length === 0) return res.json({ accountId: null });
    res.json({ accountId: result.rows[0].account_id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
