import { Pool } from "pg";
import { logger } from "./lib/logger";

const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });

export async function initLawnTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS lawn_earnings (
      id             SERIAL PRIMARY KEY,
      landscaper_name TEXT NOT NULL,
      session_id     TEXT UNIQUE NOT NULL,
      amount         DECIMAL(10,2) NOT NULL,
      service_name   TEXT DEFAULT '',
      service_date   TEXT DEFAULT '',
      created_at     TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS lawn_withdrawals (
      id                  SERIAL PRIMARY KEY,
      landscaper_name     TEXT NOT NULL,
      amount              DECIMAL(10,2) NOT NULL,
      method              TEXT NOT NULL,
      stripe_transfer_id  TEXT,
      stripe_payout_id    TEXT,
      status              TEXT DEFAULT 'pending',
      created_at          TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS lawn_connect_accounts (
      id              SERIAL PRIMARY KEY,
      landscaper_name TEXT UNIQUE NOT NULL,
      account_id      TEXT NOT NULL,
      created_at      TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS lawn_users (
      id              SERIAL PRIMARY KEY,
      username        TEXT NOT NULL,
      role            TEXT NOT NULL CHECK (role IN ('customer','landscaper')),
      password_hash   TEXT NOT NULL,
      display_name    TEXT NOT NULL,
      email           TEXT NOT NULL,
      phone           TEXT DEFAULT '',
      address         TEXT DEFAULT '',
      zip_code        TEXT DEFAULT '',
      city            TEXT DEFAULT '',
      state           TEXT DEFAULT '',
      business_name   TEXT DEFAULT '',
      services        TEXT DEFAULT '',
      years_experience TEXT DEFAULT '',
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (username, role)
    );
  `);
  logger.info("Lawn DB tables ready");
}

export { pool };
