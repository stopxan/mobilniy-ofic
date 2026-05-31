import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CheckSquare, DollarSign, Package,
  Users, Truck, Bell, Bot, BarChart3, LogOut, Menu, X
} from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '../store/auth';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['owner', 'accountant', 'manager', 'courier'] },
  { to: '/tasks', icon: CheckSquare, label: 'Vazifalar', roles: ['owner', 'manager', 'courier'] },
  { to: '/finance', icon: DollarSign, label: 'Moliya', roles: ['owner', 'accountant', 'manager'] },
  { to: '/warehouse', icon: Package, label: 'Ombor', roles: ['owner', 'manager'] },
  { to: '/users', icon: Users, label: 'Xodimlar', roles: ['owner', 'manager'] },
  { to: '/delivery', icon: Truck, label: 'Yetkazish', roles: ['owner', 'manager', 'courier'] },
  { to: '/analytics', icon: BarChart3, label: 'Analitika', roles: ['owner', 'accountant'] },
  { to: '/reminders', icon: Bell, label: 'Eslatmalar', roles: ['owner', 'manager'] },
  { to: '/ai', icon: Bot, label: 'AI Yordamchi', roles: ['owner'] },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const visibleItems = navItems.filter(item => user && item.roles.includes(user.role));

  async function handleLogout() {
    try {
      await api.post('/auth/logout');
    } catch {}
    logout();
    navigate('/login', { replace: true });
    toast.success('Chiqildi');
  }

  const roleLabels: Record<string, string> = {
    owner: 'Egasi', accountant: 'Bosh Buxgalter',
    manager: 'Menejer', courier: 'Kuryer',
    cashier: 'Kassir', cook: 'Oshpaz',
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30 w-60 bg-slate-800 border-r border-slate-700
        flex flex-col transform transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Brand */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-700">
          <span className="text-2xl">🍕</span>
          <div>
            <div className="font-bold text-white text-sm">Pizza Chain</div>
            <div className="text-xs text-slate-400">Boshqaruv</div>
          </div>
          <button className="ml-auto lg:hidden text-slate-400" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* User info */}
        <div className="px-4 py-3 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white text-sm font-bold">
              {user?.full_name?.[0]}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-white truncate">{user?.full_name}</div>
              <div className="text-xs text-slate-400">{user?.role ? roleLabels[user.role] : ''}</div>
            </div>
          </div>
          {user?.branch_name && (
            <div className="mt-2 text-xs text-slate-500 truncate">{user.branch_name}</div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {visibleItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-red-500 text-white'
                    : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                }`
              }
            >
              <item.icon size={16} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-slate-700">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-700 hover:text-red-400 transition-colors w-full"
          >
            <LogOut size={16} />
            Chiqish
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar (mobile) */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-slate-800 border-b border-slate-700">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-400">
            <Menu size={20} />
          </button>
          <span className="text-white font-semibold">🍕 Pizza Chain</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
