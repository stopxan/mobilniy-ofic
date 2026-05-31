import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, formatDateTime } from '../lib/api';
import { Plus, Filter, CheckCircle, Clock, AlertTriangle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/auth';

const STATUS_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  new: { label: 'Yangi', color: 'badge-blue', icon: Clock },
  in_progress: { label: 'Bajarilmoqda', color: 'badge-yellow', icon: Clock },
  done: { label: 'Bajarildi', color: 'badge-green', icon: CheckCircle },
  overdue: { label: 'Kechikdi', color: 'badge-red', icon: AlertTriangle },
  cancelled: { label: 'Bekor', color: 'badge-gray', icon: XCircle },
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'border-l-4 border-red-500',
  high: 'border-l-4 border-orange-500',
  normal: '',
  low: 'opacity-80',
};

export default function TasksPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [form, setForm] = useState({ title: '', description: '', priority: 'normal', due_date: '', requires_photo: false });

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', filterStatus],
    queryFn: () => api.get('/tasks', { params: { status: filterStatus || undefined, limit: 50 } }).then(r => r.data),
    refetchInterval: 30000,
  });

  const createMutation = useMutation({
    mutationFn: (body: any) => api.post('/tasks', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); setShowCreate(false); toast.success('Vazifa yaratildi'); },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Xatolik'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: any) => api.patch(`/tasks/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
    onError: (err: any) => toast.error(err.response?.data?.error || 'Xatolik'),
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Vazifalar</h1>
        {(user?.role === 'owner' || user?.role === 'manager') && (
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={16} /> Yangi vazifa
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[{ v: '', l: 'Barchasi' }, { v: 'new', l: 'Yangi' }, { v: 'in_progress', l: 'Bajarilmoqda' },
          { v: 'overdue', l: 'Kechikdi' }, { v: 'done', l: 'Bajarildi' }].map(f => (
          <button key={f.v}
            onClick={() => setFilterStatus(f.v)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filterStatus === f.v ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}>
            {f.l}
          </button>
        ))}
      </div>

      {/* Task list */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-red-500 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-2">
          {data?.data?.length === 0 && (
            <div className="card text-center text-slate-500 py-8">Vazifalar yo'q</div>
          )}
          {data?.data?.map((task: any) => {
            const s = STATUS_LABELS[task.status] || STATUS_LABELS.new;
            const SIcon = s.icon;
            return (
              <div key={task.id} className={`card ${PRIORITY_COLORS[task.priority]}`}>
                <div className="flex items-start gap-3">
                  <SIcon size={16} className={task.status === 'overdue' ? 'text-red-400' : task.status === 'done' ? 'text-green-400' : 'text-yellow-400'} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-medium text-sm">{task.title}</span>
                      <span className={s.color}>{s.label}</span>
                      {task.priority === 'urgent' && <span className="badge-red">Shoshilinch</span>}
                    </div>
                    {task.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{task.description}</p>}
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      {task.assigned_name && <span>→ {task.assigned_name}</span>}
                      {task.branch_name && <span>📍 {task.branch_name}</span>}
                      {task.due_date && <span>⏰ {formatDateTime(task.due_date)}</span>}
                      {task.photo_count > 0 && <span>📷 {task.photo_count}</span>}
                    </div>
                  </div>
                  {/* Quick actions */}
                  {task.status === 'new' && user?.id === task.assigned_to && (
                    <button
                      onClick={() => statusMutation.mutate({ id: task.id, status: 'in_progress' })}
                      className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded hover:bg-blue-500/40"
                    >Boshlash</button>
                  )}
                  {task.status === 'in_progress' && (
                    <button
                      onClick={() => statusMutation.mutate({ id: task.id, status: 'done' })}
                      className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded hover:bg-green-500/40"
                    >Bajarildi</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md">
            <h2 className="text-lg font-bold text-white mb-4">Yangi vazifa</h2>
            <div className="space-y-3">
              <input className="input" placeholder="Sarlavha *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              <textarea className="input min-h-20 resize-none" placeholder="Tavsif" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              <select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="low">Past</option>
                <option value="normal">Oddiy</option>
                <option value="high">Yuqori</option>
                <option value="urgent">Shoshilinch</option>
              </select>
              <input className="input" type="datetime-local" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <input type="checkbox" checked={form.requires_photo} onChange={e => setForm(f => ({ ...f, requires_photo: e.target.checked }))} className="rounded" />
                Fotootyot talab qilinadi
              </label>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowCreate(false)} className="btn-ghost flex-1">Bekor</button>
              <button
                onClick={() => createMutation.mutate(form)}
                className="btn-primary flex-1"
                disabled={!form.title || createMutation.isPending}
              >
                {createMutation.isPending ? 'Yaratilmoqda...' : 'Yaratish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
