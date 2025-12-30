import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
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
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium">Strategy:</label>

      <Select
        value={strategyId}
        onValueChange={(value) => setStrategyId(value as StrategyId)}
      >
        <SelectTrigger className="w-[260px]">
          <SelectValue placeholder="Select strategy" />
        </SelectTrigger>

        <SelectContent>
          {strategies.map((strategy) => (
            <SelectItem key={strategy.id} value={strategy.id}>
              {strategy.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
