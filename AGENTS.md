# NodeBBS Agent Guidelines

This document provides context, conventions, and guidelines for AI agents working on the NodeBBS codebase.
NodeBBS is a modern forum platform built as a monorepo using Turborepo.

## 🏗 Project Structure

The project is a monorepo managed by **Turborepo** and **pnpm**.

- **Root**: Configuration for Turbo, Docker, and shared scripts.
- **apps/web**: Frontend application (Next.js 16, React 19, Tailwind CSS 4).
- **apps/api**: Backend API service (Fastify 5, Node.js, Drizzle ORM).

## 🛠 Build & Run Commands

### Global Commands (Run from Root)
- **Install Dependencies**: `pnpm install`
- **Start Development**: `pnpm dev` (Starts both Web and API)
- **Build Production**: `pnpm build`
- **Linting**: No global lint command configured currently.
- **Testing**: No automated test suite exists. **Do not attempt to run tests.**

### App-Specific Commands

**Web (`apps/web`)**:
- `pnpm dev`: Start Next.js dev server (Port 3100).
- `pnpm build`: Build Next.js application.

**API (`apps/api`)**:
- `pnpm dev`: Start Fastify dev server with watch mode (Port 7100).
- `pnpm db:push`: Push Drizzle schema changes to the database.
- `pnpm db:studio`: Open Drizzle Studio to manage data.
- `pnpm seed`: Seed the database with initial data.

## 🎨 Code Style & Conventions

### General Guidelines
- **Language**: Pure **JavaScript** (`.js`, `.jsx`). **NO TypeScript**.
- **Indentation**: **2 spaces**.
- **Semicolons**: **Always** used at the end of statements.
- **Quotes**:
  - **JavaScript**: Single quotes (`'string'`).
  - **JSX Attributes**: Double quotes (`<div className="...">`).
- **Trailing Commas**: Use in multi-line objects, arrays, and function parameters.

### Frontend (`apps/web`)
- **Framework**: Next.js 16 (App Router).
- **Styling**: Tailwind CSS 4. Use utility classes.
- **Components**:
  - **Location**: `src/components`.
  - **Naming**: PascalCase for files and exports (e.g., `UserAvatar.jsx`).
  - **Pattern**: Functional components.
- **Imports**:
  - **Absolute Imports**: MUST use `@/` alias for internal imports.
  - **Example**: `import { Button } from '@/components/ui/button';`
  - **Order**: External libraries first, then internal components.
- **UI Library**: shadcn/ui (Radix UI + Tailwind).
  - Use `cn()` utility for class merging.
- **State**: React Hooks (`useState`, `useEffect`).
- **Data Fetching**: Use `swr` or `fetch` in Client Components; direct async calls in Server Components.

### Backend (`apps/api`)
- **Framework**: Fastify 5.
- **Module System**: **ES Modules (ESM)**.
- **Imports**:
  - **Relative Imports**: MUST use relative paths.
  - **Extensions**: **CRITICAL**: MUST include `.js` extension in imports.
  - **Example**: `import db from '../../db/index.js';` (NOT `../../db`).
- **Database**: Drizzle ORM + PostgreSQL.
  - Schema defined in `src/db/schema.js` (or similar).
- **Architecture**:
  - `src/app.js`: Entry point.
  - `src/routes/`: Route definitions (folder-based structure).
  - `src/services/`: Business logic.

## 📝 Naming Conventions

- **Files**:
  - **React Components**: `PascalCase.jsx`
  - **Hooks**: `useCamelCase.js`
  - **Utilities**: `camelCase.js`
  - **API Routes**: `kebab-case` or `index.js` inside folders.
- **Variables/Functions**: `camelCase`.
- **Constants**: `UPPER_SNAKE_CASE` for global constants.
- **Environment Variables**: `UPPER_SNAKE_CASE`.

## ⚠️ Error Handling

### Frontend
- **User Feedback**: Use `sonner` for toast notifications.
  - `toast.error('Something went wrong')`
- **Logic**: Wrap async operations in `try/catch` blocks.
- **Validation**: Use Zod (if available) or manual checks before API calls.

### Backend
- **Response Format**:
  - Success: `reply.send({ data: ... })` or direct object.
  - Error: `reply.code(400).send({ error: 'Message' })`.
- **Async Handlers**: Always use `async/await` and `try/catch`.
- **Plugins**: `@fastify/sensible` is used for standard HTTP errors.

## 📦 Database & ORM (Drizzle)

- **Schema Changes**:
  1. Modify schema file in `apps/api`.
  2. Run `pnpm db:generate` (if applicable) or `pnpm db:push` to sync.
  3. **NEVER** write raw SQL unless absolutely necessary.
- **Queries**: Use Drizzle query builder syntax.
  - `await db.select().from(users).where(eq(users.id, 1))`

## 🔄 Git & Version Control

- **Commit Messages**: Semantic Commit Messages.
  - `feat: add new login page`
  - `fix: resolve hydration error`
  - `chore: update dependencies`
  - `docs: update readme`
- **Branching**: Create feature branches from `main`.

## 🤖 AI Agent Behavior Rules

1. **Verify Before implementing**: Always check if a file exists before creating it.
2. **Respect Imports**:
   - In `apps/web`: Use `@/`.
   - In `apps/api`: Use relative paths + `.js`. This is the most common error source.
3. **No TypeScript**: Do not add types or interfaces. Use JSDoc if clarification is needed.
4. **No Tests**: Do not try to run `npm test` or `pnpm test`. It will fail.
5. **Tailwind**: Use Tailwind v4 syntax. No `tailwind.config.js` needed for v4 usually, but check `postcss.config.mjs`.
6. **Icons**: Use `lucide-react` for icons.

## 🔍 Diagnostics

Since there is no strict type checking (TS) or linting command:
1. **Read Files**: Carefully read related files to understand expected object shapes.
2. **Console Logs**: Use `console.log` for debugging during development if needed, but remove before completion.
3. **Runtime Verification**: Verify changes by checking if the dev server crashes or errors out.

## 🚀 Deployment Context

- **Docker**: The app is containerized. `Dockerfile` exists in each app.
- **Environment**: `dotenvx` is used for managing secrets.
- **PM2**: Used for process management in production.

---
*Generated by AI Agent for AI Agents.*
