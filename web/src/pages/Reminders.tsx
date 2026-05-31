import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, formatDateTime } from '../lib/api';
import { Plus, Bell, Check, Calendar, Phone, User } from 'lucide-react';
import toast from 'react-hot-toast';

const TYPE_ICONS: Record<string, any> = {
  meeting: Calendar, call: Phone, personal: User, task: Bell, payment: Bell,
};

const TYPE_LABELS: Record<string, string> = {
  meeting: 'Uchrashuv', call: 'Qo\'ng\'iroq', personal: 'Shaxsiy', task: 'Vazifa', payment: 'To\'lov',
};

export default function RemindersPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', type: 'personal', remind_at: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['reminders'],
    queryFn: () => api.get('/reminders').then(r => r.data),
    refetchInterval: 60000,
  });

  const createMutation = useMutation({
    mutationFn: (d: any) => api.post('/reminders', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reminders'] }); setShowCreate(false); toast.success('Eslatma qo\'shildi'); },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Xatolik'),
  });

  const dismissMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/reminders/${id}/dismiss`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reminders'] }),
  });

  const now = new Date();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Eslatmalar</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-sm flex items-center gap-1">
          <Plus size={14} /> Qo'shish
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-red-500 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-2">
          {data?.map((r: any) => {
            const Icon = TYPE_ICONS[r.type] || Bell;
            const isPast = new Date(r.remind_at) < now;
            return (
              <div key={r.id} className={`card flex items-start gap-3 ${isPast && !r.is_sent ? 'border-red-500/50' : ''}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isPast ? 'bg-red-500/20' : 'bg-blue-500/20'}`}>
                  <Icon size={14} className={isPast ? 'text-red-400' : 'text-blue-400'} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white">{r.title}</div>
                  {r.description && <div className="text-xs text-slate-400">{r.description}</div>}
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                    <span>{TYPE_LABELS[r.type]}</span>
                    <span>·</span>
                    <span className={isPast ? 'text-red-400' : ''}>{formatDateTime(r.remind_at)}</span>
                  </div>
                </div>
                <button
                  onClick={() => dismissMutation.mutate(r.id)}
                  className="text-slate-500 hover:text-green-400 transition-colors"
                >
                  <Check size={16} />
                </button>
              </div>
            );
          })}
          {data?.length === 0 && (
            <div className="card text-center text-slate-500 py-8">
              <Bell size={32} className="mx-auto mb-2 opacity-40" />
              Eslatmalar yo'q
            </div>
          )}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-sm">
            <h2 className="text-lg font-bold text-white mb-4">Yangi eslatma</h2>
            <div className="space-y-3">
              <input className="input" placeholder="Sarlavha *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              <textarea className="input resize-none" placeholder="Tavsif" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <input className="input" type="datetime-local" value={form.remind_at} onChange={e => setForm(f => ({ ...f, remind_at: e.target.value }))} />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowCreate(false)} className="btn-ghost flex-1">Bekor</button>
              <button
                onClick={() => createMutation.mutate(form)}
                className="btn-primary flex-1"
                disabled={!form.title || !form.remind_at || createMutation.isPending}
              >
                {createMutation.isPending ? '...' : 'Qo\'shish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
