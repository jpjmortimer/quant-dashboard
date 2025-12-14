import { type StrategyId, type StrategySelectorProps } from "@/types/types";

const strategies: { id: StrategyId; name: string }[] = [
  { id: "none", name: "None (Indicators Only)" },
  { id: "ma20-cross", name: "MA20 Cross (Basic)" },
  { id: "ma20-cross-rev", name: "MA20 Cross (Basic) Reverse" },
  { id: "ma20-cross-tp-sl", name: "MA20 Cross (Take Profit / Stop Loss)" },
  { id: "ma20-trailing-stop", name: "MA20 Cross (Trailing Stop)" }
];

export function StrategySelector({
  strategyId,
  setStrategyId
}: StrategySelectorProps) {
  return (
    <div>
      <label>
        <span style={{ marginRight: "0.5rem" }}>Strategy:</span>
        <select
          value={strategyId}
          onChange={(e) => setStrategyId(e.target.value as StrategyId)}
        >
          {strategies.map((strategy) => (
            <option key={strategy.id} value={strategy.id}>
              {strategy.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
