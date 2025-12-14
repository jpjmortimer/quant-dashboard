type LegendProps = {
  showMA20: boolean;
  setShowMA20: (value: boolean) => void;
  showEMA20: boolean;
  setShowEMA20: (value: boolean) => void;
  showCloseLine: boolean;
  setShowCloseLine: (value: boolean) => void;
  showVolume: boolean;
  setShowVolume: (value: boolean) => void;
  showBollinger: boolean;
  setShowBollinger: (value: boolean) => void;
  // 🔹 NEW: RSI toggle
  showRSI14: boolean;
  setShowRSI14: (value: boolean) => void;
};

export function Legend({
  showMA20,
  setShowMA20,
  showEMA20,
  setShowEMA20,
  showCloseLine,
  setShowCloseLine,
  showVolume,
  setShowVolume,
  showBollinger,
  setShowBollinger,
  showRSI14,
  setShowRSI14
}: LegendProps) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "1rem",
        fontSize: "0.75rem",
        color: "#9ca3af",
        alignItems: "center",
        marginBottom: "0.5rem"
      }}
    >
      <span style={{ fontWeight: 600 }}>Legend:</span>

      {/* Candles (always on for now) */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
        <span
          style={{
            display: "inline-block",
            width: "8px",
            height: "8px",
            backgroundColor: "#22c55e",
            borderRadius: "2px"
          }}
        />
        <span
          style={{
            display: "inline-block",
            width: "8px",
            height: "8px",
            backgroundColor: "#ef4444",
            borderRadius: "2px",
            marginLeft: "2px"
          }}
        />
        <span>Candles (green = up, red = down)</span>
      </div>

      {/* Close line */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
        <input
          type="checkbox"
          checked={showCloseLine}
          onChange={(event) => setShowCloseLine(event.target.checked)}
        />
        <span
          style={{
            width: "14px",
            height: "0",
            borderTop: "2px solid #facc15"
          }}
        />
        <span>Close line (yellow)</span>
      </div>

      {/* MA20 line */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
        <input
          type="checkbox"
          checked={showMA20}
          onChange={(event) => setShowMA20(event.target.checked)}
        />
        <span
          style={{
            width: "14px",
            height: "0",
            borderTop: "2px solid #38bdf8"
          }}
        />
        <span>MA20 (blue) – 20-candle moving average</span>
      </div>

      {/* EMA20 line */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
        <input
          type="checkbox"
          checked={showEMA20}
          onChange={(event) => setShowEMA20(event.target.checked)}
        />
        <span
          style={{
            width: "14px",
            height: "0",
            borderTop: "2px solid #a855f7"
          }}
        />
        <span>EMA20 (purple) – 20-candle exponential moving average</span>
      </div>

      {/* Volume histogram */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
        <input
          type="checkbox"
          checked={showVolume}
          onChange={(event) => setShowVolume(event.target.checked)}
        />
        <span
          style={{
            width: "6px",
            height: "10px",
            backgroundColor: "#4b5563",
            borderRadius: "1px"
          }}
        />
        <span>Volume (grey bars, separate lower panel)</span>
      </div>

      {/* Bollinger Bands */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
        <input
          type="checkbox"
          checked={showBollinger}
          onChange={(event) => setShowBollinger(event.target.checked)}
        />
        <span
          style={{
            width: "14px",
            height: "0",
            borderTop: "1px solid #f97316"
          }}
        />
        <span>
          Bollinger Bands (orange) – upper &amp; lower volatility bands
        </span>
      </div>

      {/* 🔹 RSI 14 */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
        <input
          type="checkbox"
          checked={showRSI14}
          onChange={(event) => setShowRSI14(event.target.checked)}
        />
        <span
          style={{
            width: "14px",
            height: "0",
            borderTop: "1px solid #22d3ee"
          }}
        />
        <span>RSI 14 (cyan) – momentum oscillator (0–100)</span>
      </div>
    </div>
  );
}
