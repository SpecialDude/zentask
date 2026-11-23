# ZenTask: Hierarchical Productivity Tracker

ZenTask is a professional-grade daily task management application built with React, Tailwind CSS, a Django/DRF backend, and Google Gemini AI. It is designed to help users master their daily flow through structured hierarchies, intuitive visualizations, and AI-assisted planning.

## 🌟 Key Features

- **Hierarchical Task Management**: Tasks can contain sub-tasks to any depth. Progress automatically aggregates from children to parents.
- **Dual View Interface**:
    - **Daily List**: A clean, nested list view for focused execution.
    - **Kanban Board**: A drag-and-drop board for workflow visualization (Todo, In Progress, Completed, Cancelled).
- **AI-Assisted Planning**: Describe your day in natural language, and ZenTask uses Gemini to generate a structured task hierarchy with times and durations.
- **Smart Carry-Over**: Unfinished tasks can be carried over to future dates with recorded reasons, maintaining a clear audit trail of your productivity.
- **Persistent Backend**: Django 5.2 + DRF with cookie-based sessions and PostgreSQL storage (`zentask.api`).
- **Responsive & Themed**: Full support for Dark and Light modes with a mobile-first responsive design.

## 🏗️ Technical Architecture

### Tech Stack
- **Frontend**: React 19, Vite 6, Tailwind CSS
- **Backend/Auth**: Django 5.2 + DRF, PostgreSQL (HttpOnly `zt_access` / `zt_refresh` cookies, CSRF header)
- **AI Engine**: Google GenAI SDK, called through the backend `/ai/generate` proxy
- **Icons/UI**: Custom SVG implementations for a lightweight, zero-dependency visual experience.

### Repositories
- `zentask` (this repository) — the SPA. Talks only to the Django API.
- `zentask.api` (sibling directory) — Django backend, workers, MCP server.

The Supabase edge functions used before the migration are preserved under `supabase/functions` for reference only; nothing in the SPA imports them.

### Component Breakdown

#### Core Logic
- **`App.tsx`**: The central orchestrator. It manages session state, task loading, and the global theme.
- **`hooks/useTasks.ts`**: Task CRUD, recurring generation, carry-over, and parent progress sync.
- **`services/`**: Thin API clients (tasks, lists, notifications, Jira, analytics, feedback, API keys, AI) over `services/apiClient.ts`.
- **`utils.ts`**: Contains pure helper functions for ID generation, date formatting, and progress calculation.
- **`types.ts`**: Definitive TypeScript interfaces for `Task`, `TaskStatus`, and `ViewType`.

#### Interface Components
- **`Auth.tsx`**: Login and sign-up against `/auth/*` endpoints, plus "Continue with Google" when the API reports it configured (`GET /auth/providers`).
- **`Header.tsx`**: Provides date navigation (day-by-day or via calendar picker), the AI Assistant trigger, and user profile/logout management.
- **`Sidebar.tsx`**: Navigation between views, plus the system-wide theme toggle.
- **`TaskItem.tsx`**: Handles inline progress tracking, sub-task expansion/collapse, contextual menus for "Cancel" (with reason) and "Carry Over" (with date picker and reason), and status toggling.
- **`AIModal.tsx`**: Sends structured instructions through the backend AI proxy and injects the returned JSON plan.
- **`KanbanBoard.tsx`**: Implements native HTML5 drag-and-drop with status transitions.

### MCP & API keys

The Integrations view exposes the MCP remote URL (`<origin>/api/mcp`) for OAuth connectors and lets users mint/revoke personal API keys for CLI agents. Both are served by `zentask.api`.

## 🔄 Logic & Workflows

### Progress Aggregation (`syncParents`)
When a user updates the completion percentage of a task:
1. The app updates the specific task in the database.
2. If that task has a `parentId`, the app finds all siblings.
3. It calculates the average progress of all siblings.
4. It updates the parent task with this new average and a corresponding status (e.g., 100% becomes `COMPLETED`).
5. This process recurses up the tree until it reaches a root task.

### Task Carry-Over
`POST /tasks/<id>/carry-over` clones the task, its subtasks and (when needed) its parent on the server, so the new day keeps the hierarchy:
1. The original task is marked with `carriedOverTo: "YYYY-MM-DD"`.
2. A clone is created for the target date with `carriedOverFrom` and the optional reason.

### AI Planning Prompt
The AI is instructed to act as a "Productivity Expert." It parses free-form text into a JSON array with a strict schema, so even "messy" user notes result in a clean schedule.

## 🚀 Getting Started

1. Clone this repository and the sibling `zentask.api` backend.
2. Copy `.env.example` to `.env` and set:
    - `VITE_API_PROXY_TARGET` — backend origin for dev (default `http://127.0.0.1:8000`)
    - `VITE_VAPID_PUBLIC_KEY` — Web Push public key (must match the backend VAPID pair)
    - `VITE_API_BASE` — only for production builds; leave empty in dev
3. Run `npm install`.
4. Start the backend (`zentask.api`): migrations, then `manage.py runserver 127.0.0.1:8000`.
5. Run `npm run dev` (Vite on port 5173; API paths are proxied to the backend).

Server-side secrets (Gemini key, Jira client credentials, VAPID private key, email SMTP) live in `zentask.api`, never in this repository.

## 🚢 Deployment

`vercel.json` rewrites `/api/*`, `/mcp`, `/.well-known/*` and `/oauth/*` to `https://api.zentask.space`. Set `VITE_API_BASE=https://api.zentask.space` for the production build.

## 📝 Database

The schema is owned by `zentask.api` (Django migrations). Task fields keep the SPA's camelCase wire names (`parentId`, `startTime`, `createdAt`, …) so the wire contract did not change during the Supabase → Django migration.
