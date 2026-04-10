# Routex AI – Học tập thông minh

AI-powered personalized learning platform for Vietnamese high school students (grades 10-12).

## Architecture

### Frontend (Next.js 16, port 5000)
- `frontend/app/page.tsx` — Login / Signup
- `frontend/app/onboarding/subject/page.tsx` — Subject picker (Toán/Lý/Hóa/Sinh)
- `frontend/app/onboarding/config/page.tsx` — Grade, mode, target config
- `frontend/app/test/page.tsx` — Mini test (one MCQ question at a time)
- `frontend/app/results/page.tsx` — Test results + AI roadmap
- `frontend/app/dashboard/page.tsx` — Progress dashboard
- `frontend/src/lib/api.tsx` — Axios API client
- `frontend/src/contexts/auth.tsx` — JWT auth context

### Backend (FastAPI, port 8000)
- `backend/app/main.py` — FastAPI entry point
- `backend/app/api/endpoints/auth.py` — Signup / Login (bcrypt + JWT)
- `backend/app/api/endpoints/config.py` — Learning config CRUD
- `backend/app/api/endpoints/tests.py` — Test generation + submission
- `backend/app/api/endpoints/roadmap.py` — AI roadmap generation
- `backend/app/api/endpoints/dashboard.py` — Dashboard data
- `backend/app/services/llm_service.py` — Gemini AI integration
- `backend/app/services/ml_service.py` — XGBoost model
- `backend/app/core/auth.py` — JWT utilities
- `backend/seed_questions.py` — Docx parser & DB seeder

### Database (SQLite – backend/routex.db)
Tables: users, learning_configs, topics, topic_prerequisites, questions, tests, test_questions, user_answers, user_mastery, weekly_progress, learning_paths, weekly_roadmaps

### Question Bank
11 .docx files in project root — 134 topics, 611 questions seeded across:
- Toán 10, 11, 12
- Lý 11, 12
- Hóa 10, 11
- Sinh 10, 11, 12

## Environment Variables / Secrets
- `GOOGLE_API_KEY` — Gemini AI API key (required for AI advice + MCQ generation)
- `SESSION_SECRET` — JWT signing secret

## Key Features
- JWT authentication (bcrypt passwords)
- 4-subject question bank from docx files
- Gemini-powered MCQ generation (questions auto-upgraded on first use)
- XGBoost ML model for score prediction
- Per-topic mastery tracking
- 3-scenario weekly roadmaps

## Workflows
- **Start application** — `cd frontend && npm run dev` (port 5000, webview)
- **Backend API** — `cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload` (port 8000, console)
