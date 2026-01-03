"use client";

import * as React from "react";
import { SERVICES } from "@/lib/service";
import { logBinanceConfig, BINANCE } from "@/lib/exchanges/binance/config";
import { HttpError } from "@/lib/http";
import {
  getServerTime,
  calculateClockSkewMs
} from "@/lib/exchanges/binance/time";
import { getExchangeInfo } from "@/lib/exchanges/binance/exchangeInfo";
import { getTicker24h, getOrderBook } from "@/lib/exchanges/binance/marketData";
import { SymbolSelector } from "@/components/features/market/SymbolSelector";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

type ApiStatus = "idle" | "ok" | "down";

type ExchangeInfoSummary = {
  timezone: string;
  symbols: number;
};

type OrderBookTop = {
  bid: [string, string] | null;
  ask: [string, string] | null;
};

/**
 * NOTE:
 * Your tracked-symbols endpoint returns `{ symbols: [...] }`.
 * Your symbol-relationships endpoint might return either:
 *   - `{ symbols: [...] }` (if you reused the same shape), OR
 *   - `{ relationships: [...] }` (more semantically correct)
 *
 * To keep the Lab page resilient while you iterate, we support BOTH.
 */
type TrackedSymbolRow = {
  symbol: string;
  enabled: boolean;
  added_at: string;
};

type SymbolRelationshipRow = {
  id?: number;
  symbol: string;
  impactor_symbol: string;
  weight: number;
  enabled: boolean;
  added_at: string;
};

type TrackedSymbolsResponse = {
  symbols: TrackedSymbolRow[];
};

// tolerant shape for relationships
type SymbolRelationshipsResponse = {
  symbols?: SymbolRelationshipRow[];
  relationships?: SymbolRelationshipRow[];
};

function formatError(err: unknown): string {
  if (err instanceof HttpError) return `${err.kind}: ${err.message}`;
  if (err instanceof Error) return err.message;
  return String(err);
}

async function postPythonCompute(signal?: AbortSignal) {
  const res = await fetch(`${SERVICES.python}/compute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      candles: [
        { time: 1, open: 100, high: 105, low: 95, close: 102, volume: 10 },
        { time: 2, open: 102, high: 110, low: 101, close: 108, volume: 12 }
      ]
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Python HTTP ${res.status}: ${text}`);
  }

  return res.json();
}

async function postNodeCompute(signal?: AbortSignal) {
  const res = await fetch(`${SERVICES.node}/compute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      candles: [
        { time: 1, open: 100, high: 110, low: 95, close: 110, volume: 10 },
        { time: 2, open: 102, high: 120, low: 101, close: 120, volume: 12 }
      ]
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Node HTTP ${res.status}: ${text}`);
  }

  return res.json();
}

/* ----------------------------- small, local bits ----------------------------- */

function StatusBadge({ status }: { status: ApiStatus }) {
  if (status === "ok") return <Badge variant="secondary">OK</Badge>;
  if (status === "down") return <Badge variant="destructive">DOWN</Badge>;
  return <Badge variant="outline">IDLE</Badge>;
}

function CodeBlock({ value }: { value: unknown }) {
  const text =
    typeof value === "string" ? value : JSON.stringify(value, null, 2);

  return (
    <pre className="overflow-auto rounded-lg bg-slate-950 p-4 text-xs leading-relaxed text-slate-100">
      <code>{text}</code>
    </pre>
  );
}

function AlertCard({
  title,
  variant,
  children
}: {
  title: string;
  variant: "warn" | "error";
  children: React.ReactNode;
}) {
  const styles =
    variant === "warn"
      ? "border-amber-200 bg-amber-50 text-amber-950"
      : "border-rose-200 bg-rose-50 text-rose-950";

  return (
    <div className={`rounded-xl border p-4 ${styles}`}>
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-1 text-sm opacity-90">{children}</div>
    </div>
  );
}

/* ------------------------------ local API calls ------------------------------ */

async function getTrackedSymbols(signal?: AbortSignal) {
  const res = await fetch("/api/tracked-symbols", {
    signal,
    cache: "no-store"
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`TrackedSymbols HTTP ${res.status}: ${text}`);
  }

  return (await res.json()) as TrackedSymbolsResponse;
}

async function getSymbolRelationships(signal?: AbortSignal) {
  const res = await fetch("/api/symbol-relationships", {
    signal,
    cache: "no-store"
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SymbolRelationships HTTP ${res.status}: ${text}`);
  }

  return (await res.json()) as SymbolRelationshipsResponse;
}

function normaliseRelationshipsResponse(
  data: SymbolRelationshipsResponse
): SymbolRelationshipRow[] {
  const rows = (data.relationships ??
    data.symbols ??
    []) as SymbolRelationshipRow[];

  // Defensive normalisation (in case weight/enabled missing while you iterate)
  return rows.map((r) => ({
    id: r.id,
    symbol: String(r.symbol ?? "").toUpperCase(),
    impactor_symbol: String(r.impactor_symbol ?? "").toUpperCase(),
    weight: typeof r.weight === "number" ? r.weight : 1,
    enabled: typeof r.enabled === "boolean" ? r.enabled : true,
    added_at: String(r.added_at ?? "")
  }));
}

/* --------------------------------- Feature --------------------------------- */

export function MarketLab() {
  const [selectedSymbol, setSelectedSymbol] = React.useState<string>(
    BINANCE.defaultSymbol.toUpperCase()
  );

  const [apiStatus, setApiStatus] = React.useState<ApiStatus>("idle");
  const [error, setError] = React.useState<string | null>(null);

  const [skew, setSkew] = React.useState<string>("Checking…");
  const [exchangeInfo, setExchangeInfo] =
    React.useState<ExchangeInfoSummary | null>(null);

  // ✅ symbol universe from exchangeInfo
  const [symbols, setSymbols] = React.useState<string[]>([]);
  const [symbolsLoading, setSymbolsLoading] = React.useState<boolean>(true);

  const [ticker, setTicker] = React.useState<unknown>(null);
  const [orderBook, setOrderBook] = React.useState<OrderBookTop | null>(null);

  const [pythonResponse, setPythonResponse] = React.useState<string>(
    "Waiting for python endpoint…"
  );

  const [nodeResponse, setNodeResponse] = React.useState<string>(
    "Waiting for node endpoint…"
  );

  // tracked symbols debug
  const [trackedStatus, setTrackedStatus] = React.useState<ApiStatus>("idle");
  const [trackedError, setTrackedError] = React.useState<string | null>(null);
  const [trackedSymbols, setTrackedSymbols] = React.useState<string[]>([]);
  const [trackedRaw, setTrackedRaw] = React.useState<unknown>(null);

  // relationships debug
  const [relsStatus, setRelsStatus] = React.useState<ApiStatus>("idle");
  const [relsError, setRelsError] = React.useState<string | null>(null);
  const [rels, setRels] = React.useState<SymbolRelationshipRow[]>([]);
  const [relsRaw, setRelsRaw] = React.useState<unknown>(null);

  // Startup diagnostics (runs once)
  React.useEffect(() => {
    const controller = new AbortController();

    async function loadStartup() {
      setError(null);
      logBinanceConfig();

      // Python probe (independent)
      try {
        const data = await postPythonCompute(controller.signal);
        setPythonResponse(JSON.stringify(data, null, 2));
      } catch (err) {
        setPythonResponse(formatError(err));
      }

      // Node/Nest probe (independent)
      try {
        const data = await postNodeCompute(controller.signal);
        setNodeResponse(JSON.stringify(data, null, 2));
      } catch (err) {
        setNodeResponse(formatError(err));
      }

      // Binance time
      try {
        const serverTime = await getServerTime();
        const skewMs = calculateClockSkewMs(Date.now(), serverTime);
        setSkew(`${skewMs} ms`);
      } catch (err) {
        setSkew("Error");
        setError((prev) => prev ?? `Clock skew: ${formatError(err)}`);
      }

      // ✅ Exchange info + symbol list
      try {
        setSymbolsLoading(true);
        const info = await getExchangeInfo();

        setExchangeInfo({
          timezone: info.timezone,
          symbols: info.symbols.length
        });

        // OPTION B (recommended): only TRADING + USDT quote (keeps dropdown usable)
        const filtered = info.symbols
          .filter((s) => s.status === "TRADING" && s.quoteAsset === "USDT")
          .map((s) => s.symbol);

        setSymbols(filtered);

        // Ensure selectedSymbol exists in the new universe
        setSelectedSymbol((prev) => {
          const next = prev?.toUpperCase?.() ?? "";
          if (filtered.includes(next)) return next;
          const def = BINANCE.defaultSymbol.toUpperCase();
          if (filtered.includes(def)) return def;
          return filtered[0] ?? next;
        });
      } catch (err) {
        setError((prev) => prev ?? `Exchange info: ${formatError(err)}`);
      } finally {
        setSymbolsLoading(false);
      }

      // Tracked symbols (local DB) probe
      try {
        setTrackedError(null);
        setTrackedStatus("idle");

        const data = await getTrackedSymbols(controller.signal);

        setTrackedStatus("ok");
        setTrackedRaw(data);
        setTrackedSymbols(
          (data.symbols ?? [])
            .map((s) => s.symbol)
            .sort((a, b) => a.localeCompare(b))
        );
      } catch (err) {
        if (!controller.signal.aborted) {
          setTrackedStatus("down");
          setTrackedError(formatError(err));
          setTrackedRaw(formatError(err));
        }
      }

      // Symbol relationships (local DB) probe
      try {
        setRelsError(null);
        setRelsStatus("idle");

        const data = await getSymbolRelationships(controller.signal);

        setRelsStatus("ok");
        setRelsRaw(data);

        const rows = normaliseRelationshipsResponse(data)
          .filter((r) => r.enabled)
          .slice()
          .sort((a, b) => {
            const s = a.symbol.localeCompare(b.symbol);
            if (s !== 0) return s;
            return a.impactor_symbol.localeCompare(b.impactor_symbol);
          });

        setRels(rows);
      } catch (err) {
        if (!controller.signal.aborted) {
          setRelsStatus("down");
          setRelsError(formatError(err));
          setRelsRaw(formatError(err));
        }
      }
    }

    loadStartup();
    return () => controller.abort();
  }, []);

  // REST probes per symbol
  React.useEffect(() => {
    if (!selectedSymbol) return;

    const controller = new AbortController();

    async function loadSymbol() {
      setError(null);

      try {
        const [ticker24h, depth] = await Promise.all([
          getTicker24h(selectedSymbol, { signal: controller.signal }),
          getOrderBook(selectedSymbol, 10, { signal: controller.signal })
        ]);

        setApiStatus("ok");
        setTicker(ticker24h);
        setOrderBook({
          bid: depth.bids?.[0] ?? null,
          ask: depth.asks?.[0] ?? null
        });
      } catch (err) {
        if (controller.signal.aborted) return;

        if (err instanceof HttpError && err.kind === "network")
          setApiStatus("down");

        setError(formatError(err));
      }
    }

    loadSymbol();
    return () => controller.abort();
  }, [selectedSymbol]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 p-4 sm:p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Market Lab</h1>
        <p className="text-sm text-muted-foreground">
          Diagnostics for exchange connectivity, time sync, market-data
          endpoints and the local Python + Node compute bridges.
        </p>
      </header>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div className="min-w-0">
            <CardTitle>Controls</CardTitle>
            <CardDescription>
              Change the symbol to re-run REST probes (24h ticker + top-of-book
              depth).
            </CardDescription>
          </div>
          <StatusBadge status={apiStatus} />
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              {symbolsLoading ? (
                <div className="text-sm text-muted-foreground">
                  Loading symbols…
                </div>
              ) : symbols.length === 0 ? (
                <AlertCard title="No symbols found" variant="warn">
                  Exchange info loaded but returned no TRADING USDT symbols.
                  Remove the filter if you want the full universe.
                </AlertCard>
              ) : (
                <SymbolSelector
                  symbols={symbols}
                  selectedSymbol={selectedSymbol}
                  setSelectedSymbol={setSelectedSymbol}
                />
              )}
            </div>

            <div className="rounded-xl border bg-muted/40 p-3">
              <div className="text-sm font-medium">Tip</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Use Binance symbols like{" "}
                <span className="font-mono">BTCUSDT</span>,{" "}
                <span className="font-mono">ETHUSDT</span>,{" "}
                <span className="font-mono">SOLUSDT</span>.
              </p>
            </div>
          </div>

          {apiStatus === "down" ? (
            <AlertCard title="Binance API unreachable" variant="warn">
              This usually means you’re pointing at a local proxy that isn’t
              running, or the network request is failing (CORS / DNS / offline).
            </AlertCard>
          ) : null}

          {error ? (
            <AlertCard title="Error" variant="error">
              {error}
            </AlertCard>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Clock Skew</CardTitle>
            <CardDescription>
              Difference between your local clock and Binance server time. Large
              skew can break signed endpoints and distort timestamped data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CodeBlock value={skew} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Exchange Info</CardTitle>
            <CardDescription>
              Exchange metadata (timezone + number of symbols). Useful to verify
              adapter config and symbol universe.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CodeBlock value={exchangeInfo} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>24h Ticker</CardTitle>
            <CardDescription>
              Rolling 24-hour snapshot for the symbol (price change, volume,
              high/low). Handy liveness check.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CodeBlock value={ticker} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order Book Top</CardTitle>
            <CardDescription>
              Best bid/ask (top-of-book). Useful for spread sanity checks and
              depth response validation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CodeBlock value={orderBook} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Python Response</CardTitle>
            <CardDescription>
              Result from your local Python service. Confirms the browser →
              backend bridge and JSON payload handling.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CodeBlock value={pythonResponse} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Node/Nest Response</CardTitle>
            <CardDescription>
              Result from your local Nest service. Confirms the browser →
              backend bridge and JSON payload handling.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CodeBlock value={nodeResponse} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
            <div className="min-w-0">
              <CardTitle>Tracked Symbols</CardTitle>
              <CardDescription>
                Symbols enabled in your local Postgres table{" "}
                <span className="font-mono">public.tracked_symbols</span>.
                Confirms DB → Next API → UI.
              </CardDescription>
            </div>
            <StatusBadge status={trackedStatus} />
          </CardHeader>

          <CardContent className="space-y-3">
            {trackedError ? (
              <AlertCard title="Tracked symbols error" variant="warn">
                {trackedError}
              </AlertCard>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                Count:{" "}
                <span className="ml-1 font-mono">{trackedSymbols.length}</span>
              </Badge>

              {trackedSymbols.slice(0, 10).map((s) => (
                <Badge key={s} variant="secondary" className="font-mono">
                  {s}
                </Badge>
              ))}

              {trackedSymbols.length > 10 ? (
                <Badge variant="outline">
                  +{trackedSymbols.length - 10} more
                </Badge>
              ) : null}
            </div>

            <CodeBlock value={trackedRaw ?? { symbols: [] }} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
            <div className="min-w-0">
              <CardTitle>Symbol Relationships</CardTitle>
              <CardDescription>
                Enabled edges in{" "}
                <span className="font-mono">public.symbol_relationships</span>{" "}
                (e.g. <span className="font-mono">ETHUSDT ← BTCUSDT</span>).
              </CardDescription>
            </div>
            <StatusBadge status={relsStatus} />
          </CardHeader>

          <CardContent className="space-y-3">
            {relsError ? (
              <AlertCard title="Relationships error" variant="warn">
                {relsError}
              </AlertCard>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                Count: <span className="ml-1 font-mono">{rels.length}</span>
              </Badge>

              {rels.slice(0, 8).map((r) => (
                <Badge
                  key={`${r.symbol}<-${r.impactor_symbol}`}
                  variant="secondary"
                  className="font-mono"
                >
                  {r.symbol} ← {r.impactor_symbol} (w={r.weight})
                </Badge>
              ))}

              {rels.length > 8 ? (
                <Badge variant="outline">+{rels.length - 8} more</Badge>
              ) : null}
            </div>

            <CodeBlock value={relsRaw ?? { relationships: [] }} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
