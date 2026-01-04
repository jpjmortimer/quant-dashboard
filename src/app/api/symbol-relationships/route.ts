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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const symbol = searchParams.get("symbol");
    const impactor = searchParams.get("impactor");

    const conditions: string[] = ["enabled = true"];
    const values: unknown[] = [];

    if (symbol) {
      values.push(symbol.toUpperCase());
      conditions.push(`symbol = $${values.length}`);
    }

    if (impactor) {
      values.push(impactor.toUpperCase());
      conditions.push(`impactor_symbol = $${values.length}`);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const query = `
      SELECT
        symbol,
        impactor_symbol,
        weight,
        enabled,
        added_at
      FROM public.symbol_relationships
      ${whereClause}
      ORDER BY symbol, impactor_symbol;
    `;

    const { rows } = await pool.query(query, values);

    return NextResponse.json({ symbols: rows });
  } catch (err) {
    console.error("[api/symbol-relationships] error", err);
    return NextResponse.json(
      { error: "Failed to load symbol relationships" },
      { status: 500 }
    );
  }
}
