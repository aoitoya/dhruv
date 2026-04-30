# PROJECT KNOWLEDGE BASE

**Generated:** 2026-04-22
**Commit:** 335834c0
**Branch:** feat/workspace-invite-email

## OVERVIEW

Turborepo monorepo with a React/Vite frontend and Fastify/Drizzle backend for a workspace-based AI-integrated project management tool.

## STRUCTURE

```
.
├── apps/
│   ├── web/              # React 19 + Vite + TanStack Router frontend
│   │   ├── src/
│   │   │   ├── components/ui/     # shadcn/ui components
│   │   │   ├── routes/            # File-based routing
│   │   │   ├── lib/               # Utilities, auth client
│   │   │   └── states/            # Jotai atoms
│   │   └── ...
│   └── server/           # Fastify + Drizzle ORM backend
│       ├── src/
│       │   ├── modules/           # Feature modules (workspace, task, project, comment, auth)
│       │   ├── db/schema/         # Drizzle ORM schemas
│       │   ├── plugins/           # Fastify plugins
│       │   └── config/            # Environment config
│       └── bruno/                 # API testing collections
├── PLAN.md               # Project implementation plan (reference, may differ from actual)
└── turbo.json            # Turborepo task orchestration
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| API routes | `apps/server/src/modules/*/routes.ts` | Feature-based organization |
| Database schema | `apps/server/src/db/schema/*.ts` | One file per entity |
| Frontend routes | `apps/web/src/routes/*.tsx` | File-based TanStack Router |
| UI components | `apps/web/src/components/ui/*.tsx` | shadcn/ui style |
| Auth logic | `apps/server/src/modules/auth/` | better-auth integration |
| API tests | `apps/server/bruno/` | Bruno collections, not Postman |
| Environment config | `apps/server/src/config/index.ts` | Zod-validated env vars |

## CONVENTIONS

### Code Style
- **Biome** for linting/formatting (not ESLint/Prettier)
- Tab indentation, double quotes
- `biome ci` runs on pre-commit via lint-staged

### Git Workflow
- Husky pre-commit: `check-types` → `lint-staged`
- Turbo orchestrates tasks across packages

### Frontend
- React 19 with **React Compiler** enabled (Babel plugin)
- TanStack Router with file-based routing
- Path alias: `@/*` maps to `./src/*`
- TailwindCSS v4 with `@tailwindcss/vite` plugin
- shadcn/ui components using base-vega style
- State management via Jotai atoms

### Backend
- Fastify 5 with Zod validation
- Drizzle ORM with PostgreSQL (Neon serverless)
- better-auth for authentication (Redis storage)
- Feature modules: `index.ts` (exports), `routes.ts` (HTTP), `service.ts` (business logic)
- Vitest for testing with 30s timeout

## ANTI-PATTERNS (THIS PROJECT)

### Security
- Never store raw refresh/invite tokens - always SHA-256 hash them
- Never return `passwordHash` in API responses
- Never use `SameSite=Strict` in production - use `SameSite=None; Secure; HttpOnly`

### Database
- Never use `DEFAULT 0` on `tasks.position` - compute via `nextPosition()`
- Never SELECT then UPDATE for rate limits - use atomic upsert
- All timestamps must be `timestamptz` (UTC with timezone)
- Subtasks must be created after parent task, never before

### Code Quality
- Never install all dependencies upfront - install per phase as needed
- Never catch errors silently - log and return generic 500
- Always validate route bodies with Zod before DB operations
- Commit the `migrations/` folder - do not gitignore

## UNIQUE STYLES

- **API Testing**: Bruno collections in `apps/server/bruno/` (not Postman/Insomnia)
- **No shared packages/**: Despite workspace config, packages directory is empty
- **React Compiler**: Experimental React 19 optimization enabled
- **PLAN.md**: Large design document exists but actual implementation differs (uses Fastify, not Hono)

## COMMANDS

```bash
# Development
pnpm dev              # Start both apps via Turbo
pnpm dev --filter=web     # Frontend only
pnpm dev --filter=server  # Backend only

# Build
pnpm build            # Build all apps
pnpm check-types      # TypeScript type checking

# Linting
pnpm lint             # Run Biome on all apps

# Server testing
cd apps/server
pnpm test             # Run Vitest
pnpm test:watch       # Watch mode

# Database
cd apps/server
pnpm db:generate      # Generate Drizzle migrations
pnpm db:migrate       # Run migrations
pnpm db:studio        # Drizzle Studio GUI
```

## NOTES

- PLAN.md is a reference design doc - actual implementation uses different stack (Fastify vs Hono)
- Server uses better-auth with Redis for session storage
- Frontend proxies `/api` and `/socket.io` to backend via Vite config
- Test database runs in Docker via `docker-compose.test.yml`
- Bruno API collections organized by entity: workspaces, projects, tasks, comments
- **NEVER commit PLAN.md or AGENTS.md to git - these are local development guides only**
