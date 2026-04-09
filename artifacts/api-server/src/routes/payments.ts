import { Router, type IRouter } from "express";
import { getUncachableStripeClient } from "../stripeClient";

const router: IRouter = Router();

// Platform commission and fee constants (must match mobile app)
const NEW_CUSTOMER_FEE = 5;
const PLATFORM_COMMISSION_RATE = 0.03;

// ── POST /api/payments/create-session ──────────────────────────────────────
// Creates a Stripe Checkout Session for a landscaping booking.
// Returns { url, sessionId } — mobile opens the URL in the browser.
router.post("/create-session", async (req, res) => {
  try {
    const stripe = await getUncachableStripeClient();

    const {
      jobTotal,       // raw price entered by customer (dollars)
      isNewCustomer,  // whether the $5 new customer fee applies
      proName,        // landscaper display name
      serviceName,    // e.g. "Mowing/Edging"
      serviceDate,    // e.g. "Apr 12, 2026"
      successUrl,     // where to redirect on success
      cancelUrl,      // where to redirect on cancel
    } = req.body as {
      jobTotal: number;
      isNewCustomer: boolean;
      proName: string;
      serviceName: string;
      serviceDate: string;
      successUrl: string;
      cancelUrl: string;
    };

    if (!jobTotal || jobTotal <= 0) {
      return res.status(400).json({ error: "Invalid job total" });
    }

    // Calculate fees
    const newCustomerFee = isNewCustomer ? NEW_CUSTOMER_FEE : 0;
    const commission = parseFloat((jobTotal * PLATFORM_COMMISSION_RATE).toFixed(2));
    const totalCharge = parseFloat((jobTotal + newCustomerFee).toFixed(2));
    const landscaperPayout = parseFloat((jobTotal - commission).toFixed(2));

    // Stripe amounts in cents
    const lineItems: any[] = [
      {
        price_data: {
          currency: "usd",
          unit_amount: Math.round(jobTotal * 100),
          product_data: {
            name: `${serviceName} with ${proName}`,
            description: `Service date: ${serviceDate}`,
          },
        },
        quantity: 1,
      },
    ];

    if (isNewCustomer) {
      lineItems.push({
        price_data: {
          currency: "usd",
          unit_amount: Math.round(NEW_CUSTOMER_FEE * 100),
          product_data: {
            name: "New Customer Fee",
            description: "One-time fee for first booking",
          },
        },
        quantity: 1,
      });
    }

    const { preferredPaymentMethod } = req.body as { preferredPaymentMethod?: string };

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: successUrl || `${req.protocol}://${req.get("host")}/api/payments/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${req.protocol}://${req.get("host")}/api/payments/cancel`,
      metadata: {
        proName,
        serviceName,
        serviceDate,
        jobTotal: jobTotal.toString(),
        newCustomerFee: newCustomerFee.toString(),
        commission: commission.toString(),
        landscaperPayout: landscaperPayout.toString(),
        preferredPaymentMethod: preferredPaymentMethod ?? "card",
      },
    });

    res.json({
      url: session.url,
      sessionId: session.id,
      totalCharge,
      landscaperPayout,
      commission,
      newCustomerFee,
    });
  } catch (err: any) {
    console.error("Error creating Stripe session:", err.message);
    res.status(500).json({ error: err.message ?? "Failed to create payment session" });
  }
});

// ── GET /api/payments/session/:sessionId ───────────────────────────────────
// Polls for the status of a Stripe Checkout Session.
// Returns { status, paid, amountTotal, landscaperPayout, metadata }
router.get("/session/:sessionId", async (req, res) => {
  try {
    const stripe = await getUncachableStripeClient();
    const { sessionId } = req.params;

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    res.json({
      sessionId: session.id,
      status: session.status,
      paid: session.payment_status === "paid",
      amountTotal: session.amount_total ? session.amount_total / 100 : 0,
      metadata: session.metadata,
    });
  } catch (err: any) {
    console.error("Error retrieving session:", err.message);
    res.status(500).json({ error: err.message ?? "Failed to retrieve session" });
  }
});

// ── GET /api/payments/success ───────────────────────────────────────────────
// Simple success redirect page (shown in browser after payment).
router.get("/success", async (req, res) => {
  const { session_id } = req.query;
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Payment Successful</title>
      <style>
        body { background: #0A0A0A; color: #fff; font-family: -apple-system, sans-serif;
               display: flex; align-items: center; justify-content: center; min-height: 100vh;
               flex-direction: column; gap: 16px; padding: 24px; text-align: center; margin: 0; }
        .icon { font-size: 64px; }
        h1 { color: #34FF7A; margin: 0; font-size: 24px; }
        p { color: #AAAAAA; margin: 0; line-height: 1.5; }
        .note { font-size: 13px; color: #555; margin-top: 8px; }
      </style>
    </head>
    <body>
      <div class="icon">✅</div>
      <h1>Payment Successful!</h1>
      <p>Your booking is confirmed.<br>Return to TheLawnServices app to view your appointment.</p>
      <p class="note">Session: ${session_id ?? ""}</p>
    </body>
    </html>
  `);
});

// ── GET /api/payments/cancel ────────────────────────────────────────────────
router.get("/cancel", (_req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Payment Cancelled</title>
      <style>
        body { background: #0A0A0A; color: #fff; font-family: -apple-system, sans-serif;
               display: flex; align-items: center; justify-content: center; min-height: 100vh;
               flex-direction: column; gap: 16px; padding: 24px; text-align: center; margin: 0; }
        .icon { font-size: 64px; }
        h1 { color: #f87171; margin: 0; font-size: 24px; }
        p { color: #AAAAAA; margin: 0; }
      </style>
    </head>
    <body>
      <div class="icon">❌</div>
      <h1>Payment Cancelled</h1>
      <p>Return to TheLawnServices app to try again.</p>
    </body>
    </html>
  `);
});

export default router;
