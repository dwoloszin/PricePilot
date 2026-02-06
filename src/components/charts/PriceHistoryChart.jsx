
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

export default function PriceHistoryChart({ priceEntries }) {
  if (!priceEntries || priceEntries.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center bg-slate-50 rounded-2xl">
        <p className="text-slate-400 text-sm">No price history available</p>
      </div>
    );
  }

  const sortedEntries = [...priceEntries]
    .sort((a, b) => new Date(a.date_recorded || a.created_date) - new Date(b.date_recorded || b.created_date));

  const chartData = sortedEntries.map(entry => ({
    date: format(new Date(entry.date_recorded || entry.created_date), 'MMM d'),
    price: entry.price,
    store: entry.store_name
  }));

  const prices = sortedEntries.map(e => e.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  
  const firstPrice = prices[0];
  const lastPrice = prices[prices.length - 1];
  const priceChange = ((lastPrice - firstPrice) / firstPrice) * 100;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-xl border border-slate-100">
          <p className="text-xs text-slate-500">{label}</p>
          <p className="font-bold text-lg text-slate-800">${payload[0].value.toFixed(2)}</p>
          <p className="text-xs text-slate-400">{payload[0].payload.store}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-50 rounded-xl p-3 text-center">
          <p className="text-xs text-emerald-600 font-medium">Lowest</p>
          <p className="text-lg font-bold text-emerald-700">${minPrice.toFixed(2)}</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 text-center">
          <p className="text-xs text-slate-500 font-medium">Average</p>
          <p className="text-lg font-bold text-slate-700">${avgPrice.toFixed(2)}</p>
        </div>
        <div className="bg-rose-50 rounded-xl p-3 text-center">
          <p className="text-xs text-rose-600 font-medium">Highest</p>
          <p className="text-lg font-bold text-rose-700">${maxPrice.toFixed(2)}</p>
        </div>
      </div>

      {/* Trend Indicator */}
      {sortedEntries.length > 1 && (
        <div className={`flex items-center justify-center gap-2 py-2 rounded-xl ${
          priceChange < 0 ? 'bg-emerald-50 text-emerald-700' : 
          priceChange > 0 ? 'bg-rose-50 text-rose-700' : 
          'bg-slate-50 text-slate-600'
        }`}>
          {priceChange < 0 ? <TrendingDown className="w-4 h-4" /> : 
           priceChange > 0 ? <TrendingUp className="w-4 h-4" /> : 
           <Minus className="w-4 h-4" />}
          <span className="text-sm font-medium">
            {priceChange > 0 ? '+' : ''}{priceChange.toFixed(1)}% since first record
          </span>
        </div>
      )}

      {/* Chart */}
      <div className="h-48 bg-white rounded-2xl p-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `$${v}`}
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey="price" 
              stroke="#10b981" 
              strokeWidth={3}
              dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: '#10b981' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}