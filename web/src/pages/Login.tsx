import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { phone, password });
      setAuth(data.user, data.access_token, data.refresh_token);
      navigate('/', { replace: true });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-red-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🍕</div>
          <h1 className="text-2xl font-bold text-white">Pizza Chain</h1>
          <p className="text-slate-400 text-sm mt-1">Boshqaruv tizimi</p>
        </div>

        {/* Form */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-6">Tizimga kirish</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Telefon raqam</label>
              <input
                type="tel"
                className="input"
                placeholder="+998901234567"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Parol</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
              {loading ? 'Kirish...' : 'Kirish'}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6 pt-4 border-t border-slate-700">
            <p className="text-xs text-slate-500 mb-2">Demo kirish:</p>
            <div className="space-y-1">
              {[
                { label: 'Egasi', phone: '+998901000001' },
                { label: 'Buxgalter', phone: '+998901000002' },
                { label: 'Menejer', phone: '+998901000003' },
              ].map(acc => (
                <button
                  key={acc.phone}
                  type="button"
                  className="text-xs text-slate-400 hover:text-red-400 block w-full text-left"
                  onClick={() => { setPhone(acc.phone); setPassword('password123'); }}
                >
                  {acc.label}: {acc.phone}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
