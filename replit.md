# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.
Contains "TheLawnServices" — a dark-themed Expo mobile app for a landscaping booking marketplace.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle — stripe + stripe-replit-sync externalized)
- **Payments**: Stripe (connected via Replit integration, test mode)
- **Mobile**: Expo (React Native) — `artifacts/mobile`

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Stripe Integration

- Connected via Replit Stripe connector (sandbox/test mode)
- `artifacts/api-server/src/stripeClient.ts` — fetches live credentials dynamically via `REPL_IDENTITY`
- `artifacts/api-server/src/routes/payments.ts` — `/api/payments/create-session`, `/session/:id`, `/success`, `/cancel`
- `artifacts/api-server/src/webhookHandlers.ts` — processes Stripe webhooks via `stripe-replit-sync`
- Webhook registered at `/api/stripe/webhook` (before `express.json()` middleware)
- `EXPO_PUBLIC_API_URL` env var points to API server for mobile app Stripe calls
- Commission: 3% platform fee + $5 new customer fee (routes to TheLawnServices@gmail.com via PayPal manually)

## Mobile App (artifacts/mobile)

- **Accent**: `#34FF7A` on `#0A0A0A` dark background
- `app/pay.tsx` — multi-step booking + payment flow; "Debit/Credit Card" opens Stripe Checkout via `expo-web-browser`
- `app/(tabs)/wallet.tsx` — landscaper wallet with withdrawal options
- `app/(tabs)/profile.tsx` — dual-mode (customer/landscaper) with role-based auth
- `ALL_SERVICES` = `["Mowing/Edging", "Weeding/Mulching", "Sod Installation", "Artificial Turf", "Full Service", "Tree Removal", "Tree Trimming & Pruning"]`
- Platform commission: `NEW_CUSTOMER_FEE = 5`, `PLATFORM_COMMISSION_RATE = 0.03`
- Recurring bookings: up to 4 specific dates per month (calendar picker in pay.tsx); recurring jobs get a `REC-XXXXX` code displayed in the summary
- Tree services (Tree Removal, Tree Trimming & Pruning) use 4-tier **tree size** pricing (Small/Medium/Large/XLarge) both in booking (`pay.tsx`) and landscaper My Services (`index.tsx`)
- Landscaper My Services: tree services show a 2×2 grid with "BASE RATE BY TREE SIZE"; non-tree services show 3-tier row "BASE RATE BY YARD SIZE"
- Popular Services grid shows all 7 services with 🔥 flame on Mowing/Edging, Weeding/Mulching, Tree Trim & Pruning
- Help & Resources opens the full AI-powered `HelpSupportModal` chatbot (not a stub list)
- Dispute form requires `jobCode` (not optional); label is "Job Code *"
- Accepted payment options: "Pay Now (Online)" (was "Stripe") + "In Person"
- Customer settings: ZIP code field shows a note to confirm street address when changing ZIP

## Known Notes

- `path-to-regexp@8.x` (used by Express 5 → router@2.2.0) is ESM-only; pnpm symlinks must be correct. Run `pnpm install` if "Cannot find module 'path-to-regexp'" error appears.
- `stripe` and `stripe-replit-sync` are externalized in esbuild to avoid bundling issues.

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
