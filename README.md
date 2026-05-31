# 🍕 Pizza Chain Management System

Pizza restoran tarmog'ini boshqarish uchun yagona tizim — 4 filial, 100+ xodim.

## Tuzilma

```
mobilniy-ofic/
├── backend/        # Node.js + Express + TypeScript API
├── web/            # React + TypeScript + Tailwind CSS
├── mobile/         # React Native + Expo
├── database/       # SQL schema va seed ma'lumotlar
└── docs/
```

## Rollar

| Rol | Vakolat |
|-----|---------|
| **Egasi** | Barcha tizimga to'liq kirish |
| **Bosh Buxgalter** | Barcha moliyaviy ma'lumotlar |
| **Menejer** | Faqat o'z filiali |
| **Kuryer** | Yetkazishlar va buyurtmalar |

## Xususiyatlar

- Egasi uchun real-vaqt dashboard (30 soniyada to'liq tushuncha)
- Vazifalar tizimi + fotootyot nazorati
- Moliyaviy hisobotlar (daromad, xarajat, foyda)
- Ombor va inventarizatsiya
- Kuryer nazorati va statistikasi
- **iiko integratsiyasi** (har 15 daqiqada avtomatik sinxronizatsiya)
- **Telegram bot** bildirishnomalari
- **Claude AI** yordamchi (biznes savollariga javob)
- Socket.io real-vaqt bildirishnomalar

## Ishga tushirish

### 1. Backend

```bash
cd backend
cp .env.example .env
# .env faylini to'ldiring
npm install
npm run dev
```

### 2. Ma'lumotlar bazasi

```bash
# PostgreSQL da pizza_chain bazasini yarating
psql -U postgres -c "CREATE DATABASE pizza_chain;"
psql -U postgres -d pizza_chain -f database/schema.sql
psql -U postgres -d pizza_chain -f database/seed.sql
```

### 3. Web

```bash
cd web
npm install
npm run dev
```

### 4. Mobil

```bash
cd mobile
npm install
npx expo start
```

## Demo kirish

| Rol | Telefon | Parol |
|-----|---------|-------|
| Egasi | +998901000001 | password123 |
| Buxgalter | +998901000002 | password123 |
| Menejer | +998901000003 | password123 |

## Muhit o'zgaruvchilari

`backend/.env` fayliga:
- `DATABASE_URL` — PostgreSQL ulanish
- `REDIS_URL` — Redis ulanish
- `JWT_SECRET` — JWT kalit (o'zgartiring!)
- `TELEGRAM_BOT_TOKEN` — @BotFather dan oling
- `IIKO_API_KEY` — iiko API kaliti
- `ANTHROPIC_API_KEY` — Claude AI kaliti

## Texnologiyalar

- **Backend**: Node.js, Express, TypeScript, PostgreSQL, Redis, Socket.io
- **Web**: React 18, TypeScript, Vite, Tailwind CSS, React Query
- **Mobile**: React Native, Expo
- **AI**: Claude (Anthropic)
- **Integratsiyalar**: iiko API, Telegram Bot API
