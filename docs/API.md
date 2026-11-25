# ChapterFlow REST API Documentation

Base URL (Local): `http://localhost:5000/api`

All protected endpoints require a valid HTTP-only cookie (`chapterflow_token`) set by `/api/auth/login` or `/api/auth/register`.

---

## 1. Health Check
- **GET `/api/health`**
  - Verifies Express server and Neon PostgreSQL connectivity (`SELECT 1`).
  - Response: `{ success: true, status: "ok", database: "connected", environment, timestamp }`

---

## 2. Authentication
- **POST `/api/auth/register`**
  - Body: `{ name, email, password }`
  - Creates user with bcrypt-hashed password and sets HTTP-only JWT cookie.
- **POST `/api/auth/login`**
  - Body: `{ email, password }`
  - Verifies credentials and sets HTTP-only JWT cookie.
- **POST `/api/auth/logout`**
  - Clears authentication cookie.
- **GET `/api/auth/me`** *(Auth required)*
  - Returns currently authenticated user profile.
- **PUT `/api/auth/me`** *(Auth required)*
  - Body: `{ name?, currentPassword?, newPassword? }`

---

## 3. Chapters
- **GET `/api/chapters`** *(Auth required)*
  - Query params: `search`, `category`, `sort` (`newest` | `oldest` | `title`), `page`, `limit`, `isActive`
- **GET `/api/chapters/:id`** *(Auth required)*
  - Returns full chapter metadata, ordered questions, and options from Neon PostgreSQL.
- **POST `/api/chapters/upload`** *(Auth required, `multipart/form-data`)*
  - Field: `files` (1 to 20 `.json` files)
  - Validates JSON structure, prevents duplicate `chapter_id` per user, stores chapter + questions + options atomically via Prisma `$transaction`, and logs to `upload_history`.
- **PUT `/api/chapters/:id`** *(Auth required)*
  - Body: `{ title?, description?, category?, instructions?, isActive? }`
- **DELETE `/api/chapters/:id`** *(Auth required)*
  - Cascades deletion of questions, options, and practice attempts.

---

## 4. Questions
- **GET `/api/chapters/:id/questions`** *(Auth required)*
- **GET `/api/questions/:id`** *(Auth required)*

---

## 5. Practice
- **GET `/api/practice/progress/:chapterId`** *(Auth required)*
  - Returns the user's `in_progress` attempt and saved `user_answers` for resuming a chapter test.
- **PUT `/api/practice/progress`** *(Auth required)*
  - Body: `{ chapterId, currentIndex, questionId?, selectedOption? }`
  - Saves/updates the user's current question position and selected answer in Neon PostgreSQL.
- **DELETE `/api/practice/progress/:chapterId`** *(Auth required)*
  - Clears any `in_progress` attempt for the chapter when starting fresh.
- **POST `/api/practice/submit`** *(Auth required)*
  - Body: `{ chapterId, answers: [{ questionId, selectedOption }] }`
  - Evaluates answers against Neon PostgreSQL, finalizes any `in_progress` attempt (or creates a new `completed` attempt), and returns score + explanations.
- **GET `/api/practice/history`** *(Auth required)*
  - Returns completed `attempts` and any active `inProgress` sessions.

---

## 6. Dashboard & Uploads
- **GET `/api/dashboard/stats`** *(Auth required)*
- **GET `/api/uploads/history`** *(Auth required)*
