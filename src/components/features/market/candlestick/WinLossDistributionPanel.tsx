import React from "react";
import type { Trade } from "@/types/types";

type WinLossBucket = {
  label: string;
  count: number;
};

const BUCKETS: { label: string; min: number; max: number }[] = [
  { label: "< -3%", min: Number.NEGATIVE_INFINITY, max: -3 },
  { label: "-3% to -1%", min: -3, max: -1 },
  { label: "-1% to 0%", min: -1, max: 0 },
  { label: "0% to 1%", min: 0, max: 1 },
  { label: "1% to 3%", min: 1, max: 3 },
  { label: "> 3%", min: 3, max: Number.POSITIVE_INFINITY }
];

function buildBuckets(trades: Trade[]): WinLossBucket[] {
  // % move per trade based on entry price
  const pctMoves = trades
    .map((t) => (t.entryPrice !== 0 ? (t.profit / t.entryPrice) * 100 : null))
    .filter((v): v is number => v !== null && Number.isFinite(v));

  const counts = BUCKETS.map(() => 0);

  for (const pct of pctMoves) {
    const idx = BUCKETS.findIndex((b) => pct >= b.min && pct < b.max);
    if (idx >= 0) counts[idx] += 1;
  }

  return BUCKETS.map((b, i) => ({
    label: b.label,
    count: counts[i]
  }));
}

export function WinLossDistributionPanel({ trades }: { trades: Trade[] }) {
  const buckets = React.useMemo(() => buildBuckets(trades), [trades]);
  const total = trades.length || 1;
  const maxCount = Math.max(...buckets.map((b) => b.count), 1);

  return (
    <div
      style={{
        fontSize: "0.75rem",
        color: "#e5e7eb",
        backgroundColor: "#020617",
        border: "1px solid #4b5563",
        borderRadius: "4px",
        padding: "0.5rem 0.75rem",
        marginTop: "0.75rem",
        marginBottom: "0.75rem"
      }}
    >
      <div style={{ marginBottom: "0.25rem" }}>
        <strong>Win / loss distribution (per trade % move)</strong>
      </div>

      {trades.length === 0 ? (
        <div>No trades yet.</div>
      ) : (
        <div>
          {buckets.map((bucket) => {
            const pctOfTrades = (bucket.count / total) * 100;
            const barWidth =
              maxCount === 0 ? 0 : (bucket.count / maxCount) * 100;

            return (
              <div
                key={bucket.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "0.25rem"
                }}
              >
                <div style={{ width: "90px" }}>{bucket.label}</div>
                <div
                  style={{
                    flex: 1,
                    height: "8px",
                    backgroundColor: "#111827",
                    borderRadius: "999px",
                    overflow: "hidden"
                  }}
                >
                  <div
                    style={{
                      width: `${barWidth}%`,
                      height: "100%",
                      backgroundColor: "#22c55e"
                    }}
                  />
                </div>
                <div style={{ width: "70px", textAlign: "right" }}>
                  {bucket.count} ({pctOfTrades.toFixed(1)}
                  %)
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
