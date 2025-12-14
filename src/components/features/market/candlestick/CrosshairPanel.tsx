import { type HoverInfo } from "@/types/types";

const formatNumber = (value?: number, decimals = 2) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "–";
  }
  return value.toFixed(decimals);
};

export function CrosshairPanel({ hoverInfo }: { hoverInfo: HoverInfo | null }) {
  return (
    <div
      style={{
        fontSize: "0.75rem",
        color: "#e5e7eb",
        backgroundColor: "#020617",
        border: "1px solid #4b5563",
        borderRadius: "4px",
        padding: "0.5rem 0.75rem",
        marginBottom: "0.75rem"
      }}
    >
      <div style={{ marginBottom: "0.25rem" }}>
        <strong>Crosshair:</strong>{" "}
        {hoverInfo
          ? hoverInfo.timeLabel
          : "Hover over the chart to inspect a candle"}
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
          lineHeight: 1.4
        }}
      >
        <span>
          O: <strong>{formatNumber(hoverInfo?.open)}</strong>
        </span>
        <span>
          H: <strong>{formatNumber(hoverInfo?.high)}</strong>
        </span>
        <span>
          L: <strong>{formatNumber(hoverInfo?.low)}</strong>
        </span>
        <span>
          C: <strong>{formatNumber(hoverInfo?.close)}</strong>
        </span>
        <span>
          Vol: <strong>{formatNumber(hoverInfo?.volume, 0)}</strong>
        </span>
        <span>
          MA20: <strong>{formatNumber(hoverInfo?.ma20)}</strong>
        </span>
        <span>
          EMA20: <strong>{formatNumber(hoverInfo?.ema20)}</strong>
        </span>
        <span>
          BB↑: <strong>{formatNumber(hoverInfo?.bbUpper)}</strong>
        </span>
        <span>
          BB↓: <strong>{formatNumber(hoverInfo?.bbLower)}</strong>
        </span>
        <span>
          RSI14: <strong>{formatNumber(hoverInfo?.rsi14)}</strong>
        </span>
      </div>
    </div>
  );
}
