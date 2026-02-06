import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { MapPin, Star } from 'lucide-react';

const colors = ['#10b981', '#14b8a6', '#22c55e', '#84cc16', '#06b6d4', '#0ea5e9'];

export default function StoreComparisonChart({ priceEntries, productName }) {
  if (!priceEntries || priceEntries.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center bg-slate-50 rounded-2xl">
        <p className="text-slate-400 text-sm">No store data available</p>
      </div>
    );
  }

  // Group by store and get latest/lowest price
  const storeData = {};
  priceEntries.forEach(entry => {
    const store = entry.store_name;
    if (!storeData[store] || entry.price < storeData[store].price) {
      storeData[store] = {
        store,
        price: entry.price,
        date: entry.date_recorded || entry.created_date,
        address: entry.store_address
      };
    }
  });

  const chartData = Object.values(storeData)
    .sort((a, b) => a.price - b.price);

  const lowestPrice = chartData[0]?.price || 0;

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const savings = ((data.price - lowestPrice) / lowestPrice * 100);
      return (
        <div className="bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-xl border border-slate-100">
          <p className="font-semibold text-slate-800">{data.store}</p>
          <p className="text-2xl font-bold text-emerald-600">${data.price.toFixed(2)}</p>
          {savings > 0 && (
            <p className="text-xs text-rose-500">+{savings.toFixed(0)}% vs lowest</p>
          )}
          {data.address && (
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {data.address}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Best Deal Badge */}
      {chartData.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <Star className="w-4 h-4 fill-yellow-300 text-yellow-300" />
            <span className="text-xs font-medium uppercase tracking-wider opacity-90">Best Price</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-lg">{chartData[0].store}</p>
              {chartData[0].address && (
                <p className="text-xs opacity-75">{chartData[0].address}</p>
              )}
            </div>
            <p className="text-3xl font-bold">${chartData[0].price.toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="h-48 bg-white rounded-2xl p-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical">
            <XAxis 
              type="number" 
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickFormatter={(v) => `$${v}`}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              type="category" 
              dataKey="store" 
              tick={{ fontSize: 11, fill: '#64748b' }}
              width={100}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
            <Bar dataKey="price" radius={[0, 8, 8, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Price Savings Summary */}
      {chartData.length > 1 && (
        <div className="bg-slate-50 rounded-xl p-4">
          <p className="text-sm text-slate-600">
            Potential savings: <span className="font-bold text-emerald-600">
              ${(chartData[chartData.length - 1].price - chartData[0].price).toFixed(2)}
            </span> per unit by shopping at {chartData[0].store}
          </p>
        </div>
      )}
    </div>
  );
}