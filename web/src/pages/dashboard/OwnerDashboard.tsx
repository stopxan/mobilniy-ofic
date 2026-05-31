import { useQuery } from '@tanstack/react-query';
import { api, formatMoney } from '../../lib/api';
import {
  TrendingUp, ShoppingCart, Receipt, Clock, Truck,
  AlertTriangle, CheckSquare, Package, Bell, RefreshCw
} from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

function StatCard({ label, value, sub, icon: Icon, color = 'text-red-400', alert = false }: any) {
  return (
    <div className={`stat-card ${alert && Number(value?.toString().replace(/\D/g, '')) > 0 ? 'border-red-500/50' : ''}`}>
      <div className="flex items-start justify-between">
        <span className="text-xs text-slate-400">{label}</span>
        <Icon size={16} className={color} />
      </div>
      <div className={`text-xl font-bold ${alert && Number(value?.toString().replace(/\D/g, '')) > 0 ? 'text-red-400' : 'text-white'} mt-1`}>
        {value}
      </div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

function BranchRow({ b }: { b: any }) {
  const revenue = Number(b.total_revenue || 0);
  return (
    <div className="flex items-center gap-4 py-2 border-b border-slate-700 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white truncate">{b.name}</div>
        <div className="text-xs text-slate-400">{b.total_orders || 0} ta buyurtma</div>
      </div>
      <div className="text-right">
        <div className="text-sm font-semibold text-green-400">{formatMoney(revenue)}</div>
        {Number(b.shortage_amount) > 0 && (
          <div className="text-xs text-red-400">-{formatMoney(Number(b.shortage_amount))}</div>
        )}
      </div>
    </div>
  );
}

export default function OwnerDashboard() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['dashboard', 'owner'],
    queryFn: () => api.get('/dashboard/owner').then(r => r.data),
    refetchInterval: 5 * 60 * 1000,
  });

  const { data: chartData } = useQuery({
    queryKey: ['analytics', 'revenue', '7d'],
    queryFn: () => api.get('/dashboard/analytics/revenue?period=7d').then(r => r.data),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-500 border-t-transparent" />
    </div>
  );

  const revenueChart = {
    labels: chartData?.map((d: any) => new Date(d.date).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit' })) ?? [],
    datasets: [{
      label: 'Daromad',
      data: chartData?.map((d: any) => Number(d.revenue)) ?? [],
      borderColor: '#E63946',
      backgroundColor: 'rgba(230,57,70,0.1)',
      fill: true,
      tension: 0.4,
    }],
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Asosiy Panel</h1>
          <p className="text-sm text-slate-400">{new Date().toLocaleDateString('uz-UZ', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <button onClick={() => refetch()} disabled={isFetching} className="btn-ghost flex items-center gap-2 text-sm">
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          Yangilash
        </button>
      </div>

      {/* KPI stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Bugungi daromad" value={formatMoney(data?.today_revenue ?? 0)} icon={TrendingUp} color="text-green-400" />
        <StatCard label="Haftalik daromad" value={formatMoney(data?.week_revenue ?? 0)} icon={TrendingUp} color="text-blue-400" />
        <StatCard label="Oylik daromad" value={formatMoney(data?.month_revenue ?? 0)} icon={TrendingUp} color="text-purple-400" />
        <StatCard label="Buyurtmalar" value={data?.total_orders ?? 0} sub="bugun" icon={ShoppingCart} color="text-yellow-400" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="O'rtacha chek" value={formatMoney(data?.avg_check ?? 0)} icon={Receipt} color="text-slate-400" />
        <StatCard label="Tayyorlash vaqti" value={`${data?.avg_cooking_time ?? 0} min`} icon={Clock} color="text-orange-400" />
        <StatCard label="Yetkazish vaqti" value={`${data?.avg_delivery_time ?? 0} min`} icon={Truck} color="text-blue-400" />
        <StatCard label="Kamomad" value={formatMoney(data?.shortage_total ?? 0)} icon={AlertTriangle} color="text-red-400" alert />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard label="Kechikkan vazifalar" value={data?.overdue_tasks ?? 0} icon={CheckSquare} color="text-red-400" alert />
        <StatCard label="Oz qolgan mahsulotlar" value={data?.low_stock_items?.length ?? 0} sub="ta mahsulot" icon={Package} color="text-yellow-400" alert />
        <StatCard label="Kechikkan to'lovlar" value={data?.overdue_aggregators ?? 0} sub="agregator" icon={Bell} color="text-red-400" alert />
      </div>

      {/* Charts + Branches */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Revenue chart */}
        <div className="card lg:col-span-3">
          <h2 className="text-sm font-semibold text-white mb-4">7 kunlik daromad</h2>
          <div className="h-48">
            <Line data={revenueChart} options={{
              responsive: true, maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                x: { grid: { color: '#334155' }, ticks: { color: '#94a3b8', font: { size: 11 } } },
                y: { grid: { color: '#334155' }, ticks: { color: '#94a3b8', font: { size: 11 }, callback: (v: any) => (v / 1000000).toFixed(1) + 'M' } },
              },
            }} />
          </div>
        </div>

        {/* Branches */}
        <div className="card lg:col-span-2">
          <h2 className="text-sm font-semibold text-white mb-3">Filiallar bugun</h2>
          <div className="space-y-0">
            {data?.branches?.map((b: any) => <BranchRow key={b.id} b={b} />) ?? (
              <div className="text-sm text-slate-500">Ma'lumot yo'q</div>
            )}
          </div>
        </div>
      </div>

      {/* Low stock & Notifications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Low stock */}
        {data?.low_stock_items?.length > 0 && (
          <div className="card">
            <h2 className="text-sm font-semibold text-yellow-400 mb-3 flex items-center gap-2">
              <Package size={14} /> Oz qolgan mahsulotlar
            </h2>
            <div className="space-y-2">
              {data.low_stock_items.map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="text-white">{item.name}</span>
                    <span className="text-slate-500 ml-2 text-xs">{item.branch_name}</span>
                  </div>
                  <span className="text-red-400 font-medium">{item.quantity} / {item.min_stock}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notifications */}
        {data?.notifications?.length > 0 && (
          <div className="card">
            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Bell size={14} /> So'nggi bildirishnomalar
            </h2>
            <div className="space-y-2">
              {data.notifications.slice(0, 5).map((n: any) => (
                <div key={n.id} className="text-sm border-l-2 border-red-500 pl-2">
                  <div className="text-white font-medium">{n.title}</div>
                  {n.body && <div className="text-slate-400 text-xs">{n.body}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
