import { Router, type IRouter } from "express";
import { pool } from "../db";

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
// Records a withdrawal in the DB after a Stripe payout is initiated.
router.post("/record-withdrawal", async (req, res) => {
  const { landscaperName, amount, method, stripeTransferId, stripePayoutId, status } =
    req.body as {
      landscaperName: string;
      amount: number;
      method: string;
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
