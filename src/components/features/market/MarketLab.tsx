"use client";

import * as React from "react";
import { logBinanceConfig, BINANCE } from "@/lib/exchanges/binance/config";
import { HttpError } from "@/lib/http";
import {
  getServerTime,
  calculateClockSkewMs
} from "@/lib/exchanges/binance/time";
import { getExchangeInfo } from "@/lib/exchanges/binance/exchangeInfo";
import { getTicker24h, getOrderBook } from "@/lib/exchanges/binance/marketData";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ApiStatus = "idle" | "ok" | "down";

type ExchangeInfoSummary = {
  timezone: string;
  symbols: number;
};

type OrderBookTop = {
  bid: [string, string] | null;
  ask: [string, string] | null;
};

function formatError(err: unknown): string {
  if (err instanceof HttpError) return `${err.kind}: ${err.message}`;
  if (err instanceof Error) return err.message;
  return String(err);
}

async function postPythonCompute(signal?: AbortSignal) {
  const res = await fetch("http://localhost:8001/compute", {
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

/* --------------------------------- Feature --------------------------------- */

export function MarketLab() {
  const [symbol, setSymbol] = React.useState(
    BINANCE.defaultSymbol.toUpperCase()
  );

  const [apiStatus, setApiStatus] = React.useState<ApiStatus>("idle");
  const [error, setError] = React.useState<string | null>(null);

  const [skew, setSkew] = React.useState<string>("Checking…");
  const [exchangeInfo, setExchangeInfo] =
    React.useState<ExchangeInfoSummary | null>(null);

  const [ticker, setTicker] = React.useState<unknown>(null);
  const [orderBook, setOrderBook] = React.useState<OrderBookTop | null>(null);

  const [pythonResponse, setPythonResponse] = React.useState<string>(
    "Waiting for python endpoint…"
  );

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

      // Binance time + exchange info (independent; don’t let one break the other)
      try {
        const serverTime = await getServerTime();
        const skewMs = calculateClockSkewMs(Date.now(), serverTime);
        setSkew(`${skewMs} ms`);
      } catch (err) {
        setSkew("Error");
        setError((prev) => prev ?? `Clock skew: ${formatError(err)}`);
      }

      try {
        const info = await getExchangeInfo();
        setExchangeInfo({
          timezone: info.timezone,
          symbols: info.symbols.length
        });
      } catch (err) {
        setError((prev) => prev ?? `Exchange info: ${formatError(err)}`);
      }
    }

    loadStartup();
    return () => controller.abort();
  }, []);

  // REST probes per symbol
  React.useEffect(() => {
    const controller = new AbortController();

    async function loadSymbol() {
      setError(null);

      try {
        const [ticker24h, depth] = await Promise.all([
          getTicker24h(symbol, { signal: controller.signal }),
          getOrderBook(symbol, 10, { signal: controller.signal })
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
  }, [symbol]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 p-4 sm:p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Market Lab</h1>
        <p className="text-sm text-muted-foreground">
          Diagnostics for exchange connectivity, time sync, market-data
          endpoints and the local Python compute bridge.
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
              <label className="text-sm font-medium">Symbol</label>
              <Input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="e.g. BTCUSDT"
              />
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

        <Card className="lg:col-span-2">
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
      </div>
    </div>
  );
}
