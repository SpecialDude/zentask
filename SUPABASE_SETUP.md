# Supabase Setup Guide for ZenTask

This guide will walk you through setting up Supabase as the backend for ZenTask.

## Prerequisites

- A [Supabase](https://supabase.com) account (free tier works fine)
- Node.js 18+ installed
- The ZenTask repository cloned locally

---

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **"New Project"**
3. Fill in the details:
   - **Name**: `zentask` (or any name you prefer)
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose the closest to your users
4. Click **"Create new project"** and wait for it to spin up (~2 minutes)

---

## Step 2: Run Database Migrations

1. In your Supabase Dashboard, go to **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Copy and paste the contents of `supabase/migrations/001_create_tasks_table.sql`
4. Click **"Run"** (or press Ctrl+Enter)
5. You should see "Success. No rows returned"

### Verification
Run these queries to verify setup:

```sql
-- Check table exists
SELECT * FROM public.tasks LIMIT 1;

-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'tasks';

-- Check policies exist
SELECT policyname FROM pg_policies WHERE tablename = 'tasks';
```

---

## Step 3: Get Your API Keys

1. Go to **Project Settings** (gear icon) → **API**
2. Copy these values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")

---

## Step 4: Configure Your Environment

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and fill in your credentials:
   ```ini
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your_anon_key_here
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

### Getting a Gemini API Key (for AI features)
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create an API key
3. Add it to your `.env` file

---

## Step 5: Run the Application

```bash
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

---

## Step 6: Create Your First Account

1. Click **"Sign Up"** on the login screen
2. Enter your email and password
3. Check your email for the confirmation link (Supabase sends this automatically)
4. Click the link to verify your account
5. Log in and start creating tasks!

---

## Database Schema Reference

### Tasks Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT | Primary key (UUID string) |
| `user_id` | UUID | References auth.users |
| `parentId` | TEXT | Parent task ID (for subtasks) |
| `title` | TEXT | Task title (required) |
| `description` | TEXT | Task description |
| `status` | TEXT | TODO, IN_PROGRESS, COMPLETED, CANCELLED |
| `priority` | TEXT | LOW, MEDIUM, HIGH, URGENT |
| `completion` | INTEGER | 0-100 percentage |
| `date` | TEXT | Date in YYYY-MM-DD format |
| `duration` | INTEGER | Duration in minutes |
| `startTime` | TEXT | Start time in HH:mm format |
| `cancelReason` | TEXT | Reason for cancellation |
| `carryOverReason` | TEXT | Reason for carrying over |
| `carriedOverTo` | TEXT | Date carried over to |
| `carriedOverFrom` | TEXT | Date carried over from |
| `createdAt` | BIGINT | Unix timestamp |
| `updatedAt` | BIGINT | Unix timestamp |
| `isRecurring` | BOOLEAN | Is this a recurring task |
| `recurrencePattern` | TEXT | DAILY, WEEKLY, WEEKDAYS, MONTHLY |
| `recurrenceEndDate` | TEXT | End date for recurrence (YYYY-MM-DD) |
| `recurringParentId` | TEXT | ID of the original recurring task |

### Row Level Security (RLS)

The database is secured with RLS policies that ensure:
- Users can only **see** their own tasks
- Users can only **create** tasks for themselves
- Users can only **update** their own tasks
- Users can only **delete** their own tasks

---

## Troubleshooting

### "Invalid API key" error
- Double-check your `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env`
- Make sure there are no extra spaces or quotes

### Blank screen on load
- Check browser console (F12) for errors
- Ensure `.env` file has all required values
- Restart the dev server after changing `.env`

### Can't see tasks after login
- Verify RLS policies are created (Step 2 verification)
- Check that `user_id` matches your authenticated user

### Email verification not working
- Check spam folder
- Go to Supabase Dashboard → Authentication → Users to manually confirm

---

## Optional: Customize Email Templates

1. Go to **Authentication** → **Email Templates** in your Supabase Dashboard
2. Customize the confirmation and password reset emails
3. Update the **Site URL** under **Authentication** → **URL Configuration** to match your domain

---

## File Structure

```
supabase/
├── migrations/
│   ├── 001_create_tasks_table.sql    # Main schema + RLS
│   ├── 002_add_priority_column.sql   # Priority field migration
│   └── 003_add_recurring_columns.sql # Recurring tasks support migration
```

---

## Next Steps

- Deploy to [Vercel](https://vercel.com) or [Netlify](https://netlify.com)
- Set environment variables in your hosting platform
- Configure custom domain in Supabase if needed
