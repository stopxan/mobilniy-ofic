import { useQuery } from '@tanstack/react-query';
import { api, formatMoney } from '../../lib/api';
import { useAuthStore } from '../../store/auth';
import { TrendingUp, Users, CheckSquare, Package, Clock } from 'lucide-react';

export default function BranchDashboard() {
  const { user } = useAuthStore();
  const branchId = user?.branch_id;

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'branch', branchId],
    queryFn: () => api.get(`/dashboard/branch/${branchId}`).then(r => r.data),
    enabled: !!branchId,
    refetchInterval: 60000,
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-500 border-t-transparent" />
    </div>
  );

  const kpi = data?.kpi;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">{user?.branch_name}</h1>
        <p className="text-sm text-slate-400">
          {data?.active_shift ? '🟢 Smena ochiq' : '🔴 Smena yopiq'} ·{' '}
          {new Date().toLocaleDateString('uz-UZ')}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="stat-card">
          <span className="text-xs text-slate-400">Bugungi daromad</span>
          <span className="text-lg font-bold text-green-400 mt-1">{formatMoney(Number(kpi?.total_revenue || 0))}</span>
        </div>
        <div className="stat-card">
          <span className="text-xs text-slate-400">Buyurtmalar</span>
          <span className="text-lg font-bold text-white mt-1">{kpi?.total_orders || 0}</span>
        </div>
        <div className="stat-card">
          <span className="text-xs text-slate-400">O'rtacha chek</span>
          <span className="text-lg font-bold text-white mt-1">{formatMoney(Number(kpi?.avg_check || 0))}</span>
        </div>
        <div className="stat-card">
          <span className="text-xs text-slate-400">Yetkazish vaqti</span>
          <span className="text-lg font-bold text-white mt-1">{Math.round(Number(kpi?.avg_delivery_time || 0) / 60)} min</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Staff online */}
        <div className="card">
          <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Users size={14} className="text-blue-400" /> Bugun ishlaydi
          </h2>
          <div className="space-y-2">
            {data?.staff_online?.length ? data.staff_online.map((s: any) => (
              <div key={s.id} className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-white">{s.full_name}</span>
                <span className="text-slate-500 text-xs ml-auto">{s.role}</span>
              </div>
            )) : <div className="text-sm text-slate-500">Hech kim yo'q</div>}
          </div>
        </div>

        {/* Pending tasks */}
        <div className="card">
          <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <CheckSquare size={14} className="text-yellow-400" /> Vazifalar
          </h2>
          <div className="space-y-2">
            {data?.pending_tasks?.length ? data.pending_tasks.slice(0, 5).map((t: any) => (
              <div key={t.id} className="text-sm">
                <div className={`font-medium ${t.status === 'overdue' ? 'text-red-400' : 'text-white'}`}>{t.title}</div>
                {t.due_date && <div className="text-xs text-slate-500">{new Date(t.due_date).toLocaleDateString('uz-UZ')}</div>}
              </div>
            )) : <div className="text-sm text-slate-500">Barcha bajarilgan</div>}
          </div>
        </div>

        {/* Low stock */}
        <div className="card">
          <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Package size={14} className="text-red-400" /> Oz qolganlar
          </h2>
          <div className="space-y-2">
            {data?.low_stock?.length ? data.low_stock.map((s: any) => (
              <div key={s.product_id} className="flex items-center justify-between text-sm">
                <span className="text-white">{s.name}</span>
                <span className="text-red-400">{s.quantity} {s.unit}</span>
              </div>
            )) : <div className="text-sm text-slate-500">Hammasi yetarli</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
