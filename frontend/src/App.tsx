import { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './App.css';

// 1. Dit is de exacte structuur die jouw Java API terugstuurt
interface CryptoPrice {
  id: number;
  symbol: string;
  price: number;
  timestamp: string;
}

// 2. Dit is wat de Recharts grafiek nodig heeft om te kunnen tekenen
interface ChartData {
  time: string;
  price: number;
}

const AVAILABLE_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'];



function App() {
  const [prices, setPrices] = useState<ChartData[]>([]);
  const [symbol, setSymbol] = useState<string>('BTCUSDT');
  const [lastPrice, setLastPrice] = useState<number | null>(null);
const [priceDirection, setPriceDirection] = useState<'up' | 'down' | 'flat'>('flat');

  useEffect(() => {
    const fetchPrices = async () => {
  try {
    const response = await axios.get<CryptoPrice[]>(`http://localhost:8080/api/prices/${symbol}`);
    const data = response.data;

    if (data.length > 0) {
      const currentPrice = data[0].price; // De allernieuwste prijs

      // Bepaal de kleur/richting
      if (lastPrice !== null) {
        if (currentPrice > lastPrice) setPriceDirection('up');
        else if (currentPrice < lastPrice) setPriceDirection('down');
      }
      
      setLastPrice(currentPrice);

      const chartData: ChartData[] = data.reverse().map((item) => ({
        time: new Date(item.timestamp).toLocaleTimeString('nl-NL'),
        price: item.price
      }));
      setPrices(chartData);
    }
  } catch (error) {
    console.error("API Error:", error);
  }
};

    // Haal direct de eerste lading data op
    fetchPrices();

    // POLING: Vraag elke 5 seconden om nieuwe data (matcht perfect met je Java cooldown!)
    const interval = setInterval(fetchPrices, 5000);
    return () => clearInterval(interval);

  }, [symbol]); // Als 'symbol' verandert, begint hij opnieuw met ophalen

return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', backgroundColor: '#1e1e2f', color: 'white', minHeight: '100vh' }}>
      <h1>🚀 Crypto Live Tracker</h1>
      
      {/* --- NIEUW: Selectie Knoppen --- */}
      <div style={{ marginBottom: '2rem', display: 'flex', gap: '10px' }}>
        {AVAILABLE_SYMBOLS.map((s) => (
          <button
            key={s}
            onClick={() => setSymbol(s)}
            style={{
              padding: '10px 20px',
              backgroundColor: symbol === s ? '#00ff88' : '#333',
              color: symbol === s ? '#1e1e2f' : 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: 'bold',
              transition: '0.3s'
            }}
          >
            {s.replace('USDT', '')}
          </button>
        ))}
      </div>

      {/* --- De Grote Price Widget --- */}
<div style={{
  backgroundColor: '#2a2a40',
  padding: '2rem',
  borderRadius: '12px',
  marginBottom: '1rem',
  textAlign: 'center',
  borderBottom: `4px solid ${priceDirection === 'up' ? '#00ff88' : priceDirection === 'down' ? '#ff4d4d' : '#444'}`,
  transition: 'border-color 0.5s ease'
}}>
  <span style={{ fontSize: '1.2rem', color: '#ccc', textTransform: 'uppercase' }}>{symbol} Price</span>
  <h2 style={{ 
    fontSize: '3.5rem', 
    margin: '0.5rem 0', 
    color: priceDirection === 'up' ? '#00ff88' : priceDirection === 'down' ? '#ff4d4d' : 'white',
    transition: 'color 0.3s ease'
  }}>
    ${lastPrice?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
  </h2>
  <div style={{ fontSize: '1rem', color: '#888' }}>
    {priceDirection === 'up' ? '▲ Stijgend' : priceDirection === 'down' ? '▼ Dalend' : '● Stabiel'}
  </div>
</div>

      <div style={{ backgroundColor: '#2a2a40', padding: '1.5rem', borderRadius: '12px' }}>
        <h2 style={{ marginTop: 0 }}>
          Live Grafiek: <span style={{ color: '#00ff88' }}>{symbol}</span>
        </h2>
        
        <div style={{ width: '100%', height: 400 }}>
          <ResponsiveContainer>
            <LineChart data={prices}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="time" stroke="#ccc" />
              <YAxis 
                domain={['auto', 'auto']} 
                stroke="#ccc" 
                tickFormatter={(tick: number) => `$${tick.toLocaleString()}`} 
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#333', border: 'none', borderRadius: '5px' }}
                itemStyle={{ color: '#00ff88' }}
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