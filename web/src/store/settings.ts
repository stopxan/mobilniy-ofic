import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AppSettings {
  anthropicApiKey: string;
  telegramBotToken: string;
  iikoApiKey: string;
  theme: 'dark';
  language: 'uz';
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  autoRefreshInterval: number;
}

interface SettingsState extends AppSettings {
  setApiKey: (key: string) => void;
  setTelegramToken: (token: string) => void;
  setIikoKey: (key: string) => void;
  setNotifications: (v: boolean) => void;
  setSound: (v: boolean) => void;
  setAutoRefresh: (v: number) => void;
  saveToBackend: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      anthropicApiKey: '',
      telegramBotToken: '',
      iikoApiKey: '',
      theme: 'dark',
      language: 'uz',
      notificationsEnabled: true,
      soundEnabled: true,
      autoRefreshInterval: 300,

      setApiKey: (key) => set({ anthropicApiKey: key }),
      setTelegramToken: (token) => set({ telegramBotToken: token }),
      setIikoKey: (key) => set({ iikoApiKey: key }),
      setNotifications: (v) => set({ notificationsEnabled: v }),
      setSound: (v) => set({ soundEnabled: v }),
      setAutoRefresh: (v) => set({ autoRefreshInterval: v }),

      saveToBackend: async () => {
        const { anthropicApiKey, telegramBotToken, iikoApiKey } = get();
        try {
          const { api } = await import('../lib/api');
          await api.post('/settings/keys', { anthropicApiKey, telegramBotToken, iikoApiKey });
        } catch {}
      },
    }),
    {
      name: 'pizza-settings',
      version: 1,
    }
  )
);
