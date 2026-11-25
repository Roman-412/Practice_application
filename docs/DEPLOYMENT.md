# ChapterFlow Cloud Deployment Guide

This guide covers deploying **ChapterFlow** to production using:
- **Database**: Neon Serverless PostgreSQL
- **Backend**: Render
- **Frontend**: Vercel

---

## Step 1: Create Neon PostgreSQL Database

1. Sign in to [Neon Console](https://console.neon.tech/) and create a new project (e.g., `chapterflow-prod`).
2. Copy the **Pooled Connection String** (or Direct Connection String for migrations):
   ```
   postgresql://USER:PASSWORD@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
3. Run the Prisma migration against Neon:
   ```bash
   cd backend
   DATABASE_URL="your-neon-connection-string" npx prisma migrate deploy
   ```

---

## Step 2: Deploy Backend to Render

1. Push this repository to GitHub.
2. In [Render Dashboard](https://dashboard.render.com/), click **New + -> Web Service** (or **Blueprint** using `render.yaml`).
3. Configure the Web Service:
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npx prisma migrate deploy && npm start`
   - **Health Check Path**: `/api/health`
4. Add Environment Variables on Render:
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: Your Neon PostgreSQL connection string
   - `JWT_SECRET`: A strong random 32+ character string
   - `JWT_EXPIRES_IN`: `7d`
   - `FRONTEND_URL`: Your Vercel production URL (e.g. `https://chapterflow.vercel.app`) — *add this once Vercel deploys, then redeploy Render if needed.*

---

## Step 3: Deploy Frontend to Vercel

1. In [Vercel Dashboard](https://vercel.com/), click **Add New -> Project** and import your GitHub repo.
2. Set **Root Directory** to `frontend`.
3. **Framework Preset**: `Vite`
4. **Build Command**: `npm run build`
5. **Output Directory**: `dist`
6. Add Environment Variable on Vercel:
   - `VITE_API_URL`: `https://your-render-backend.onrender.com/api`
7. Deploy! Then copy your Vercel URL (`https://your-app.vercel.app`) back into Render's `FRONTEND_URL` environment variable so CORS and HTTP-only cookies work across HTTPS origins.

---

## Cross-Origin Cookie Note

Because Vercel (`*.vercel.app`) and Render (`*.onrender.com`) are different domains, the backend sets cookies with:
- `httpOnly: true`
- `secure: true` (in production)
- `sameSite: 'none'` (in production)
- `cors({ origin: allowedOrigins, credentials: true })`

Ensure both `FRONTEND_URL` (on Render) and `VITE_API_URL` (on Vercel) use `https://` without trailing slashes.
