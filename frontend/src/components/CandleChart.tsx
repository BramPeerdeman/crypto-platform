import { useEffect, useRef } from 'react';
import { createChart, type IChartApi, CandlestickSeries } from 'lightweight-charts';

interface Candle {
  openTime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Props {
  symbol: string;
  interval: string;
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

export default function CandleChart({ symbol, interval }: Props) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ReturnType<IChartApi['addSeries']> | null>(null);

  // Create chart once on mount
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { color: '#2a2a40' },
        textColor: '#ccc',
      },
      grid: {
        vertLines: { color: '#444' },
        horzLines: { color: '#444' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#00ff88',
      downColor: '#ff4d4d',
      borderUpColor: '#00ff88',
      borderDownColor: '#ff4d4d',
      wickUpColor: '#00ff88',
      wickDownColor: '#ff4d4d',
    });

    chartRef.current = chart;
    seriesRef.current = series;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Fetch candles when symbol or interval changes
  useEffect(() => {
    if (!seriesRef.current) return;

    const fetchCandles = async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/candles/${symbol}/${interval}?limit=100`
        );
        const data: Candle[] = await response.json();

        if (data.length === 0) return;

        // Lightweight Charts needs data sorted oldest first
        const formatted = data
          .reverse()
          .map((c) => ({
            time: Math.floor(new Date(c.openTime).getTime() / 1000) as any,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          }));

        seriesRef.current!.setData(formatted);
        chartRef.current!.timeScale().fitContent();
      } catch (err) {
        console.error('Failed to fetch candles', err);
      }
    };

    fetchCandles();
    const interval_id = setInterval(fetchCandles, 60000); // refresh every minute
    return () => clearInterval(interval_id);

  }, [symbol, interval]);

  return (
    <div style={{
      backgroundColor: '#2a2a40',
      borderRadius: '12px',
      padding: '1.5rem',
      marginTop: '1rem'
    }}>
      <h2 style={{ marginTop: 0 }}>
        Candlestick: <span style={{ color: '#00ff88' }}>{symbol}</span>
        <span style={{ fontSize: '0.9rem', color: '#888', marginLeft: '10px' }}>{interval}</span>
      </h2>
      <div ref={chartContainerRef} />
    </div>
  );
}