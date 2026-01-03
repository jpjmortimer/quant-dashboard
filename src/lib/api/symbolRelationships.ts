export type symbolRelationships = {
  symbol: string;
  enabled: boolean;
  impactor_symbol: string;
  weight: number;
  added_at: string;
};

export async function fetchSymbolRelationships(): Promise<
  symbolRelationships[]
> {
  const res = await fetch("/api/symbol-relationships", { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`Failed to fetch symbol relationships (${res.status})`);
  }

  const data = (await res.json()) as { symbols: symbolRelationships[] };
  return data.symbols;
}
