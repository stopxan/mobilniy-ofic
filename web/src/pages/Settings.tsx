import { useState } from 'react';
import { useSettingsStore } from '../store/settings';
import { Key, Bell, RefreshCw, Bot, Send, Zap, Eye, EyeOff, Save, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

function SecretInput({ label, value, onChange, placeholder, hint }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; hint?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block text-sm text-slate-400 mb-1">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          className="input pr-10"
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

export default function SettingsPage() {
  const store = useSettingsStore();
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    await store.saveToBackend();
    setSaved(true);
    toast.success('Sozlamalar saqlandi');
    setTimeout(() => setSaved(false), 3000);
  }

  const installPromptAvailable = 'BeforeInstallPromptEvent' in window ||
    (navigator as any).standalone === false;

  async function handleInstallPWA() {
    const evt = (window as any).__pwaInstallEvent;
    if (evt) {
      evt.prompt();
      const { outcome } = await evt.userChoice;
      if (outcome === 'accepted') toast.success('Ilova o\'rnatildi!');
    } else {
      toast.custom(() => (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm text-white max-w-sm">
          <p className="font-semibold mb-2">📱 Ilovani o'rnatish:</p>
          <p><b>Android (Chrome):</b> Menyu → "Bosh ekranga qo'shish"</p>
          <p><b>iPhone (Safari):</b> Ulashish → "Bosh ekranga qo'shish"</p>
        </div>
      ), { duration: 8000 });
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-bold text-white">Sozlamalar</h1>

      {/* AI API Keys */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Bot size={16} className="text-purple-400" />
          <h2 className="text-sm font-semibold text-white">Sun'iy intellekt (AI)</h2>
        </div>

        <SecretInput
          label="Anthropic API kaliti (Claude AI)"
          value={store.anthropicApiKey}
          onChange={store.setApiKey}
          placeholder="sk-ant-api03-..."
          hint="claude.ai/account/keys sahifasidan oling — bu kalit AI yordamchi uchun ishlatiladi"
        />

        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-xs text-blue-300">
          <p className="font-medium mb-1">🔑 Kalit qayerdan olinadi?</p>
          <p>1. <b>console.anthropic.com</b> ga kiring</p>
          <p>2. <b>API Keys</b> → <b>Create Key</b></p>
          <p>3. Kalitni nusxalab yuqoridagi maydonga yapishtirig</p>
        </div>
      </div>

      {/* Telegram */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Send size={16} className="text-blue-400" />
          <h2 className="text-sm font-semibold text-white">Telegram Bot</h2>
        </div>

        <SecretInput
          label="Telegram Bot Token"
          value={store.telegramBotToken}
          onChange={store.setTelegramToken}
          placeholder="1234567890:ABCdef..."
          hint="@BotFather dan /newbot yoki /token orqali oling"
        />
      </div>

      {/* iiko */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Zap size={16} className="text-yellow-400" />
          <h2 className="text-sm font-semibold text-white">iiko API</h2>
        </div>

        <SecretInput
          label="iiko API kaliti"
          value={store.iikoApiKey}
          onChange={store.setIikoKey}
          placeholder="iiko API key..."
          hint="iiko Cabinet → Settings → API dan oling"
        />
      </div>

      {/* Notifications */}
      <div className="card space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Bell size={16} className="text-yellow-400" />
          <h2 className="text-sm font-semibold text-white">Bildirishnomalar</h2>
        </div>

        {[
          { label: 'Bildirishnomalarni yoqish', value: store.notificationsEnabled, fn: store.setNotifications },
          { label: 'Tovushli bildirishnomalar', value: store.soundEnabled, fn: store.setSound },
        ].map(item => (
          <div key={item.label} className="flex items-center justify-between">
            <span className="text-sm text-slate-300">{item.label}</span>
            <button
              onClick={() => item.fn(!item.value)}
              className={`w-11 h-6 rounded-full transition-colors relative ${item.value ? 'bg-red-500' : 'bg-slate-600'}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${item.value ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
        ))}

        <div>
          <label className="block text-sm text-slate-400 mb-1">Avtomatik yangilash (soniya)</label>
          <select
            className="input w-auto"
            value={store.autoRefreshInterval}
            onChange={e => store.setAutoRefresh(Number(e.target.value))}
          >
            <option value={60}>1 daqiqa</option>
            <option value={300}>5 daqiqa</option>
            <option value={600}>10 daqiqa</option>
            <option value={1800}>30 daqiqa</option>
          </select>
        </div>
      </div>

      {/* Mobile Install */}
      <div className="card space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <RefreshCw size={16} className="text-green-400" />
          <h2 className="text-sm font-semibold text-white">Mobil ilova</h2>
        </div>
        <p className="text-xs text-slate-400">
          Tizimni telefonga ilova sifatida o'rnating — ikonka bosh ekranda paydo bo'ladi.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={handleInstallPWA} className="btn-primary text-sm">
            📱 Telefonga o'rnatish
          </button>
          <a
            href={`${import.meta.env.VITE_API_URL || ''}/download/apk`}
            className="btn-ghost text-sm text-center"
          >
            ⬇️ APK yuklash (6MB)
          </a>
        </div>
        <div className="bg-slate-700/50 rounded-lg p-3 text-xs text-slate-400 space-y-1">
          <p><b className="text-white">Android:</b> Chrome → ⋮ menyu → "Bosh ekranga qo'shish"</p>
          <p><b className="text-white">iPhone:</b> Safari → Ulashish (□↑) → "Bosh ekranga qo'shish"</p>
          <p><b className="text-white">Windows EXE:</b> GitHub Releases dan yuklab o'rnating</p>
        </div>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        className={`btn-primary w-full flex items-center justify-center gap-2 ${saved ? 'bg-green-500 hover:bg-green-600' : ''}`}
      >
        {saved ? <CheckCircle size={16} /> : <Save size={16} />}
        {saved ? 'Saqlandi!' : 'Saqlash'}
      </button>

      {/* Version info */}
      <div className="text-center text-xs text-slate-600">
        Pizza Chain v1.0.0 · github.com/stopxan/mobilniy-ofic
      </div>
    </div>
  );
}
