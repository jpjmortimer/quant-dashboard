/**
 * CandlestickChart.tsx
 *
 * Educational React wrapper around TradingView's Lightweight Charts (v5).
 *
 * Responsibilities:
 * - Receive an array of normalised `Candle` objects from your container.
 * - Create a candlestick chart once on mount.
 * - Update the chart whenever `candles` changes.
 * - Add a close-price line (yellow).
 * - Add a volume histogram (grey bars).
 * - Add a 20-period Moving Average (MA20) line (blue).
 * - Add a 20-period EMA line (purple).
 * - Add Bollinger Bands (upper/lower, orange).
 * - Add a crosshair hover panel showing OHLC + indicators at cursor time.
 * - Add BUY/SELL markers & P/L based on a pluggable strategy.
 */

import React from "react";
import type { Candle } from "./candlestickHelpers";

import {
  createChart,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type Time,
  type CandlestickData,
  type SingleValueData,
  type SeriesMarker,
  createSeriesMarkers,
  ColorType
} from "lightweight-charts";

import { type StrategyId, type Trade, type HoverInfo } from "@/types/types";
import { buildTradesForStrategy } from "@/lib/strategies/strategyEngine";

import { Legend } from "./Legend";
import { CrosshairPanel } from "./CrosshairPanel";

import { calculateRsi } from "./rsi";
import { runBacktestFromTrades } from "@/lib/backtest/analytics/fromTrades";
import { BacktestResultsPanel } from "./BacktestResultsPanel";
import { EquityCurveChart } from "./EquityCurveChart";
import { WinLossDistributionPanel } from "./WinLossDistributionPanel";

import {
  calculateSma,
  calculateEma,
  calculateBollinger,
  type TimeValuePoint
} from "@/lib/indicators/indicators";

// Limit how many candles we actually *render* on the chart.
const MAX_VISIBLE_CANDLES = 200;

// Small helper to ensure we never feed null/NaN line values into the chart
const sanitizeLineData = (
  data: SingleValueData<Time>[]
): SingleValueData<Time>[] =>
  data.filter((d) => Number.isFinite(d.value as number));

// Props: we get candles + selected strategy id
type CandlestickChartProps = {
  candles: Candle[];
  strategyId: StrategyId;
};

// Minimal shape of the markers API we care about
type MarkersApi = {
  setMarkers: (markers: SeriesMarker<Time>[]) => void;
};

export function CandlestickChart({
  candles,
  strategyId
}: CandlestickChartProps) {
  // Crosshair hover state
  const [hoverInfo, setHoverInfo] = React.useState<HoverInfo | null>(null);
  const crosshairHandlerRef = React.useRef<((param: any) => void) | null>(null);

  // Visibility toggles for each series
  const [showMA20, setShowMA20] = React.useState(true);
  const [showEMA20, setShowEMA20] = React.useState(true);
  const [showCloseLine, setShowCloseLine] = React.useState(true);
  const [showVolume, setShowVolume] = React.useState(true);
  const [showBollinger, setShowBollinger] = React.useState(true);
  const [showRSI14, setShowRSI14] = React.useState(true);

  // ==========
  // 1. Refs for chart + DOM node + series
  // ==========

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const chartRef = React.useRef<IChartApi | null>(null);

  const candleSeriesRef = React.useRef<ISeriesApi<"Candlestick"> | null>(null);
  const closeLineSeriesRef = React.useRef<ISeriesApi<"Line"> | null>(null);
  const histogramSeriesRef = React.useRef<ISeriesApi<"Histogram"> | null>(null);
  const ma20SeriesRef = React.useRef<ISeriesApi<"Line"> | null>(null);
  const ema20SeriesRef = React.useRef<ISeriesApi<"Line"> | null>(null);
  const bbUpperSeriesRef = React.useRef<ISeriesApi<"Line"> | null>(null);
  const bbLowerSeriesRef = React.useRef<ISeriesApi<"Line"> | null>(null);
  const rsi14SeriesRef = React.useRef<ISeriesApi<"Line"> | null>(null);

  // 🔹 Markers plugin ref – created once, then updated via setMarkers
  const markersPluginRef = React.useRef<MarkersApi | null>(null);

  // ==========
  // 2. Cap how many candles we *show* on the chart
  // ==========

  const visibleCandles = React.useMemo(
    () =>
      candles.length <= MAX_VISIBLE_CANDLES
        ? candles
        : candles.slice(-MAX_VISIBLE_CANDLES),
    [candles]
  );

  // ==========
  // 3. Convert Candle[] → chart-friendly data
  // ==========

  const formattedCandles: CandlestickData<Time>[] = React.useMemo(
    () =>
      visibleCandles.map((candle) => ({
        time: Math.floor(candle.openTime / 1000) as Time, // ms → seconds
        open: Number(candle.open),
        high: Number(candle.high),
        low: Number(candle.low),
        close: Number(candle.close)
      })),
    [visibleCandles]
  );

  const closeLineData: SingleValueData<Time>[] = React.useMemo(
    () =>
      formattedCandles.map((candle) => ({
        time: candle.time,
        value: candle.close ?? 0
      })),
    [formattedCandles]
  );

  const histogramSeriesData: SingleValueData<Time>[] = React.useMemo(
    () =>
      visibleCandles.map((candle) => ({
        time: Math.floor(candle.openTime / 1000) as Time,
        value: Number(candle.volume ?? 0)
      })),
    [visibleCandles]
  );

  const MA_PERIOD = 20;

  // Base series of closes for indicator calculations
  const closeSeriesForIndicators: TimeValuePoint[] = React.useMemo(
    () =>
      formattedCandles.map((c) => ({
        time: c.time,
        value: c.close ?? 0
      })),
    [formattedCandles]
  );

  // --- MA20 (simple moving average) ---
  const ma20Data: SingleValueData<Time>[] = React.useMemo(
    () =>
      calculateSma(closeSeriesForIndicators, MA_PERIOD).map((p) => ({
        time: p.time,
        value: p.value
      })),
    [closeSeriesForIndicators]
  );

  // --- EMA20 ---
  const ema20Data: SingleValueData<Time>[] = React.useMemo(
    () =>
      calculateEma(closeSeriesForIndicators, MA_PERIOD).map((p) => ({
        time: p.time,
        value: p.value
      })),
    [closeSeriesForIndicators]
  );

  // --- Bollinger Bands ---
  const BB_STD_MULTIPLIER = 2;

  const bollingerData = React.useMemo(() => {
    const { middle, upper, lower } = calculateBollinger(
      closeSeriesForIndicators,
      MA_PERIOD,
      BB_STD_MULTIPLIER
    );

    return {
      middle: middle.map((p) => ({ time: p.time, value: p.value })),
      upper: upper.map((p) => ({ time: p.time, value: p.value })),
      lower: lower.map((p) => ({ time: p.time, value: p.value }))
    };
  }, [closeSeriesForIndicators]);

  // --- RSI 14 ---
  const rsi14Data: SingleValueData<Time>[] = React.useMemo(() => {
    const raw = calculateRsi(visibleCandles, 14).map((point) => ({
      time: point.time as Time,
      value: point.value
    }));

    return sanitizeLineData(raw);
  }, [visibleCandles]);

  // ==========
  // 3.5 Strategy: build trades via strategy engine
  // ==========

  const trades: Trade[] = React.useMemo(
    () =>
      buildTradesForStrategy({
        strategyId,
        formattedCandles,
        ma20Data,
        maPeriod: MA_PERIOD
      }),
    [strategyId, formattedCandles, ma20Data]
  );

  // NEW: backtest analytics from those trades
  const backtestResult = React.useMemo(
    () =>
      runBacktestFromTrades({
        trades,
        startingBalance: 1_000,
        feeRate: 0.0004, // 0.04% per side
        spreadBps: 2, // 0.02% round-trip spread
        slippageBps: 3 // 0.03% round-trip slippage
      }),
    [trades]
  );

  const stats = backtestResult.stats;
  const equityCurve = backtestResult.equityCurve;

  // Time range of the main chart – shared with the equity curve
  const timeRange = React.useMemo(() => {
    if (formattedCandles.length === 0) return undefined;

    const first = formattedCandles[0].time;
    const last = formattedCandles[formattedCandles.length - 1].time;

    return { from: first, to: last };
  }, [formattedCandles]);

  /**
   * Markers for entries (BUY) and exits (EXIT).
   *
   * If strategyId = "none", trades[] is empty → no markers.
   */
  const entryMarkers: SeriesMarker<Time>[] = React.useMemo(
    () =>
      trades.map((trade) => ({
        time: trade.entryTime,
        position: "belowBar",
        color: "#22c55e", // green
        shape: "arrowUp",
        text: "BUY"
      })),
    [trades]
  );

  const exitMarkers: SeriesMarker<Time>[] = React.useMemo(
    () =>
      trades.map((trade) => ({
        time: trade.exitTime,
        position: "aboveBar",
        color:
          trade.profitAfterCosts ?? trade.profit >= 0 ? "#22c55e" : "#ef4444",
        shape: "circle",
        text: (trade.profitAfterCosts ?? trade.profit) >= 0 ? "EXIT+" : "EXIT-"
      })),
    [trades]
  );

  const allMarkers: SeriesMarker<Time>[] = React.useMemo(
    () => [...entryMarkers, ...exitMarkers],
    [entryMarkers, exitMarkers]
  );

  // ==========
  // 4. Create / update the chart
  // ==========

  // Create chart + series once
  React.useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    const chart = createChart(container, {
      layout: {
        background: {
          type: ColorType.Solid,
          color: "#020617"
        },
        textColor: "#e5e7eb"
      },
      width: container.clientWidth || 600,
      height: 400,
      timeScale: {
        timeVisible: true,
        secondsVisible: true
      },
      rightPriceScale: {
        scaleMargins: {
          top: 0.05,
          bottom: 0.3
        }
      }
    });

    chartRef.current = chart;

    // Create series once
    candleSeriesRef.current = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444"
    });

    closeLineSeriesRef.current = chart.addSeries(LineSeries, {
      color: "#facc15",
      lineWidth: 2,
      priceLineVisible: false
    });

    histogramSeriesRef.current = chart.addSeries(HistogramSeries, {
      color: "#4b5563",
      priceScaleId: "volume"
    });

    chart.priceScale("volume").applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0
      }
    });

    ma20SeriesRef.current = chart.addSeries(LineSeries, {
      color: "#38bdf8",
      lineWidth: 2,
      priceLineVisible: false
    });

    ema20SeriesRef.current = chart.addSeries(LineSeries, {
      color: "#a855f7",
      lineWidth: 2,
      priceLineVisible: false
    });

    bbUpperSeriesRef.current = chart.addSeries(LineSeries, {
      color: "#f97316",
      lineWidth: 1,
      priceLineVisible: false
    });

    bbLowerSeriesRef.current = chart.addSeries(LineSeries, {
      color: "#f97316",
      lineWidth: 1,
      priceLineVisible: false
    });

    // 🔹 NEW: RSI series in its own bottom panel
    rsi14SeriesRef.current = chart.addSeries(LineSeries, {
      color: "#22d3ee",
      lineWidth: 1,
      priceLineVisible: false,
      priceScaleId: "rsi"
    });

    chart.priceScale("rsi").applyOptions({
      scaleMargins: {
        top: 0.85, // bottom band
        bottom: 0
      }
    });

    // Initial visibility for toggles
    ma20SeriesRef.current.applyOptions({ visible: showMA20 });
    ema20SeriesRef.current.applyOptions({ visible: showEMA20 });
    closeLineSeriesRef.current.applyOptions({ visible: showCloseLine });
    histogramSeriesRef.current.applyOptions({ visible: showVolume });
    bbUpperSeriesRef.current.applyOptions({ visible: showBollinger });
    bbLowerSeriesRef.current.applyOptions({ visible: showBollinger });
    rsi14SeriesRef.current.applyOptions({ visible: showRSI14 });

    // Resize handler
    const handleResize = () => {
      if (!chartRef.current || !containerRef.current) return;
      chartRef.current.resize(containerRef.current.clientWidth, 400, true);
    };

    window.addEventListener("resize", handleResize);
    (chartRef.current as any).__handleResize__ = handleResize;

    // Crosshair handler
    const crosshairHandler = (param: any) => {
      if (
        !param ||
        !param.time ||
        !param.seriesData ||
        param.seriesData.size === 0
      ) {
        setHoverInfo(null);
        return;
      }

      const time = param.time as Time;

      let timeLabel = "";
      if (typeof time === "number") {
        timeLabel = new Date(time * 1000).toLocaleTimeString();
      } else if (typeof time === "string") {
        timeLabel = time;
      }

      const getSeriesValue = (
        series:
          | ISeriesApi<"Candlestick">
          | ISeriesApi<"Line">
          | ISeriesApi<"Histogram">
          | null
      ) => {
        if (!series) return undefined;
        const raw = param.seriesData.get(series);
        return raw as any | undefined;
      };

      const candleData = getSeriesValue(candleSeriesRef.current) as
        | CandlestickData<Time>
        | undefined;

      const volumeData = getSeriesValue(histogramSeriesRef.current) as
        | SingleValueData<Time>
        | undefined;

      const ma20AtPoint = getSeriesValue(ma20SeriesRef.current) as
        | SingleValueData<Time>
        | undefined;

      const ema20AtPoint = getSeriesValue(ema20SeriesRef.current) as
        | SingleValueData<Time>
        | undefined;

      const bbUpperAtPoint = getSeriesValue(bbUpperSeriesRef.current) as
        | SingleValueData<Time>
        | undefined;

      const bbLowerAtPoint = getSeriesValue(bbLowerSeriesRef.current) as
        | SingleValueData<Time>
        | undefined;

      const rsi14AtPoint = getSeriesValue(rsi14SeriesRef.current) as
        | SingleValueData<Time>
        | undefined;

      setHoverInfo({
        timeLabel,
        open: candleData?.open,
        high: candleData?.high,
        low: candleData?.low,
        close: candleData?.close,
        volume: volumeData?.value,
        ma20: ma20AtPoint?.value,
        ema20: ema20AtPoint?.value,
        bbUpper: bbUpperAtPoint?.value,
        bbLower: bbLowerAtPoint?.value,
        rsi14: rsi14AtPoint?.value
      });
    };

    chart.subscribeCrosshairMove(crosshairHandler);
    crosshairHandlerRef.current = crosshairHandler;

    // 🔹 Initialise markers plugin with no markers (create ONCE)
    if (candleSeriesRef.current) {
      markersPluginRef.current = createSeriesMarkers(
        candleSeriesRef.current,
        []
      );
    }

    // Cleanup ONLY on unmount
    return () => {
      if (chartRef.current && crosshairHandlerRef.current) {
        chartRef.current.unsubscribeCrosshairMove(crosshairHandlerRef.current);
        crosshairHandlerRef.current = null;
      }

      // No markersPluginRef.current.remove() – plugin is bound to the series,
      // and chart.remove() will dispose everything.
      markersPluginRef.current = null;

      if (chartRef.current) {
        const resizeHandler = (chartRef.current as any).__handleResize__;
        if (resizeHandler) {
          window.removeEventListener("resize", resizeHandler);
        }

        chartRef.current.remove();
        chartRef.current = null;
      }

      candleSeriesRef.current = null;
      closeLineSeriesRef.current = null;
      histogramSeriesRef.current = null;
      ma20SeriesRef.current = null;
      ema20SeriesRef.current = null;
      bbUpperSeriesRef.current = null;
      bbLowerSeriesRef.current = null;
      rsi14SeriesRef.current = null;

      setHoverInfo(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // chart created once

  // Push data + markers + visibility whenever data / strategy / toggles change
  React.useEffect(() => {
    if (!chartRef.current) return;

    if (candleSeriesRef.current) {
      candleSeriesRef.current.setData(formattedCandles);
      chartRef.current.timeScale().fitContent();
    }

    if (closeLineSeriesRef.current) {
      closeLineSeriesRef.current.setData(closeLineData);
      closeLineSeriesRef.current.applyOptions({ visible: showCloseLine });
    }

    if (histogramSeriesRef.current) {
      histogramSeriesRef.current.setData(histogramSeriesData);
      histogramSeriesRef.current.applyOptions({ visible: showVolume });
    }

    if (ma20SeriesRef.current) {
      ma20SeriesRef.current.setData(sanitizeLineData(ma20Data));
      ma20SeriesRef.current.applyOptions({ visible: showMA20 });
    }

    if (ema20SeriesRef.current) {
      ema20SeriesRef.current.setData(sanitizeLineData(ema20Data));
      ema20SeriesRef.current.applyOptions({ visible: showEMA20 });
    }

    if (bbUpperSeriesRef.current) {
      bbUpperSeriesRef.current.setData(sanitizeLineData(bollingerData.upper));
      bbUpperSeriesRef.current.applyOptions({ visible: showBollinger });
    }

    if (bbLowerSeriesRef.current) {
      bbLowerSeriesRef.current.setData(sanitizeLineData(bollingerData.lower));
      bbLowerSeriesRef.current.applyOptions({ visible: showBollinger });
    }

    if (rsi14SeriesRef.current) {
      rsi14SeriesRef.current.setData(sanitizeLineData(rsi14Data));
      rsi14SeriesRef.current.applyOptions({ visible: showRSI14 });
    }

    // 🔹 Strategy markers (BUY / EXIT)
    const markersApi = markersPluginRef.current;
    if (markersApi) {
      const markersToApply = strategyId === "none" ? [] : allMarkers;
      markersApi.setMarkers(markersToApply);
    }
  }, [
    formattedCandles,
    closeLineData,
    histogramSeriesData,
    ma20Data,
    ema20Data,
    bollingerData,
    rsi14Data,
    allMarkers,
    showMA20,
    showEMA20,
    showCloseLine,
    showVolume,
    showBollinger,
    showRSI14,
    strategyId
  ]);

  // ==========
  // 6. "no candles yet" UI
  // ==========

  if (!candles || candles.length === 0) {
    return (
      <div id="CandlestickChart">
        <h2>🕯 CandlestickChart</h2>
        <p>Waiting for candles from Binance…</p>

        <div
          ref={containerRef}
          style={{
            width: "100%",
            height: "400px",
            marginTop: "1rem",
            border: "1px dashed #4b5563",
            borderRadius: "4px"
          }}
        >
          <p style={{ padding: "0.5rem", fontSize: "0.8rem" }}>
            Chart will appear here once we have data.
          </p>
        </div>
      </div>
    );
  }

  // ==========
  // 7. Debug / summary UI
  // ==========

  const last = candles[candles.length - 1];
  const lastTime = new Date(last.openTime);
  const status = last.closed ? "✅ closed candle" : "🟡 forming candle";
  const recent = visibleCandles.slice(-5);

  return (
    <div id="CandlestickChart">
      <h2>🕯 CandlestickChart (live data)</h2>

      <p>
        Latest candle for <strong>1m</strong> at{" "}
        <strong>{lastTime.toLocaleTimeString()}</strong>
      </p>
      <p>
        {status} · O: <strong>{last.open}</strong> · H:{" "}
        <strong>{last.high}</strong> · L: <strong>{last.low}</strong> · C:{" "}
        <strong>{last.close}</strong> · Vol: <strong>{last.volume}</strong>
      </p>
      <p>
        Total candles loaded: <strong>{candles.length}</strong> · Showing last{" "}
        <strong>{visibleCandles.length}</strong>
      </p>

      {/* Chart container */}
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "400px",
          margin: "1rem 0",
          border: "1px solid #4b5563",
          borderRadius: "4px"
        }}
      />

      <CrosshairPanel hoverInfo={hoverInfo} />

      <Legend
        showMA20={showMA20}
        setShowMA20={setShowMA20}
        showEMA20={showEMA20}
        setShowEMA20={setShowEMA20}
        showCloseLine={showCloseLine}
        setShowCloseLine={setShowCloseLine}
        showVolume={showVolume}
        setShowVolume={setShowVolume}
        showBollinger={showBollinger}
        setShowBollinger={setShowBollinger}
        showRSI14={showRSI14}
        setShowRSI14={setShowRSI14}
      />

      {strategyId !== "none" && equityCurve.length > 0 && (
        <div style={{ marginTop: "1rem" }}>
          <EquityCurveChart equityCurve={equityCurve} timeRange={timeRange} />
        </div>
      )}

      {/* Simple strategy performance summary – only if a strategy is active */}
      {strategyId !== "none" && (
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
          {trades.length === 0 ? (
            <div>No completed trades yet for this strategy.</div>
          ) : (
            <>
              <BacktestResultsPanel
                stats={stats}
                trades={backtestResult.trades}
                startingBalance={backtestResult.config.startingBalance}
              />
              <WinLossDistributionPanel trades={trades} />
            </>
          )}
        </div>
      )}

      {/* Debug table of last 5 visible candles */}
      <h3>Last {recent.length} visible candles</h3>
      <table style={{ fontSize: "0.8rem", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ padding: "2px 4px" }}>Time</th>
            <th style={{ padding: "2px 4px" }}>O</th>
            <th style={{ padding: "2px 4px" }}>H</th>
            <th style={{ padding: "2px 4px" }}>L</th>
            <th style={{ padding: "2px 4px" }}>C</th>
          </tr>
        </thead>
        <tbody>
          {recent.map((candle) => {
            const t = new Date(candle.openTime);
            return (
              <tr key={candle.openTime}>
                <td style={{ padding: "2px 4px" }}>{t.toLocaleTimeString()}</td>
                <td style={{ padding: "2px 4px" }}>{candle.open}</td>
                <td style={{ padding: "2px 4px" }}>{candle.high}</td>
                <td style={{ padding: "2px 4px" }}>{candle.low}</td>
                <td style={{ padding: "2px 4px" }}>{candle.close}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
