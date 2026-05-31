# 🚀 Deploy qilish bo'yicha qo'llanma

## 1. BACKEND → Railway (bepul hosting)

1. **railway.app** ga o'ting va GitHub bilan login qiling
2. **"New Project"** → **"Deploy from GitHub repo"**
3. `stopxan/mobilniy-ofic` reponi tanlang
4. **"Add service"** → **"Database"** → **"PostgreSQL"** qo'shing
5. **Variables** bo'limiga quyidagilarni qo'shing:
   ```
   NODE_ENV=production
   JWT_SECRET=<kuchli_parol_yarating>
   JWT_REFRESH_SECRET=<boshqa_kuchli_parol>
   ANTHROPIC_API_KEY=<claude_api_kaliti>
   TELEGRAM_BOT_TOKEN=<telegram_bot_token>
   CORS_ORIGIN=https://pizza-chain-app.vercel.app
   ```
6. Railway o'zi DATABASE_URL ni qo'shadi (PostgreSQL dan)
7. **Root Directory** ni `backend` ga o'rnating
8. Deploy tugagach URL ni ko'chirng (masalan: pizza-backend.up.railway.app)

---

## 2. FRONTEND → Vercel (bepul hosting)

1. **vercel.com** ga o'ting va GitHub bilan login qiling
2. **"New Project"** → `stopxan/mobilniy-ofic` reponi import qiling
3. **Root Directory** ni `web` ga o'rnating
4. **Environment Variables** qo'shing:
   ```
   VITE_API_URL=https://<railway_url>
   ```
5. **Deploy** bosing
6. URL olinadi (masalan: pizza-chain-app.vercel.app)

---

## 3. WINDOWS EXE

Allaqachon tayyor: `desktop/dist/Pizza Chain Setup 1.0.0.exe`

Har yangi versiyada GitHub Actions avtomatik yangi EXE quradi.

---

## 4. ANDROID APK

### Talab:
- Android Studio (bepul)
- Java JDK 17+

### Qadamlar:
```bash
cd web
npm install
npm run build
npx cap add android
npx cap sync android
npx cap open android
```
Android Studio da: **Build** → **Generate Signed APK**

### Yoki GitHub Actions orqali:
Har push da `.github/workflows/deploy.yml` APK quradi
Actions → Artifacts bo'limidan yuklab olish mumkin

---

## 5. GITHUB SECRETS sozlash

Repo → Settings → Secrets → Actions:
```
VERCEL_TOKEN      → vercel.com/account/tokens
VERCEL_ORG_ID     → vercel.com/account (team ID)
VERCEL_PROJECT_ID → vercel.com/project/settings
VITE_API_URL      → https://pizza-backend.up.railway.app
```

---

## Tayyor bo'lgach barcha URL'lar:

| Platform | URL |
|----------|-----|
| Web | https://pizza-chain-app.vercel.app |
| API | https://pizza-backend.up.railway.app |
| Windows | desktop/dist/Pizza Chain Setup 1.0.0.exe |
| Android | GitHub Actions → Artifacts |
