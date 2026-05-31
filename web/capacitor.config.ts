import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'uz.pizza.chain',
  appName: 'Pizza Chain',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Production URL - web'dan to'g'ridan-to'g'ri yuklaydi
    url: 'https://pizza-chain-app.vercel.app',
    cleartext: false,
  },
  android: {
    buildOptions: {
      releaseType: 'APK',
    },
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0f172a',
      showSpinner: true,
      spinnerColor: '#E63946',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
