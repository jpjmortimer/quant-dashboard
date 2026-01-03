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
      impactor_symbol: string;
      weight: number;
      added_at: string;
    }>(
      `
      SELECT symbol, impactor_symbol, weight, enabled, added_at
      FROM public.symbol_relationships
      WHERE enabled = true
      ORDER BY symbol;
      `
    );

    return NextResponse.json({ symbols: rows });
  } catch (err) {
    console.error("[api/symbol-relationships] error", err);
    return NextResponse.json(
      { error: "Failed to load symbol relationships" },
      { status: 500 }
    );
  }
}
