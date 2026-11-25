# ChapterFlow — JSON-Based Chapter Management & Learning Platform

A production-ready Full Stack SaaS web application for uploading, validating, storing, managing, and practicing educational chapters from JSON files, backed by **Neon Serverless PostgreSQL** and **Prisma ORM**.

---

## Architecture & Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, React Router v6, Axios, Lucide Icons
- **Backend**: Node.js, Express.js, TypeScript, Multer, Zod, bcryptjs, JWT (HTTP-only cookies)
- **Database**: Neon Serverless PostgreSQL + Prisma ORM
- **Deployment**: Vercel (Frontend) + Render (Backend) + Neon (PostgreSQL)

---

## Project Structure

```
├── backend/                 # Express + TypeScript REST API + Prisma ORM
│   ├── prisma/
│   │   ├── schema.prisma    # 7 relational tables (users, chapters, questions, etc.)
│   │   └── migrations/      # SQL migration files
│   └── src/
│       ├── config/          # Env & Prisma client singleton
│       ├── controllers/     # Route handlers
│       ├── middleware/      # Auth, Multer upload, error handler
│       ├── routes/          # Express routers
│       ├── services/        # Business logic & Prisma transactions
│       └── validation/      # Zod schemas & flexible JSON chapter parser
├── frontend/                # React + TypeScript + Vite + Tailwind SaaS UI
│   └── src/
│       ├── components/      # Sidebar, Header, Modals, ProtectedRoute
│       ├── context/         # AuthContext (session via HTTP-only cookie)
│       ├── pages/           # Dashboard, Chapters, Upload, Learn, Practice, History, Settings
│       ├── services/        # Axios API clients
│       └── utils/           # Client-side JSON validator
├── sample-chapters/         # Sample educational JSON files (01_percentage..04_number_system)
├── docs/                    # API.md & DEPLOYMENT.md
├── render.yaml              # Render Blueprint deployment config
└── .env.example             # Root environment variables template
```

---

## Local Development Setup

### 1. Configure Neon PostgreSQL
1. Create a free PostgreSQL database at [neon.tech](https://neon.tech).
2. Copy `backend/.env.example` to `backend/.env` and set your `DATABASE_URL` and `JWT_SECRET`.

### 2. Start the Backend API
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```
The API server starts on `http://localhost:5000`. Check `http://localhost:5000/api/health`.

### 3. Start the Frontend App
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173`. Register an account, upload the files in `sample-chapters/`, and start studying!

---

## Documentation

- [REST API Reference](docs/API.md)
- [Cloud Deployment Guide (Vercel + Render + Neon)](docs/DEPLOYMENT.md)
