// components/IntervalSelector.tsx

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

/**
 * Binance-supported kline intervals
 * https://developers.binance.com/docs/binance-spot-api-docs/rest-api#klinecandlestick-data
 */
export const intervalOptions = [
  "1m",
  "3m",
  "5m",
  "15m",
  "30m",
  "1h",
  "2h",
  "4h",
  "6h",
  "8h",
  "12h",
  "1d",
  "3d",
  "1w",
  "1M"
] as const;

export type Interval = (typeof intervalOptions)[number];

type IntervalSelectorProps = {
  interval: Interval;
  setInterval: (interval: Interval) => void;
};

export function IntervalSelector({
  interval,
  setInterval
}: IntervalSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium">Interval</label>

      <Select value={interval} onValueChange={setInterval}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Select interval" />
        </SelectTrigger>

        <SelectContent>
          {intervalOptions.map((i) => (
            <SelectItem key={i} value={i}>
              {i}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
