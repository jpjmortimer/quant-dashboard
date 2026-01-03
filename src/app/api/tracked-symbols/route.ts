import { NextResponse } from "next/server";
import { Pool } from "pg";

// Use a pool so dev hot-reloads don't create a new connection every request
const pool =
  (globalThis as any).__pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL
  });

(globalThis as any).__pgPool = pool;

// Ensure this runs on Node.js runtime (not Edge) because pg needs Node APIs
export const runtime = "nodejs";

export async function GET() {
  try {
    const { rows } = await pool.query<{
      symbol: string;
      enabled: boolean;
      added_at: string;
    }>(
      `
      SELECT symbol, enabled, added_at
      FROM public.tracked_symbols
      WHERE enabled = true
      ORDER BY symbol;
      `
    );

    return NextResponse.json({ symbols: rows });
  } catch (err) {
    console.error("[api/tracked-symbols] error", err);
    return NextResponse.json(
      { error: "Failed to load tracked symbols" },
      { status: 500 }
    );
  }
}
