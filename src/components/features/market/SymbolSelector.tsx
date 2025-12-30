import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

type SymbolSelectorProps = {
  symbols: string[];
  selectedSymbol: string;
  setSelectedSymbol: (symbol: string) => void;
};

export function SymbolSelector({
  symbols,
  selectedSymbol,
  setSelectedSymbol
}: SymbolSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium">Symbol:</label>

      <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select symbol" />
        </SelectTrigger>

        <SelectContent>
          {symbols.map((symbol) => (
            <SelectItem key={symbol} value={symbol}>
              {symbol}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
