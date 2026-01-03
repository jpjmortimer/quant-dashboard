export type TrackedSymbol = {
  symbol: string;
  enabled: boolean;
  added_at: string;
};

export async function fetchTrackedSymbols(): Promise<TrackedSymbol[]> {
  const res = await fetch("/api/tracked-symbols", { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`Failed to fetch tracked symbols (${res.status})`);
  }

  const data = (await res.json()) as { symbols: TrackedSymbol[] };
  return data.symbols;
}
