import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, formatMoney } from '../lib/api';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  const { data: chartData } = useQuery({
    queryKey: ['analytics', 'revenue', period],
    queryFn: () => api.get(`/dashboard/analytics/revenue?period=${period}`).then(r => r.data),
  });

  const barData = {
    labels: chartData?.map((d: any) => new Date(d.date).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit' })) ?? [],
    datasets: [{
      label: 'Daromad',
      data: chartData?.map((d: any) => Number(d.revenue)) ?? [],
      backgroundColor: 'rgba(230,57,70,0.7)',
      borderColor: '#E63946',
      borderWidth: 1,
      borderRadius: 4,
    }],
  };

  const totalRevenue = chartData?.reduce((s: number, d: any) => s + Number(d.revenue), 0) ?? 0;
  const totalOrders = chartData?.reduce((s: number, d: any) => s + Number(d.transactions), 0) ?? 0;
  const avgDaily = chartData?.length ? totalRevenue / chartData.length : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold text-white">Analitika</h1>
        <div className="flex gap-1 bg-slate-800 p-1 rounded-lg">
          {[{ v: '7d', l: '7 kun' }, { v: '30d', l: '30 kun' }, { v: '90d', l: '90 kun' }].map(p => (
            <button key={p.v} onClick={() => setPeriod(p.v as any)}
              className={`px-3 py-1 rounded-md text-xs transition-colors ${period === p.v ? 'bg-red-500 text-white' : 'text-slate-400 hover:text-white'}`}>
              {p.l}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="stat-card">
          <span className="text-xs text-slate-400">Jami daromad</span>
          <span className="text-base font-bold text-green-400">{formatMoney(totalRevenue)}</span>
        </div>
        <div className="stat-card">
          <span className="text-xs text-slate-400">Jami buyurtma</span>
          <span className="text-base font-bold text-white">{totalOrders}</span>
        </div>
        <div className="stat-card">
          <span className="text-xs text-slate-400">Kunlik o'rtacha</span>
          <span className="text-base font-bold text-blue-400">{formatMoney(avgDaily)}</span>
        </div>
      </div>

      <div className="card">
        <h2 className="text-sm font-semibold text-white mb-4">Daromad grafigi</h2>
        <div className="h-64">
          <Bar data={barData} options={{
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { color: '#334155' }, ticks: { color: '#94a3b8', font: { size: 10 } } },
              y: {
                grid: { color: '#334155' },
                ticks: {
                  color: '#94a3b8',
                  font: { size: 10 },
                  callback: (v: any) => (v / 1000000).toFixed(1) + 'M',
                }
              },
            },
          }} />
        </div>
      </div>
    </div>
  );
}
