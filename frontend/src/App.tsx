import { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import "./App.css";
import CandleChart from "./components/CandleChart";

interface CryptoPrice {
  id: number;
  symbol: string;
  price: number;
  timestamp: string;
}

interface ChartData {
  time: string;
  price: number;
}

const AVAILABLE_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT"];

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

function App() {
  const [chartInterval, setChartInterval] = useState<string>('1m');
  const AVAILABLE_INTERVALS = ['1m', '1h', '1d'];
  const [prices, setPrices] = useState<ChartData[]>([]);
  const [symbol, setSymbol] = useState<string>("BTCUSDT");
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [priceDirection, setPriceDirection] = useState<"up" | "down" | "flat">(
    "flat",
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Use a ref for lastPrice inside the effect to avoid stale closure
  const lastPriceRef = useRef<number | null>(null);

  useEffect(() => {
    // Reset everything when symbol changes
    setPrices([]);
    setLastPrice(null);
    lastPriceRef.current = null;
    setPriceDirection("flat");
    setLoading(true);
    setError(null);

    const fetchPrices = async () => {
      try {
        const response = await axios.get<CryptoPrice[]>(
          `${API_URL}/api/prices/${symbol}?limit=20`,
        );
        const data = response.data;

        if (data.length > 0) {
          const currentPrice = data[0].price;

          // Use ref here — always has the latest value
          if (lastPriceRef.current !== null) {
            if (currentPrice > lastPriceRef.current) setPriceDirection("up");
            else if (currentPrice < lastPriceRef.current)
              setPriceDirection("down");
            else setPriceDirection("flat");
          }

          lastPriceRef.current = currentPrice;
          setLastPrice(currentPrice);

          const chartData: ChartData[] = data.reverse().map((item) => ({
            time: new Date(item.timestamp).toLocaleTimeString("nl-NL"),
            price: item.price,
          }));

          setPrices(chartData);
          setError(null);
        }
      } catch (err) {
        setError("Could not connect to API");
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 5000);
    return () => clearInterval(interval);
  }, [symbol]);

  return (
    <div
      style={{
        padding: "2rem",
        fontFamily: "sans-serif",
        backgroundColor: "#1e1e2f",
        color: "white",
        minHeight: "100vh",
      }}
    >
      <h1>🚀 Crypto Live Tracker</h1>

      {/* --- NIEUW: Selectie Knoppen --- */}
      <div style={{ marginBottom: "2rem", display: "flex", gap: "10px" }}>
        {AVAILABLE_SYMBOLS.map((s) => (
          <button
            key={s}
            onClick={() => setSymbol(s)}
            style={{
              padding: "10px 20px",
              backgroundColor: symbol === s ? "#00ff88" : "#333",
              color: symbol === s ? "#1e1e2f" : "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              fontWeight: "bold",
              transition: "0.3s",
            }}
          >
            {s.replace("USDT", "")}
          </button>
        ))}
      </div>
      <div style={{ marginBottom: '2rem', display: 'flex', gap: '10px' }}>
  {AVAILABLE_INTERVALS.map((i) => (
    <button
      key={i}
      onClick={() => setChartInterval(i)}
      style={{
        padding: '8px 16px',
        backgroundColor: chartInterval === i ? '#00ff88' : '#333',
        color: chartInterval === i ? '#1e1e2f' : 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontWeight: 'bold',
      }}
    >
      {i}
    </button>
  ))}
</div>

{/* Add below the existing line chart div */}
<CandleChart symbol={symbol} interval={chartInterval} />

      {loading && (
        <div style={{ textAlign: "center", color: "#888", padding: "1rem" }}>
          Loading...
        </div>
      )}

      {error && (
        <div
          style={{
            backgroundColor: "#ff4d4d22",
            border: "1px solid #ff4d4d",
            borderRadius: "8px",
            padding: "1rem",
            marginBottom: "1rem",
            color: "#ff4d4d",
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* --- De Grote Price Widget --- */}
      <div
        style={{
          backgroundColor: "#2a2a40",
          padding: "2rem",
          borderRadius: "12px",
          marginBottom: "1rem",
          textAlign: "center",
          borderBottom: `4px solid ${priceDirection === "up" ? "#00ff88" : priceDirection === "down" ? "#ff4d4d" : "#444"}`,
          transition: "border-color 0.5s ease",
        }}
      >
        <span
          style={{
            fontSize: "1.2rem",
            color: "#ccc",
            textTransform: "uppercase",
          }}
        >
          {symbol} Price
        </span>
        <h2
          style={{
            fontSize: "3.5rem",
            margin: "0.5rem 0",
            color:
              priceDirection === "up"
                ? "#00ff88"
                : priceDirection === "down"
                  ? "#ff4d4d"
                  : "white",
            transition: "color 0.3s ease",
          }}
        >
          $
          {lastPrice?.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </h2>
        <div style={{ fontSize: "1rem", color: "#888" }}>
          {priceDirection === "up"
            ? "▲ Stijgend"
            : priceDirection === "down"
              ? "▼ Dalend"
              : "● Stabiel"}
        </div>
      </div>

      <div
        style={{
          backgroundColor: "#2a2a40",
          padding: "1.5rem",
          borderRadius: "12px",
        }}
      >
        <h2 style={{ marginTop: 0 }}>
          Live Grafiek: <span style={{ color: "#00ff88" }}>{symbol}</span>
        </h2>

        <div style={{ width: "100%", height: 400 }}>
          <ResponsiveContainer>
            <LineChart data={prices}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="time" stroke="#ccc" />
              <YAxis
                domain={["auto", "auto"]}
                stroke="#ccc"
                tickFormatter={(tick: number) => `$${tick.toLocaleString()}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#333",
                  border: "none",
                  borderRadius: "5px",
                }}
                itemStyle={{ color: "#00ff88" }}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#00ff88"
                strokeWidth={3}
                dot={false} // Dotjes weghalen voor een strakkere lijn bij veel data
                animationDuration={300}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default App;
