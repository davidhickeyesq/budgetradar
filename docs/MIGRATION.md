# Migration to Supabase (Cloud)

The Local-First Refactor (v2.0.0) creates a codebase that runs locally by default but maintains compatibility with Supabase for cloud deployment. This guide explains how to deploy the production version.

## 1. Prerequisites
- A Supabase project
- A Vercel (or similar) account for frontend hosting
- A cloud container service (Railway, Render, Fly.io) for the FastAPI backend

## 2. Environment Configuration

In your production environment variables (e.g., Vercel Dashboard / Railway Dashboard), set:

```bash
# Toggle Cloud Mode
USE_SUPABASE=true

# Supabase Credentials
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# Database (For Backend SQLAlchemy connection)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

## 3. Database Migration

Since we kept the schema identical, you can run the initialization SQL script directly in the Supabase SQL Editor.

1. Open `backend/migrations/001_init.sql`
2. Copy the content
3. Paste into Supabase Dashboard -> SQL Editor
4. Run check - Success!

## 4. Deploying Services

### Backend (Python FastAPI)
Deploy the `/backend` directory. ensure the build command installs dependencies:
`pip install -r requirements.txt`

Start command:
`uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Frontend (Next.js)
Deploy the `/frontend` directory.
Vercel will auto-detect the Next.js app.

**Crucial:** Set `NEXT_PUBLIC_API_URL` to your production backend URL (e.g., `https://api.budgetradar.com`).

## 5. Backwards Compatibility Logic

The code in `app/config.py` handles the switch:

```python
if settings.use_supabase:
    # Logic in database.py can be extended to leverage 
    # Supabase native features if desired, but currently
    # SQLAlchemy connects to Supabase 5432 port just fine.
    pass
```

*Note:* The current implementation focuses on SQLAlchemy for data access. For true Supabase client usage (Row Level Security via API), you would revert `database.py` to use `supabase-py` logic, which is preserved in git history if needed. However, connecting SQLAlchemy directly to the Supabase Postgres instance is the recommended path for this v2 architecture.
