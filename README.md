# ZenTask: Hierarchical Productivity Tracker

ZenTask is a professional-grade daily task management application built with React, Tailwind CSS, Supabase, and Google Gemini AI. It is designed to help users master their daily flow through structured hierarchies, intuitive visualizations, and AI-assisted planning.

## 🌟 Key Features

- **Hierarchical Task Management**: Tasks can contain sub-tasks to any depth. Progress automatically aggregates from children to parents.
- **Dual View Interface**:
    - **Daily List**: A clean, nested list view for focused execution.
    - **Kanban Board**: A drag-and-drop board for workflow visualization (Todo, In Progress, Completed, Cancelled).
- **AI-Assisted Planning**: Describe your day in natural language, and ZenTask uses the `gemini-3-flash-preview` model to automatically generate a structured task hierarchy with times and durations.
- **Smart Carry-Over**: Unfinished tasks can be carried over to future dates with recorded reasons, maintaining a clear audit trail of your productivity.
- **Persistent Backend**: Integrated with Supabase for secure user authentication and real-time PostgreSQL storage.
- **Responsive & Themed**: Full support for Dark and Light modes with a mobile-first responsive design.

## 🏗️ Technical Architecture

### Tech Stack
- **Frontend**: React (ES6 Modules), Tailwind CSS
- **Backend/Auth**: Supabase (PostgreSQL + GoTrue)
- **AI Engine**: Google GenAI SDK (@google/genai)
- **Icons/UI**: Custom SVG implementations for a lightweight, zero-dependency visual experience.

### Component Breakdown

#### Core Logic
- **`App.tsx`**: The central orchestrator. It manages authentication state, fetches tasks from Supabase, and handles the global theme. It contains the `syncParents` algorithm which ensures that when a subtask's completion percentage changes, the parent's progress is recalculated as an average of its children.
- **`utils.ts`**: Contains pure helper functions for ID generation, date formatting, and progress calculation.
- **`types.ts`**: Definitive TypeScript interfaces for `Task`, `TaskStatus`, and `ViewType`.

#### Interface Components
- **`Auth.tsx`**: Handles Login and Sign-up flows via Supabase. Includes error handling and a "Zen" styled minimalist UI.
- **`Header.tsx`**: Provides date navigation (day-by-day or via calendar picker), the AI Assistant trigger, and user profile/logout management.
- **`Sidebar.tsx`**: Navigation between List and Kanban views, plus the system-wide theme toggle.
- **`TaskItem.tsx`**: The most complex component. It handles:
    - Inline progress tracking.
    - Sub-task expansion/collapse.
    - Contextual menus for "Cancel" (with reason) and "Carry Over" (with date picker and reason).
    - Status toggling.
- **`AIModal.tsx`**: Interfaces with the Gemini API. It sends a structured system instruction to the model to ensure the output is a valid JSON schema that the app can immediately parse and inject into the database.
- **`KanbanBoard.tsx`**: Implements native HTML5 drag-and-drop. It handles status transitions and triggers prompts when moving tasks to "Cancelled" or "Carried Over" states.

## 🔄 Logic & Workflows

### Progress Aggregation (`syncParents`)
When a user updates the completion percentage of a task:
1. The app updates the specific task in the database.
2. If that task has a `parentId`, the app finds all siblings.
3. It calculates the average progress of all siblings.
4. It updates the parent task with this new average and a corresponding status (e.g., 100% becomes `COMPLETED`).
5. This process recurses up the tree until it reaches a root task.

### Task Carry-Over
Carrying over a task does not just change its date; it creates a lineage:
1. The original task is marked with `carriedOverTo: "YYYY-MM-DD"`.
2. A new clone of the task is created for the target date with `carriedOverFrom: "Original Date"`.
3. If the task has sub-tasks that are also incomplete, they are cloned alongside the parent to maintain the hierarchy on the new day.

### AI Planning Prompt
The AI is instructed to act as a "Productivity Expert." It parses free-form text into a JSON array. The system instruction strictly enforces the schema to prevent runtime parsing errors and ensures that even "messy" user notes result in a clean, professional schedule.

## 🚀 Getting Started

1.  Clone the repository.
2.  Copy `.env.example` to `.env`.
3.  Fill in your `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `GEMINI_API_KEY`.
4.  **Set up Supabase Database**: Follow the [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) guide.
5.  Run `npm install` to install dependencies.
6.  Run `npm run dev` to start the development server.

## 📝 Database Schema Recommendation (Supabase)

```sql
create table tasks (
  id text primary key,
  user_id uuid references auth.users not null,
  parentId text references tasks(id) on delete cascade,
  title text not null,
  description text,
  status text not null,
  completion integer default 0,
  date text not null,
  duration integer,
  startTime text,
  cancelReason text,
  carryOverReason text,
  carriedOverTo text,
  carriedOverFrom text,
  createdAt bigint,
  updatedAt bigint
);
```
