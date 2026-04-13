# CryptoDrop Real Stack

Este paquete sí trae una base **real** de faucet/earn hub:
- frontend React/Vite
- backend Express
- PostgreSQL
- auth con JWT
- ledger real
- cooldown server-side
- tickets de lotería
- requests de retiro a revisión
- admin review para retiros
- integración server-side lista para Turnstile

## Importante
La parte **casino/apuestas con dinero real** no viene activada en este stack porque eso ya te cambia el frente legal. Aquí va lo real del **faucet + earn hub + wallet**.

## 1) Levantar base de datos
```bash
docker compose up -d
```

## 2) Backend
```bash
cd backend
cp .env.example .env
npm install
npm run db:init
npm run dev
```

Backend: `http://localhost:8080`

## 3) Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Frontend: `http://localhost:5173`

## Admin inicial
Se crea desde las variables del backend `.env`:
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

## Flujo real recomendado
- Frontend en Vercel
- Backend en Railway / Render / VPS
- PostgreSQL en Neon / Supabase / Railway / VPS
- Cloudflare delante del dominio
- Turnstile activado
- payouts manuales primero
- luego integrar provider de pagos cuando ya tengas antifraude y números claros

## Endpoints importantes
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/me`
- `POST /api/faucet/claim`
- `POST /api/earn/credit`
- `POST /api/lottery/buy`
- `POST /api/wallet/withdraw-request`
- `GET /api/admin/withdrawals`
- `POST /api/admin/withdrawals/review`

## Por qué te salía la pantalla en blanco antes
Porque en lo que subiste:
- `index.html` apuntaba a `/src/main.jsx`
- pero los archivos estaban como `main.jsx` y `App(1).jsx` fuera de `/src`
- además el nombre era `package(1).json` y no `package.json`

Así Vite/Vercel no encontraba la estructura correcta.
