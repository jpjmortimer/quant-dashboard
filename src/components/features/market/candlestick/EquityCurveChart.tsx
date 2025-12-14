import React from "react";
import {
  createChart,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type SingleValueData,
  ColorType,
  type Time
} from "lightweight-charts";
import type { EquityPoint } from "@/types/types";

type TimeRange = { from: Time; to: Time };

type EquityCurveChartProps = {
  equityCurve: EquityPoint[];
  timeRange?: TimeRange;
};

export function EquityCurveChart({
  equityCurve,
  timeRange
}: EquityCurveChartProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const chartRef = React.useRef<IChartApi | null>(null);
  const lineSeriesRef = React.useRef<ISeriesApi<"Line"> | null>(null);

  const data: SingleValueData<Time>[] = React.useMemo(
    () =>
      equityCurve
        .filter((p) => Number.isFinite(p.equity))
        .map((p) => ({
          time: p.time as Time,
          value: p.equity
        })),
    [equityCurve]
  );

  // Create chart once
  React.useEffect(() => {
    if (!containerRef.current || chartRef.current) return;

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
      height: 200,
      timeScale: {
        timeVisible: true,
        secondsVisible: true
      },
      rightPriceScale: {
        scaleMargins: {
          top: 0.2,
          bottom: 0.1
        }
      }
    });

    chartRef.current = chart;

    const lineSeries = chart.addSeries(LineSeries, {
      color: "#16a34a",
      lineWidth: 2,
      priceLineVisible: false
    });

    lineSeriesRef.current = lineSeries;

    if (data.length > 0) {
      lineSeries.setData(data);
    }

    if (timeRange) {
      chart.timeScale().setVisibleRange(timeRange);
    }

    const handleResize = () => {
      if (!chartRef.current || !containerRef.current) return;
      chartRef.current.resize(containerRef.current.clientWidth, 200, true);
    };

    window.addEventListener("resize", handleResize);
    (chartRef.current as any).__handleResize__ = handleResize;

    return () => {
      if (chartRef.current) {
        const resizeHandler = (chartRef.current as any).__handleResize__;
        if (resizeHandler) {
          window.removeEventListener("resize", resizeHandler);
        }
        chartRef.current.remove();
        chartRef.current = null;
      }
      lineSeriesRef.current = null;
    };
  }, [data.length, timeRange]);

  // Update data when equityCurve changes
  React.useEffect(() => {
    if (!lineSeriesRef.current) return;
    lineSeriesRef.current.setData(data);
  }, [data]);

  // Update visible range when main chart range changes
  React.useEffect(() => {
    if (!chartRef.current || !timeRange) return;
    chartRef.current.timeScale().setVisibleRange(timeRange);
  }, [timeRange]);

  if (!equityCurve || equityCurve.length === 0) {
    return (
      <div
        style={{
          width: "100%",
          height: "200px",
          marginTop: "1rem",
          border: "1px dashed #4b5563",
          borderRadius: "4px",
          fontSize: "0.75rem",
          color: "#e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        Equity curve will appear once the strategy produces trades.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "200px",
        marginTop: "0.5rem",
        border: "1px solid #4b5563",
        borderRadius: "4px"
      }}
    />
  );
}
