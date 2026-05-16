# 🐙 Slack Monitor Dashboard

Dashboard para el Slack Client Monitor de Litebox.

## Arquitectura

- **Backend**: FastAPI (Python) — corre en el VPS en puerto 8765
- **Frontend**: Next.js 14 + Tailwind — deployado en Vercel

## Setup

### Backend (VPS)

```bash
cd api
pip install -r requirements.txt
./start.sh
```

Queda escuchando en `http://0.0.0.0:8765`. Asegurate que el puerto 8765 esté abierto en el firewall del VPS:
```bash
ufw allow 8765
```

### Frontend (local / Vercel)

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

### Deploy en Vercel

1. Push al repo de GitHub
2. Importar en [vercel.com](https://vercel.com) → New Project → seleccionar este repo
3. **Root Directory**: `frontend`
4. En Environment Variables agregar:
   - `NEXT_PUBLIC_API_URL` = `http://178.156.222.29:8765`
5. Deploy

## Features

- 📊 **Dashboard**: mensajes activos agrupados por urgencia (🚨🔴🟡⚪), Run Now button
- ✅ **Dismissed**: ver y revocar dismissals activos
- ⚙️ **Config**: editar ventana de tiempo, patrones, canales incluidos/excluidos
- 📱 Mobile-first con bottom nav
