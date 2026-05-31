import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Package, AlertTriangle } from 'lucide-react';

export default function WarehousePage() {
  const { data: stock, isLoading } = useQuery({
    queryKey: ['stock'],
    queryFn: () => api.get('/warehouse/stock').then(r => r.data),
    refetchInterval: 60000,
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.get('/warehouse/products').then(r => r.data),
  });

  const grouped = stock?.reduce((acc: any, item: any) => {
    const cat = item.category || 'Boshqa';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-white">Ombor</h1>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-red-500 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped || {}).map(([cat, items]: any) => (
            <div key={cat} className="card">
              <h2 className="text-sm font-semibold text-slate-300 mb-3">{cat}</h2>
              <div className="space-y-2">
                {items.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      {item.is_low && <AlertTriangle size={14} className="text-yellow-400 flex-shrink-0" />}
                      <span className={`text-sm ${item.is_low ? 'text-yellow-300' : 'text-white'}`}>{item.name}</span>
                      {item.branch_name && <span className="text-xs text-slate-500">· {item.branch_name}</span>}
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-medium ${item.is_low ? 'text-yellow-400' : 'text-white'}`}>
                        {item.quantity} {item.unit}
                      </span>
                      <span className="text-xs text-slate-500 ml-1">/ {item.min_stock}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {!stock?.length && (
            <div className="card text-center text-slate-500 py-8">
              <Package size={32} className="mx-auto mb-2 opacity-40" />
              Ma'lumot yo'q
            </div>
          )}
        </div>
      )}
    </div>
  );
}
