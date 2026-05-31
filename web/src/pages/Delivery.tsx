import { useQuery } from '@tanstack/react-query';
import { api, formatDateTime } from '../lib/api';
import { Truck, Clock, CheckCircle, XCircle } from 'lucide-react';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  new: { label: 'Yangi', color: 'badge-blue' },
  assigned: { label: 'Tayinlangan', color: 'badge-yellow' },
  picked_up: { label: 'Olingan', color: 'badge-yellow' },
  on_way: { label: 'Yo\'lda', color: 'badge-yellow' },
  delivered: { label: 'Yetdi', color: 'badge-green' },
  cancelled: { label: 'Bekor', color: 'badge-gray' },
  returned: { label: 'Qaytdi', color: 'badge-red' },
};

export default function DeliveryPage() {
  const today = new Date().toISOString().split('T')[0];

  const { data: deliveries, isLoading } = useQuery({
    queryKey: ['deliveries', today],
    queryFn: () => api.get('/delivery', { params: { date: today } }).then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: stats } = useQuery({
    queryKey: ['courier-stats'],
    queryFn: () => api.get('/delivery/courier-stats').then(r => r.data),
  });

  const counts = deliveries?.reduce((acc: any, d: any) => { acc[d.status] = (acc[d.status] || 0) + 1; return acc; }, {});

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-white">Yetkazib berish</h1>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="stat-card">
          <span className="text-xs text-slate-400">Jami</span>
          <span className="text-lg font-bold text-white">{deliveries?.length || 0}</span>
        </div>
        <div className="stat-card">
          <span className="text-xs text-slate-400">Yetkazildi</span>
          <span className="text-lg font-bold text-green-400">{counts?.delivered || 0}</span>
        </div>
        <div className="stat-card">
          <span className="text-xs text-slate-400">Yo'lda</span>
          <span className="text-lg font-bold text-yellow-400">{(counts?.on_way || 0) + (counts?.picked_up || 0)}</span>
        </div>
      </div>

      {/* Courier stats */}
      {stats?.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold text-white mb-3">Kuryerlar statistikasi</h2>
          <div className="space-y-2">
            {stats.map((s: any) => (
              <div key={s.id} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="text-sm text-white">{s.full_name}</div>
                  <div className="text-xs text-slate-400">{s.completed} ta yetkazdi · o'rtacha {Math.round(s.avg_time)} min</div>
                </div>
                <div className="text-sm font-bold text-white">{s.total_deliveries}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deliveries list */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-red-500 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-2">
          {deliveries?.map((d: any) => {
            const s = STATUS_MAP[d.status] || { label: d.status, color: 'badge-gray' };
            return (
              <div key={d.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Truck size={14} className="text-slate-400" />
                      <span className="text-white text-sm font-medium">{d.customer_address || 'Manzil yo\'q'}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {d.courier_name && <span>{d.courier_name} · </span>}
                      {d.branch_name} · {formatDateTime(d.created_at)}
                    </div>
                    {d.actual_time && (
                      <div className="text-xs text-slate-500 mt-0.5">
                        <Clock size={11} className="inline mr-1" />{Math.round(d.actual_time)} min
                      </div>
                    )}
                  </div>
                  <span className={s.color}>{s.label}</span>
                </div>
              </div>
            );
          })}
          {!deliveries?.length && (
            <div className="card text-center text-slate-500 py-8">Bugun yetkazishlar yo'q</div>
          )}
        </div>
      )}
    </div>
  );
}
