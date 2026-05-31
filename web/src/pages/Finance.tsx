import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, formatMoney, formatDate } from '../lib/api';
import { Plus, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';

const EXPENSE_CATEGORIES = [
  { value: 'salary', label: 'Maosh' },
  { value: 'ingredients', label: 'Ingredientlar' },
  { value: 'packaging', label: 'Qadoqlash' },
  { value: 'utilities', label: 'Kommunal' },
  { value: 'rent', label: 'Ijara' },
  { value: 'maintenance', label: 'Ta\'mirlash' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'delivery', label: 'Yetkazish' },
  { value: 'other', label: 'Boshqa' },
];

export default function FinancePage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'revenues' | 'expenses' | 'report'>('revenues');
  const [showAddRevenue, setShowAddRevenue] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [dateFrom, setDateFrom] = useState(new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [revenueForm, setRevenueForm] = useState({ amount: '', source: 'cash', notes: '' });
  const [expenseForm, setExpenseForm] = useState({ category: 'ingredients', amount: '', description: '' });

  const { data: revenues } = useQuery({
    queryKey: ['revenues', dateFrom, dateTo],
    queryFn: () => api.get('/finance/revenues', { params: { date_from: dateFrom, date_to: dateTo } }).then(r => r.data),
    enabled: tab === 'revenues',
  });

  const { data: expenses } = useQuery({
    queryKey: ['expenses', dateFrom, dateTo],
    queryFn: () => api.get('/finance/expenses', { params: { date_from: dateFrom, date_to: dateTo } }).then(r => r.data),
    enabled: tab === 'expenses',
  });

  const { data: report } = useQuery({
    queryKey: ['finance-report'],
    queryFn: () => api.get('/finance/report').then(r => r.data),
    enabled: tab === 'report',
  });

  const addRevenue = useMutation({
    mutationFn: (d: any) => api.post('/finance/revenues', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['revenues'] }); setShowAddRevenue(false); toast.success('Qo\'shildi'); },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Xatolik'),
  });

  const addExpense = useMutation({
    mutationFn: (d: any) => api.post('/finance/expenses', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); setShowAddExpense(false); toast.success('Qo\'shildi'); },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Xatolik'),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold text-white">Moliya</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowAddRevenue(true)} className="btn-primary text-sm flex items-center gap-1">
            <TrendingUp size={14} /> Daromad
          </button>
          <button onClick={() => setShowAddExpense(true)} className="btn-ghost text-sm flex items-center gap-1">
            <TrendingDown size={14} /> Xarajat
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800 p-1 rounded-lg w-fit">
        {[{ v: 'revenues', l: 'Daromadlar' }, { v: 'expenses', l: 'Xarajatlar' }, { v: 'report', l: 'Hisobot' }].map(t => (
          <button key={t.v} onClick={() => setTab(t.v as any)}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${tab === t.v ? 'bg-red-500 text-white' : 'text-slate-400 hover:text-white'}`}>
            {t.l}
          </button>
        ))}
      </div>

      {/* Date filter */}
      {tab !== 'report' && (
        <div className="flex gap-2 items-center flex-wrap">
          <input type="date" className="input w-auto" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <span className="text-slate-500">—</span>
          <input type="date" className="input w-auto" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
      )}

      {/* Revenues */}
      {tab === 'revenues' && (
        <div className="space-y-3">
          <div className="card flex items-center justify-between">
            <span className="text-slate-400 text-sm">Jami</span>
            <span className="text-green-400 font-bold text-lg">{formatMoney(Number(revenues?.total || 0))}</span>
          </div>
          {revenues?.data?.map((r: any) => (
            <div key={r.id} className="card flex items-center justify-between">
              <div>
                <div className="text-white text-sm font-medium">{formatMoney(Number(r.amount))}</div>
                <div className="text-xs text-slate-400">{r.source} · {r.branch_name} · {formatDate(r.date)}</div>
                {r.notes && <div className="text-xs text-slate-500">{r.notes}</div>}
              </div>
              <span className="badge-green">{r.source}</span>
            </div>
          ))}
        </div>
      )}

      {/* Expenses */}
      {tab === 'expenses' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            {expenses?.by_category?.map((c: any) => (
              <div key={c.category} className="card py-2 px-3">
                <div className="text-xs text-slate-400">{EXPENSE_CATEGORIES.find(x => x.value === c.category)?.label}</div>
                <div className="text-red-400 font-semibold text-sm">{formatMoney(Number(c.total))}</div>
              </div>
            ))}
          </div>
          {expenses?.data?.map((e: any) => (
            <div key={e.id} className="card flex items-center justify-between">
              <div>
                <div className="text-white text-sm font-medium">{e.description}</div>
                <div className="text-xs text-slate-400">{EXPENSE_CATEGORIES.find(x => x.value === e.category)?.label} · {e.branch_name} · {formatDate(e.date)}</div>
              </div>
              <span className="text-red-400 font-semibold">-{formatMoney(Number(e.amount))}</span>
            </div>
          ))}
        </div>
      )}

      {/* Report */}
      {tab === 'report' && (
        <div className="space-y-3">
          <div className="text-sm text-slate-400">{report?.year}-yil {report?.month}-oy</div>
          {report?.branches?.map((b: any) => (
            <div key={b.id} className="card">
              <div className="font-semibold text-white mb-2">{b.branch_name}</div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div><div className="text-slate-400 text-xs">Daromad</div><div className="text-green-400 font-medium">{formatMoney(Number(b.total_revenue))}</div></div>
                <div><div className="text-slate-400 text-xs">Xarajat</div><div className="text-red-400 font-medium">{formatMoney(Number(b.total_expenses))}</div></div>
                <div><div className="text-slate-400 text-xs">Foyda</div><div className={`font-bold ${Number(b.profit) >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatMoney(Number(b.profit))}</div></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Revenue Modal */}
      {showAddRevenue && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-sm">
            <h2 className="text-lg font-bold text-white mb-4">Daromad qo'shish</h2>
            <div className="space-y-3">
              <input className="input" type="number" placeholder="Summa (so'm) *" value={revenueForm.amount} onChange={e => setRevenueForm(f => ({ ...f, amount: e.target.value }))} />
              <select className="input" value={revenueForm.source} onChange={e => setRevenueForm(f => ({ ...f, source: e.target.value }))}>
                <option value="cash">Naqd</option>
                <option value="card">Karta</option>
                <option value="aggregator">Agregator</option>
              </select>
              <input className="input" placeholder="Izoh" value={revenueForm.notes} onChange={e => setRevenueForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowAddRevenue(false)} className="btn-ghost flex-1">Bekor</button>
              <button onClick={() => addRevenue.mutate(revenueForm)} className="btn-primary flex-1" disabled={!revenueForm.amount || addRevenue.isPending}>
                {addRevenue.isPending ? '...' : 'Qo\'shish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showAddExpense && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-sm">
            <h2 className="text-lg font-bold text-white mb-4">Xarajat qo'shish</h2>
            <div className="space-y-3">
              <select className="input" value={expenseForm.category} onChange={e => setExpenseForm(f => ({ ...f, category: e.target.value }))}>
                {EXPENSE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <input className="input" type="number" placeholder="Summa (so'm) *" value={expenseForm.amount} onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))} />
              <input className="input" placeholder="Tavsif *" value={expenseForm.description} onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowAddExpense(false)} className="btn-ghost flex-1">Bekor</button>
              <button onClick={() => addExpense.mutate(expenseForm)} className="btn-primary flex-1" disabled={!expenseForm.amount || !expenseForm.description || addExpense.isPending}>
                {addExpense.isPending ? '...' : 'Qo\'shish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
