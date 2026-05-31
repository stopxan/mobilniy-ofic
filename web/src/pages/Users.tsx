import { useQuery } from '@tanstack/react-query';
import { api, formatDateTime } from '../lib/api';
import { Users, UserCheck, UserX } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Egasi', accountant: 'Buxgalter', manager: 'Menejer',
  courier: 'Kuryer', cashier: 'Kassir', cook: 'Oshpaz',
};

export default function UsersPage() {
  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data),
  });

  const { data: attendance } = useQuery({
    queryKey: ['attendance', 'today'],
    queryFn: () => api.get('/users/attendance', {
      params: { date_from: new Date().toISOString().split('T')[0], date_to: new Date().toISOString().split('T')[0] }
    }).then(r => r.data),
  });

  const todayCheckedIn = new Set(attendance?.filter((a: any) => !a.check_out).map((a: any) => a.user_id));

  const grouped = users?.reduce((acc: any, u: any) => {
    const branch = u.branch_name || 'Umumiy';
    if (!acc[branch]) acc[branch] = [];
    acc[branch].push(u);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Xodimlar</h1>
        <div className="text-sm text-slate-400">{users?.length || 0} ta xodim</div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-red-500 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped || {}).map(([branch, members]: any) => (
            <div key={branch} className="card">
              <h2 className="text-sm font-semibold text-slate-300 mb-3">{branch}</h2>
              <div className="space-y-2">
                {members.map((u: any) => {
                  const isOnline = todayCheckedIn.has(u.id);
                  return (
                    <div key={u.id} className="flex items-center gap-3 py-1.5">
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-white text-sm font-bold">
                          {u.full_name?.[0]}
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-800 ${isOnline ? 'bg-green-400' : 'bg-slate-500'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">{u.full_name}</div>
                        <div className="text-xs text-slate-400">{u.phone}</div>
                      </div>
                      <span className="badge-gray">{ROLE_LABELS[u.role] || u.role}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
