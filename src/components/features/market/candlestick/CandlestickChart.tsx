/**
 * CandlestickChart.tsx
 *
 * Educational React wrapper around TradingView's Lightweight Charts (v5).
 *
 * Responsibilities:
 * - Render candles (OHLC) using Lightweight Charts.
 * - Overlay indicator lines: Close, MA20, EMA20, Bollinger Bands, RSI14.
 * - Show crosshair hover panel for OHLC + indicators at cursor time.
 * - Add BUY/EXIT markers produced by the strategy engine.
 * - Optional: overlay an "impactor" (big brother) close line as a *scaled* dotted line:
 *    - We align impactor candles to the little-brother timeline by timestamp (robust).
 *    - We scale impactor prices so its mean close matches the little brother mean close.
 *    - This keeps the "shape" comparable on the same price axis (parallel-ness check).
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
  ColorType,
  LineStyle
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
// (Keeps chart responsive even if your data source grows.)
const MAX_VISIBLE_CANDLES = 200;

/**
 * Ensure we never feed null/NaN values into Lightweight Charts line series.
 * (It can behave oddly if you pass non-finite values.)
 */
const sanitizeLineData = (
  data: SingleValueData<Time>[]
): SingleValueData<Time>[] =>
  data.filter((d) => Number.isFinite(d.value as number));

/**
 * Convert a Candle openTime (ms) to Lightweight Charts time (seconds).
 */
const candleTime = (c: Candle): Time => Math.floor(c.openTime / 1000) as Time;

/**
 * Mean helper with safety.
 */
const mean = (xs: number[]): number =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;

/**
 * Robust impactor overlay:
 * - Align by timestamp (little brother drives the timeline)
 * - Scale impactor close values so impactor mean ~= little mean over the aligned window
 *
 * Output:
 * - SingleValueData<Time>[] suitable for a LineSeries overlay
 */
const buildImpactorScaledOverlay = (
  little: Candle[],
  impactor: Candle[]
): SingleValueData<Time>[] => {
  if (!little?.length || !impactor?.length) return [];

  // Map impactor time -> close (using seconds time to match chart)
  const impactorCloseByTime = new Map<number, number>();
  for (const c of impactor) {
    const t = Number(candleTime(c));
    const close = Number(c.close);
    if (Number.isFinite(t) && Number.isFinite(close)) {
      impactorCloseByTime.set(t, close);
    }
  }

  // Build aligned pairs on the little brother timeline.
  // If an impactor candle is missing for a given time, we skip it (robust).
  const aligned: Array<{
    time: Time;
    littleClose: number;
    impactorClose: number;
  }> = [];

  for (const c of little) {
    const t = candleTime(c);
    const littleClose = Number(c.close);
    const impactorClose = impactorCloseByTime.get(Number(t));

    if (!Number.isFinite(littleClose)) continue;
    if (impactorClose === undefined) continue;
    if (!Number.isFinite(impactorClose)) continue;

    aligned.push({ time: t, littleClose, impactorClose });
  }

  if (aligned.length < 5) return []; // not enough overlap to be meaningful

  const meanLittle = mean(aligned.map((p) => p.littleClose));
  const meanBig = mean(aligned.map((p) => p.impactorClose));

  if (
    !Number.isFinite(meanLittle) ||
    !Number.isFinite(meanBig) ||
    meanBig === 0
  )
    return [];

  const k = meanLittle / meanBig;

  return aligned.map((p) => ({
    time: p.time,
    value: p.impactorClose * k
  }));
};

// Props: we get candles + selected strategy id
type CandlestickChartProps = {
  candles: Candle[];
  strategyId: StrategyId;

  // Optional: overlay a "big brother" impactor close line
  impactorCandles?: Candle[];
  impactorSymbol?: string;
};

// Minimal shape of the markers API we care about
type MarkersApi = {
  setMarkers: (markers: SeriesMarker<Time>[]) => void;
};

export function CandlestickChart({
  candles,
  strategyId,
  impactorCandles,
  impactorSymbol
}: CandlestickChartProps) {
  // console.log("candles: ", candles);
  // console.log("impactorSymbol: ", impactorSymbol);
  // console.log("impactorCandles: ", impactorCandles);

  // const allCandles: any[] = candles.map((candle, index) => ({
  //   ...candle,
  //   impactor: impactorCandles
  //     ? {
  //         ...(impactorCandles ? impactorCandles[index] : null),
  //         symbol: impactorSymbol
  //       }
  //     : null
  // }));

  // console.log("allCandles: ", allCandles);

  // Crosshair hover state
  const [hoverInfo, setHoverInfo] = React.useState<HoverInfo | null>(null);
  const crosshairHandlerRef = React.useRef<((param: any) => void) | null>(null);

  // Visibility toggles for each series
  const [showMA20, setShowMA20] = React.useState(true);
  const [showEMA20, setShowEMA20] = React.useState(true);
  const [showCloseLine, setShowCloseLine] = React.useState(true);
  const [showImpactorCloseLine, setShowImpactorCloseLine] =
    React.useState(true);
  const [showVolume, setShowVolume] = React.useState(true);
  const [showBollinger, setShowBollinger] = React.useState(true);
  const [showRSI14, setShowRSI14] = React.useState(true);

  // ==========
  // 1) Refs for chart + DOM node + series (created once, mutated imperatively)
  // ==========

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const chartRef = React.useRef<IChartApi | null>(null);

  const candleSeriesRef = React.useRef<ISeriesApi<"Candlestick"> | null>(null);
  const closeLineSeriesRef = React.useRef<ISeriesApi<"Line"> | null>(null);
  const impactorLineSeriesRef = React.useRef<ISeriesApi<"Line"> | null>(null);
  const histogramSeriesRef = React.useRef<ISeriesApi<"Histogram"> | null>(null);
  const ma20SeriesRef = React.useRef<ISeriesApi<"Line"> | null>(null);
  const ema20SeriesRef = React.useRef<ISeriesApi<"Line"> | null>(null);
  const bbUpperSeriesRef = React.useRef<ISeriesApi<"Line"> | null>(null);
  const bbLowerSeriesRef = React.useRef<ISeriesApi<"Line"> | null>(null);
  const rsi14SeriesRef = React.useRef<ISeriesApi<"Line"> | null>(null);

  // Markers plugin ref – created once, then updated via setMarkers
  const markersPluginRef = React.useRef<MarkersApi | null>(null);

  // ==========
  // 2) Cap how many candles we *show* on the chart
  // ==========

  const visibleCandles = React.useMemo(
    () =>
      candles.length <= MAX_VISIBLE_CANDLES
        ? candles
        : candles.slice(-MAX_VISIBLE_CANDLES),
    [candles]
  );

  // ==========
  // 3) Convert Candle[] -> chart-friendly series data
  // ==========

  const formattedCandles: CandlestickData<Time>[] = React.useMemo(
    () =>
      visibleCandles.map((c) => ({
        time: candleTime(c),
        open: Number(c.open),
        high: Number(c.high),
        low: Number(c.low),
        close: Number(c.close)
      })),
    [visibleCandles]
  );

  const closeLineData: SingleValueData<Time>[] = React.useMemo(
    () =>
      formattedCandles.map((c) => ({
        time: c.time,
        value: c.close ?? 0
      })),
    [formattedCandles]
  );

  const histogramSeriesData: SingleValueData<Time>[] = React.useMemo(
    () =>
      visibleCandles.map((c) => ({
        time: candleTime(c),
        value: Number(c.volume ?? 0)
      })),
    [visibleCandles]
  );

  // Indicator config
  const MA_PERIOD = 20;
  const BB_STD_MULTIPLIER = 2;

  // Base series of closes for indicator calculations
  const closeSeriesForIndicators: TimeValuePoint[] = React.useMemo(
    () =>
      formattedCandles.map((c) => ({
        time: c.time,
        value: c.close ?? 0
      })),
    [formattedCandles]
  );

  const ma20Data: SingleValueData<Time>[] = React.useMemo(
    () =>
      calculateSma(closeSeriesForIndicators, MA_PERIOD).map((p) => ({
        time: p.time,
        value: p.value
      })),
    [closeSeriesForIndicators]
  );

  const ema20Data: SingleValueData<Time>[] = React.useMemo(
    () =>
      calculateEma(closeSeriesForIndicators, MA_PERIOD).map((p) => ({
        time: p.time,
        value: p.value
      })),
    [closeSeriesForIndicators]
  );

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

  const rsi14Data: SingleValueData<Time>[] = React.useMemo(() => {
    const raw = calculateRsi(visibleCandles, 14).map((point) => ({
      time: point.time as Time,
      value: point.value
    }));
    return sanitizeLineData(raw);
  }, [visibleCandles]);

  // ==========
  // 3.25) Optional impactor overlay data (robust timestamp alignment + mean scaling)
  // ==========

  const impactorOverlayData: SingleValueData<Time>[] = React.useMemo(() => {
    if (!impactorCandles || impactorCandles.length === 0) return [];
    return buildImpactorScaledOverlay(visibleCandles, impactorCandles);
  }, [visibleCandles, impactorCandles]);

  // ==========
  // 3.5) Strategy: build trades + compute backtest analytics
  // ==========

  const trades: Trade[] = React.useMemo(
    () =>
      buildTradesForStrategy({
        strategyId,
        formattedCandles,
        impactorCandles,
        impactorSymbol,
        ma20Data,
        maPeriod: MA_PERIOD
      }),
    [
      strategyId,
      formattedCandles,
      impactorCandles,
      impactorSymbol,
      ma20Data,
      MA_PERIOD
    ]
  );

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

  const timeRange = React.useMemo(() => {
    if (formattedCandles.length === 0) return undefined;
    const first = formattedCandles[0].time;
    const last = formattedCandles[formattedCandles.length - 1].time;
    return { from: first, to: last };
  }, [formattedCandles]);

  // ==========
  // 3.75) Markers from trades
  // ==========

  const entryMarkers: SeriesMarker<Time>[] = React.useMemo(
    () =>
      trades.map((trade) => ({
        time: trade.entryTime,
        position: "belowBar",
        color: "#22c55e",
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
  // 4) Create chart + series ONCE (mount/unmount lifecycle)
  // ==========

  React.useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: "#020617" },
        textColor: "#e5e7eb"
      },
      width: container.clientWidth || 600,
      height: 400,
      timeScale: { timeVisible: true, secondsVisible: true },
      rightPriceScale: {
        scaleMargins: { top: 0.05, bottom: 0.3 }
      }
    });

    chartRef.current = chart;

    // Main candlesticks
    candleSeriesRef.current = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444"
    });

    // Close line (solid yellow)
    closeLineSeriesRef.current = chart.addSeries(LineSeries, {
      color: "#facc15",
      lineWidth: 2,
      priceLineVisible: false
    });

    // Impactor overlay line (dotted yellow) - data is scaled before plotting
    impactorLineSeriesRef.current = chart.addSeries(LineSeries, {
      color: "rgba(250, 204, 21, 0.7)",
      lineWidth: 2,
      lineStyle: LineStyle.Dotted,
      priceLineVisible: false
    });

    // Volume histogram (separate priceScaleId)
    histogramSeriesRef.current = chart.addSeries(HistogramSeries, {
      color: "#4b5563",
      priceScaleId: "volume"
    });

    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 }
    });

    // Indicators
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

    // RSI (bottom band panel)
    rsi14SeriesRef.current = chart.addSeries(LineSeries, {
      color: "#22d3ee",
      lineWidth: 1,
      priceLineVisible: false,
      priceScaleId: "rsi"
    });

    chart.priceScale("rsi").applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 }
    });

    // Apply initial visibility
    ma20SeriesRef.current.applyOptions({ visible: showMA20 });
    ema20SeriesRef.current.applyOptions({ visible: showEMA20 });
    closeLineSeriesRef.current.applyOptions({ visible: showCloseLine });
    impactorLineSeriesRef.current.applyOptions({
      visible: showImpactorCloseLine
    });
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
      if (typeof time === "number")
        timeLabel = new Date(time * 1000).toLocaleTimeString();
      else if (typeof time === "string") timeLabel = time;

      // Helper: read the value for a given series at the crosshair time
      const getSeriesValue = (
        series:
          | ISeriesApi<"Candlestick">
          | ISeriesApi<"Line">
          | ISeriesApi<"Histogram">
          | null
      ) => {
        if (!series) return undefined;
        return param.seriesData.get(series) as any | undefined;
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

    // Markers plugin initialisation
    if (candleSeriesRef.current) {
      markersPluginRef.current = createSeriesMarkers(
        candleSeriesRef.current,
        []
      );
    }

    // Cleanup on unmount
    return () => {
      if (chartRef.current && crosshairHandlerRef.current) {
        chartRef.current.unsubscribeCrosshairMove(crosshairHandlerRef.current);
        crosshairHandlerRef.current = null;
      }

      markersPluginRef.current = null;

      if (chartRef.current) {
        const resizeHandler = (chartRef.current as any).__handleResize__;
        if (resizeHandler) window.removeEventListener("resize", resizeHandler);

        chartRef.current.remove();
        chartRef.current = null;
      }

      candleSeriesRef.current = null;
      closeLineSeriesRef.current = null;
      impactorLineSeriesRef.current = null;
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

  // ==========
  // 5) Push data + visibility + markers whenever inputs change
  // ==========

  React.useEffect(() => {
    if (!chartRef.current) return;

    // Candles + autoscale
    if (candleSeriesRef.current) {
      candleSeriesRef.current.setData(formattedCandles);
      chartRef.current.timeScale().fitContent();
    }

    // Close (solid)
    if (closeLineSeriesRef.current) {
      closeLineSeriesRef.current.setData(closeLineData);
      closeLineSeriesRef.current.applyOptions({ visible: showCloseLine });
    }

    // Impactor overlay (dotted) - robust aligned + scaled
    if (impactorLineSeriesRef.current) {
      impactorLineSeriesRef.current.setData(impactorOverlayData);
      impactorLineSeriesRef.current.applyOptions({
        visible: showImpactorCloseLine && impactorOverlayData.length > 0
      });
    }

    // Volume
    if (histogramSeriesRef.current) {
      histogramSeriesRef.current.setData(histogramSeriesData);
      histogramSeriesRef.current.applyOptions({ visible: showVolume });
    }

    // MA / EMA
    if (ma20SeriesRef.current) {
      ma20SeriesRef.current.setData(sanitizeLineData(ma20Data));
      ma20SeriesRef.current.applyOptions({ visible: showMA20 });
    }

    if (ema20SeriesRef.current) {
      ema20SeriesRef.current.setData(sanitizeLineData(ema20Data));
      ema20SeriesRef.current.applyOptions({ visible: showEMA20 });
    }

    // Bollinger
    if (bbUpperSeriesRef.current) {
      bbUpperSeriesRef.current.setData(sanitizeLineData(bollingerData.upper));
      bbUpperSeriesRef.current.applyOptions({ visible: showBollinger });
    }

    if (bbLowerSeriesRef.current) {
      bbLowerSeriesRef.current.setData(sanitizeLineData(bollingerData.lower));
      bbLowerSeriesRef.current.applyOptions({ visible: showBollinger });
    }

    // RSI
    if (rsi14SeriesRef.current) {
      rsi14SeriesRef.current.setData(sanitizeLineData(rsi14Data));
      rsi14SeriesRef.current.applyOptions({ visible: showRSI14 });
    }

    // Strategy markers
    const markersApi = markersPluginRef.current;
    if (markersApi) {
      markersApi.setMarkers(strategyId === "none" ? [] : allMarkers);
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
    impactorOverlayData,
    showMA20,
    showEMA20,
    showCloseLine,
    showImpactorCloseLine,
    showVolume,
    showBollinger,
    showRSI14,
    strategyId
  ]);

  // ==========
  // 6) "no candles yet" UI
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
  // 7) Debug / summary UI
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

      {impactorSymbol ? (
        <p style={{ fontSize: "0.8rem", opacity: 0.8 }}>
          Impactor overlay: <strong>{impactorSymbol}</strong>{" "}
          {impactorOverlayData.length > 0
            ? "(scaled + aligned)"
            : "(no overlap)"}
        </p>
      ) : null}

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
        showImpactorCloseLine={showImpactorCloseLine}
        setShowImpactorCloseLine={setShowImpactorCloseLine}
        impactorSymbol={impactorSymbol}
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
                strategyId={strategyId}
                impactorSymbol={impactorSymbol}
                stats={stats}
                trades={backtestResult.trades}
                startingBalance={backtestResult.config.startingBalance}
              />
              <WinLossDistributionPanel trades={trades} />
            </>
          )}
        </div>
      )}

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
          {recent.map((c) => {
            const t = new Date(c.openTime);
            return (
              <tr key={c.openTime}>
                <td style={{ padding: "2px 4px" }}>{t.toLocaleTimeString()}</td>
                <td style={{ padding: "2px 4px" }}>{c.open}</td>
                <td style={{ padding: "2px 4px" }}>{c.high}</td>
                <td style={{ padding: "2px 4px" }}>{c.low}</td>
                <td style={{ padding: "2px 4px" }}>{c.close}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
