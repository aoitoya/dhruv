# Dhruv Backend — Implementation Plan

> **Read this entire file before writing a single line of code.**
> Follow each phase in order. Do not skip ahead. Install dependencies only when
> a step explicitly tells you to — never install everything upfront.

---

## Project context

You are building the backend for **Dhruv**, a workspace-based AI-integrated
project management tool. The stack is:

- **Runtime:** Node.js (latest LTS)
- **Framework:** Fastify with TypeScript
- **ORM:** Drizzle ORM
- **Database:** PostgreSQL via Neon (serverless)
- **Auth:** better-auth with Redis storage (IMPLEMENTED)
- **AI:** Anthropic SDK (`claude-sonnet-4-6`) - NOT YET IMPLEMENTED
- **Email:** Resend
- **Validation:** Zod with Fastify JSON Schema type provider

The backend lives at `apps/server/` inside a pnpm monorepo.

---

## IMPLEMENTATION STATUS

✅ **COMPLETED:**
- Phase 0: Monorepo scaffold
- Phase 1: Database schema (adapted - see below)
- Phase 2: Server bootstrap + middleware
- Phase 3: Auth (better-auth + Redis)
- Phase 4: Workspaces
- Phase 5: Workspace Invitations
- Phase 6: Projects
- Phase 7: Tasks (partial)
- Phase 8: Comments

⏳ **NOT YET IMPLEMENTED:**
- Tags + Task Tags
- Notifications
- Activity Logs
- Dashboard
- AI Features (Phase 10)
- Final wiring (Phase 11)
- Deploy (Phase 12)

---

## Absolute rules — never violate these

1. **Install deps one phase at a time.** Each phase lists exactly what to install.
2. **Never store raw tokens.** For invites, always SHA-256 hash before DB.
   (better-auth handles its own tokens - no manual handling needed)
3. **Never store passwords in plaintext.** better-auth handles this.
4. **Never use `DEFAULT 0` on `tasks.position`.** Always compute it explicitly.
5. **AI rate limit uses atomic upsert** — never SELECT then UPDATE separately.
6. **Cookie must be `SameSite=None; Secure; HttpOnly`** in production.
   Use `SameSite=Lax` in local development (HTTP).
7. **Validate every route body** with Zod before touching the database.
8. **All timestamps are `timestamptz`** (UTC with timezone).
9. **Subtasks must be created after their parent task** — never before.
10. **Commit the `migrations/` folder.** It is not gitignored.
11. **Auth is handled by better-auth** - do NOT implement custom JWT/auth.

---

## Phase 0 — Monorepo scaffold

### Install (Phase 0 only)
```bash
# From repo root
pnpm init
```

### Steps

**0.1** Create the monorepo structure:
```
dhruv/
├── apps/
│   └── server/
├── packages/
│   └── shared/
├── package.json          ← monorepo root
└── pnpm-workspace.yaml
```

**0.2** Write `pnpm-workspace.yaml`:
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

**0.3** Write root `package.json`:
```json
{
  "name": "dhruv",
  "private": true,
  "scripts": {
    "dev:server": "pnpm --filter server dev",
    "build:server": "pnpm --filter server build"
  }
}
```

**0.4** Scaffold `packages/shared/`:
```bash
cd packages/shared
pnpm init
```

Write `packages/shared/package.json`:
```json
{
  "name": "@dhruv/shared",
  "version": "0.0.1",
  "main": "./src/index.ts",
  "types": "./src/index.ts"
}
```

Write `packages/shared/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

Create `packages/shared/src/index.ts` — leave it empty for now, types will
be added as routes are built.

**0.5** Scaffold `apps/server/`:
```bash
cd apps/server
pnpm init
```

Install Phase 0 server deps:
```bash
pnpm add typescript tsx @types/node --save-dev
```

Write `apps/server/package.json` (merge with what pnpm init created):
```json
{
  "name": "server",
  "version": "0.0.1",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "tsx src/db/migrate.ts",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {},
  "devDependencies": {
    "typescript": "latest",
    "tsx": "latest",
    "@types/node": "latest"
  }
}
```

Write `apps/server/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "paths": {
      "@dhruv/shared": ["../../packages/shared/src/index.ts"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

**0.6** Create `.env.example` at repo root:
```
DATABASE_URL=
JWT_SECRET=
JWT_REFRESH_SECRET=
ANTHROPIC_API_KEY=
CLOUDINARY_URL=
RESEND_API_KEY=
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
PORT=3000
```

Create `.env` from `.env.example`. Add `.env` to `.gitignore`.
Do NOT add `.env.example` to `.gitignore`.

**0.7** Create `apps/server/src/index.ts` with a bare Fastify hello-world to
verify the scaffold works:
```typescript
import Fastify from 'fastify'

const app = Fastify({ logger: true })

app.get('/', async () => ({ ok: true }))

const port = Number(process.env.PORT) || 3000
app.listen({ port, host: '0.0.0.0' }, (err) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Server running on http://localhost:${port}`)
})
```

Install to verify:
```bash
pnpm add fastify @fastify/cors
```

Run `pnpm dev` and confirm `{"ok":true}` at `http://localhost:3000`.

---

## Phase 1 — Database schema + migrations (IMPLEMENTED - split schema)

### Install
```bash
pnpm add drizzle-orm @neondatabase/serverless dotenv
pnpm add drizzle-kit --save-dev
```

### Actual Implementation

Schema is split into multiple files:
- `apps/server/src/db/schema/auth.ts` - better-auth tables (user, session, account, verification)
- `apps/server/src/db/schema/workspace.ts` - workspace, workspaceMember, workspaceInvite, workspaceInvitation
- `apps/server/src/db/schema/project.ts` - project, projectMember
- `apps/server/src/db/schema/task.ts` - task
- `apps/server/src/db/schema/index.ts` - exports all

**Key differences from original plan:**
- Uses `text()` for IDs instead of `uuid()` (better-auth requirement)
- Enum values are UPPERCASE (`'OWNER'`, `'ADMIN'`, `'MEMBER'`) vs lowercase
- Two invite tables exist: `workspaceInvite` and `workspaceInvitation` (duplication to clean up)
- Missing tables: tags, task_tags, comments, activity_logs, notifications, ai_usage, ai_logs

**Files:**
```
src/db/
├── index.ts           # DB connection
└── schema/
    ├── index.ts       # exports all
    ├── auth.ts        # better-auth tables
    ├── workspace.ts   # workspace, member, invite
    ├── project.ts     # project, projectMember
    └── task.ts        # task
```

### Steps

**1.1** Create `apps/server/src/db/schema.ts`.

Define all tables in this exact order (foreign keys require this order):

```typescript
import {
  pgTable, uuid, varchar, text, boolean, integer, real,
  timestamp, date, pgEnum, uniqueIndex, index, primaryKey
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ── Enums ────────────────────────────────────────────────────────
export const roleEnum        = pgEnum('role', ['owner', 'admin', 'member'])
export const inviteStatusEnum = pgEnum('invite_status', ['pending', 'accepted', 'expired'])
export const projectStatusEnum = pgEnum('project_status', ['active', 'archived'])
export const taskStatusEnum  = pgEnum('task_status', ['todo', 'in_progress', 'in_review', 'done'])
export const priorityEnum    = pgEnum('priority', ['critical', 'high', 'medium', 'low'])
export const activityActionEnum = pgEnum('activity_action',
  ['created', 'updated', 'deleted', 'commented', 'assigned', 'status_changed'])
export const notifTypeEnum   = pgEnum('notif_type', ['assigned', 'commented', 'mentioned'])
export const aiFeatureEnum   = pgEnum('ai_feature', ['breakdown', 'priority', 'parse'])

// ── users ────────────────────────────────────────────────────────
export const users = pgTable('users', {
  id:           uuid('id').primaryKey().defaultRandom(),
  name:         varchar('name', { length: 255 }).notNull(),
  email:        varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  avatarUrl:    varchar('avatar_url', { length: 500 }),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ── refresh_tokens ───────────────────────────────────────────────
// NEVER store raw tokens. Store SHA-256(token) only.
export const refreshTokens = pgTable('refresh_tokens', {
  id:        uuid('id').primaryKey().defaultRandom(),
  userId:    uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
})

// ── workspaces ───────────────────────────────────────────────────
export const workspaces = pgTable('workspaces', {
  id:          uuid('id').primaryKey().defaultRandom(),
  name:        varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  logoUrl:     varchar('logo_url', { length: 500 }),
  ownerId:     uuid('owner_id').notNull().references(() => users.id),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ── workspace_members ────────────────────────────────────────────
export const workspaceMembers = pgTable('workspace_members', {
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  userId:      uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role:        roleEnum('role').notNull().default('member'),
  joinedAt:    timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.workspaceId, t.userId] }),
}))

// ── workspace_invitations ────────────────────────────────────────
export const workspaceInvitations = pgTable('workspace_invitations', {
  id:          uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  invitedBy:   uuid('invited_by').notNull().references(() => users.id),
  email:       varchar('email', { length: 255 }).notNull(),
  role:        roleEnum('role').notNull().default('member'),
  // SHA-256 hash of the raw token sent in the email link
  tokenHash:   varchar('token_hash', { length: 64 }).notNull().unique(),
  status:      inviteStatusEnum('status').notNull().default('pending'),
  expiresAt:   timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  // Prevent duplicate pending invites to same email per workspace
  uniqueEmailPerWorkspace: uniqueIndex('unique_invite_email').on(t.workspaceId, t.email),
}))

// ── projects ─────────────────────────────────────────────────────
export const projects = pgTable('projects', {
  id:          uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name:        varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  status:      projectStatusEnum('status').notNull().default('active'),
  color:       varchar('color', { length: 7 }).notNull().default('#6366F1'),
  dueDate:     date('due_date'),
  createdBy:   uuid('created_by').notNull().references(() => users.id),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ── project_members ──────────────────────────────────────────────
export const projectMembers = pgTable('project_members', {
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  userId:    uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  joinedAt:  timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.projectId, t.userId] }),
}))

// ── tasks ────────────────────────────────────────────────────────
export const tasks = pgTable('tasks', {
  id:           uuid('id').primaryKey().defaultRandom(),
  projectId:    uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  // null = top-level task. non-null = subtask. One level deep only.
  parentTaskId: uuid('parent_task_id').references((): any => tasks.id, { onDelete: 'cascade' }),
  title:        varchar('title', { length: 500 }).notNull(),
  description:  text('description'),
  status:       taskStatusEnum('status').notNull().default('todo'),
  priority:     priorityEnum('priority'),
  assigneeId:   uuid('assignee_id').references(() => users.id, { onDelete: 'set null' }),
  dueDate:      date('due_date'),
  // NO defaultRandom or DEFAULT 0 — always computed explicitly on insert.
  // On insert: SELECT MAX(position) WHERE project_id=? AND status=? then + 1000.0
  // On drag:   (prevPos + nextPos) / 2
  // Reindex:   when any gap < 0.001, redistribute as 1000, 2000, 3000...
  position:     real('position').notNull(),
  createdBy:    uuid('created_by').notNull().references(() => users.id),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  projectStatusIdx: index('tasks_project_status_idx').on(t.projectId, t.status),
  positionIdx:      index('tasks_position_idx').on(t.projectId, t.status, t.position),
}))

// ── tags ─────────────────────────────────────────────────────────
export const tags = pgTable('tags', {
  id:          uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name:        varchar('name', { length: 100 }).notNull(),
  color:       varchar('color', { length: 7 }).notNull().default('#6366F1'),
})

// ── task_tags ────────────────────────────────────────────────────
export const taskTags = pgTable('task_tags', {
  taskId: uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  tagId:  uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (t) => ({
  pk: primaryKey({ columns: [t.taskId, t.tagId] }),
}))

// ── comments ─────────────────────────────────────────────────────
export const comments = pgTable('comments', {
  id:        uuid('id').primaryKey().defaultRandom(),
  taskId:    uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  authorId:  uuid('author_id').notNull().references(() => users.id),
  content:   text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ── activity_logs ────────────────────────────────────────────────
export const activityLogs = pgTable('activity_logs', {
  id:          uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  projectId:   uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  taskId:      uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }),
  userId:      uuid('user_id').notNull().references(() => users.id),
  action:      activityActionEnum('action').notNull(),
  // e.g. { field: 'status', from: 'todo', to: 'in_progress' }
  meta:        text('meta'),  // JSON stringified — use JSON.parse/stringify
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  workspaceIdx: index('activity_workspace_idx').on(t.workspaceId, t.createdAt),
  taskIdx:      index('activity_task_idx').on(t.taskId),
}))

// ── notifications ────────────────────────────────────────────────
export const notifications = pgTable('notifications', {
  id:        uuid('id').primaryKey().defaultRandom(),
  userId:    uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type:      notifTypeEnum('type').notNull(),
  taskId:    uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  actorId:   uuid('actor_id').notNull().references(() => users.id),
  read:      boolean('read').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userUnreadIdx: index('notif_user_unread_idx').on(t.userId, t.read),
}))

// ── ai_usage ─────────────────────────────────────────────────────
export const aiUsage = pgTable('ai_usage', {
  id:        uuid('id').primaryKey().defaultRandom(),
  userId:    uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  feature:   aiFeatureEnum('feature').notNull(),
  date:      date('date').notNull(),
  callCount: integer('call_count').notNull().default(0),
}, (t) => ({
  uniqueUserDateFeature: uniqueIndex('ai_usage_unique').on(t.userId, t.date, t.feature),
}))

// ── ai_logs ──────────────────────────────────────────────────────
export const aiLogs = pgTable('ai_logs', {
  id:         uuid('id').primaryKey().defaultRandom(),
  userId:     uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  feature:    aiFeatureEnum('feature').notNull(),
  prompt:     text('prompt').notNull(),
  response:   text('response').notNull(),
  latencyMs:  integer('latency_ms').notNull(),
  createdAt:  timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
```

**1.2** Create `apps/server/src/db/index.ts`:
```typescript
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'
import 'dotenv/config'

const sql = neon(process.env.DATABASE_URL!)
export const db = drizzle(sql, { schema })
export type DB = typeof db
```

**1.3** Create `apps/server/drizzle.config.ts`:
```typescript
import { defineConfig } from 'drizzle-kit'
import 'dotenv/config'

export default defineConfig({
  schema:    './src/db/schema.ts',
  out:       './src/db/migrations',
  dialect:   'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
})
```

**1.4** Create `apps/server/src/db/migrate.ts`:
```typescript
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { migrate } from 'drizzle-orm/neon-http/migrator'
import 'dotenv/config'

const sql = neon(process.env.DATABASE_URL!)
const db  = drizzle(sql)

migrate(db, { migrationsFolder: './src/db/migrations' })
  .then(() => { console.log('Migrations applied'); process.exit(0) })
  .catch((e) => { console.error(e); process.exit(1) })
```

**1.5** Generate and run migrations:
```bash
pnpm db:generate   # creates files in src/db/migrations/
pnpm db:migrate    # applies them to Neon
```

Verify in Neon console that all tables exist before proceeding.

**1.6** Add Drizzle kit config:
```bash
pnpm add drizzle-kit --save-dev
```

---

## Phase 2 — Server bootstrap + middleware (IMPLEMENTED)

### Install
```bash
pnpm add zod fastify @fastify/cors @fastify/sensible
pnpm add dotenv
```

### Implementation

**2.1** Config: `apps/server/src/config/index.ts`
- Uses Zod for environment validation
- Different env vars: CLIENT_ORIGIN, GITHUB_CLIENT_ID/SECRET, GOOGLE_CLIENT_ID/SECRET, REDIS_URL

**2.2** CORS: `apps/server/src/plugins/cors.ts`

**2.3** Entry: `apps/server/src/server.ts` - starts the Fastify app

---

## Phase 3 — Auth (IMPLEMENTED with better-auth)

### Install
```bash
pnpm add better-auth better-auth/adapters/drizzle ioredis @better-auth/redis-storage
```

### Implementation

**3.1** Schema: `apps/server/src/db/schema/auth.ts`

Uses better-auth's required tables:
- `user` - better-auth managed (no passwordHash field)
- `session` - with Redis secondary storage
- `account` - for OAuth providers
- `verification` - for email verification

**3.2** Service: `apps/server/src/modules/auth/service.ts`

```typescript
import { redisStorage } from "@better-auth/redis-storage";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { Redis } from "ioredis";
import { config } from "../../config/index.js";
import { db } from "../../db/index.js";
import * as schema from "../../db/schema/index.js";

const redis = new Redis(config.redis.url);

export const auth = betterAuth({
  appName: "Dhruv",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  secondaryStorage: redisStorage({
    client: redis,
  }),
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    github: config.auth.github,
    google: config.auth.google,
  },
  cors: {
    origin: config.cors.origins,
    credentials: config.cors.credentials,
  },
  trustedOrigins: config.cors.origins,
});
```

**3.3** Routes: `apps/server/src/modules/auth/routes.ts`

Proxies all `/api/auth/*` to better-auth's handler:
```typescript
export function registerAuthRoutes(app: FastifyInstance) {
  app.decorate("auth", auth);
  app.decorate("requireAuth", requireAuth);

  app.route({
    method: ["GET", "POST"],
    url: "/api/auth/*",
    handler: handleAuthRequest,
  });

  app.get("/api/me", {
    handler: getSession,
    onRequest: [app.requireAuth],
  });
}
```

**3.4** Controller: `apps/server/src/modules/auth/controller.ts`

- `requireAuth()` - validates session from cookie
- `handleAuthRequest()` - proxies to better-auth handler
- `getSession()` - returns current user

### Steps

**3.1** Create `apps/server/src/modules/auth/tokens.ts`:
```typescript
import { createHash, randomBytes } from 'crypto'
import { SignJWT, jwtVerify } from 'jose'
import { config } from '../../config/index.js'

const ACCESS_SECRET  = new TextEncoder().encode(config.auth.jwtSecret)
const REFRESH_SECRET = new TextEncoder().encode(config.auth.jwtRefreshSecret)

// ── Access token ─────────────────────────────────────────────────
export async function signAccessToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(ACCESS_SECRET)
}

export async function verifyAccessToken(token: string): Promise<{ sub: string }> {
  const { payload } = await jwtVerify(token, ACCESS_SECRET)
  return payload as { sub: string }
}

// ── Refresh token ────────────────────────────────────────────────
export function generateRawToken(): string {
  return randomBytes(48).toString('hex')
}

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

export async function signRefreshToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(REFRESH_SECRET)
}

// For refresh: we use a random token stored as hash in DB,
// not a JWT, to allow individual token revocation.
// generateRawToken() + hashToken() is the pattern.
```

**3.2** Create `apps/server/src/modules/auth/cookies.ts`:
```typescript
import type { FastifyReply, FastifyRequest } from 'fastify'
import { config } from '../../config/index.js'

const COOKIE_NAME = 'refresh_token'
const MAX_AGE_SECS = 7 * 24 * 60 * 60  // 7 days

export function setRefreshCookie(reply: FastifyReply, rawToken: string) {
  const isProd = config.server.host !== 'localhost'
  reply.header('Set-Cookie',
    `${COOKIE_NAME}=${rawToken}; ` +
    `HttpOnly; ` +
    `Path=/; ` +
    `Max-Age=${MAX_AGE_SECS}; ` +
    // SameSite=None requires Secure. Both Vercel and Railway serve HTTPS.
    // In local dev (HTTP), SameSite=Lax is used instead.
    (isProd ? 'Secure; SameSite=None' : 'SameSite=Lax')
  )
}

export function clearRefreshCookie(reply: FastifyReply) {
  reply.header('Set-Cookie',
    `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; ` +
    (config.server.host !== 'localhost' ? 'Secure; SameSite=None' : 'SameSite=Lax')
  )
}

export function getRefreshCookie(request: FastifyRequest): string | undefined {
  const cookieHeader = request.headers.cookie || ''
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`))
  return match?.[1]
}
```

**3.3** Create `apps/server/src/modules/auth/index.ts`:
```typescript
import type { FastifyInstance } from 'fastify'
import type { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
import type { AuthenticatedRequest } from '../../types/fastify.js'

export async function registerAuthRoutes(app: FastifyInstance) {
  app.addHook('onRequest', async (request, reply) => {
    const header = request.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      reply.status(401).send({ error: 'Unauthorized' })
      return
    }
    const token = header.slice(7)
    try {
      const payload = await verifyAccessToken(token)
      ;(request as AuthenticatedRequest).userId = payload.sub
    } catch {
      reply.status(401).send({ error: 'Unauthorized' })
    }
  })
}
```

**3.4** Create `apps/server/src/modules/auth/routes.ts`.

This file handles: register, login, logout, refresh, GET /me.

```typescript
import type { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
import type { AuthenticatedRequest } from '../../types/fastify.js'
import { eq } from 'drizzle-orm'
import { hash, verify } from 'argon2'
import { db } from '../../db/index.js'
import { users, refreshTokens } from '../../db/schema/index.js'
import {
  signAccessToken, generateRawToken, hashToken
} from './tokens.js'
import { setRefreshCookie, clearRefreshCookie, getRefreshCookie } from './cookies.js'

const authRoutes: FastifyPluginAsyncJsonSchemaToTs = async (app) => {
  // ── POST /auth/register ──────────────────────────────────────────
  const registerSchema = {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 255 },
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 8, maxLength: 128 },
    },
    required: ['name', 'email', 'password'],
  } as const

  app.post('/register', { schema: { body: registerSchema } }, async (request, reply) => {
    const { name, email, password } = request.body

    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1)
    if (existing.length > 0) {
      reply.status(409).send({ error: 'Email already in use' })
      return
    }

    const passwordHash = await hash(password, { type: 2 })  // argon2id = type 2

    const [user] = await db.insert(users).values({ name, email, passwordHash }).returning()

    const accessToken  = await signAccessToken(user.id)
    const rawRefresh   = generateRawToken()
    const tokenHash    = hashToken(rawRefresh)
    const expiresAt    = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    await db.insert(refreshTokens).values({ userId: user.id, tokenHash, expiresAt })
    setRefreshCookie(reply, rawRefresh)

    reply.status(201).send({
      accessToken,
      user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl }
    })
  })

  // ── POST /auth/login ─────────────────────────────────────────────
  const loginSchema = {
    type: 'object',
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 1 },
    },
    required: ['email', 'password'],
  } as const

  app.post('/login', { schema: { body: loginSchema } }, async (request, reply) => {
    const { email, password } = request.body

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
    if (!user) {
      reply.status(401).send({ error: 'Invalid credentials' })
      return
    }

    const valid = await verify(user.passwordHash, password)
    if (!valid) {
      reply.status(401).send({ error: 'Invalid credentials' })
      return
    }

    const accessToken = await signAccessToken(user.id)
    const rawRefresh  = generateRawToken()
    const tokenHash   = hashToken(rawRefresh)
    const expiresAt   = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    await db.insert(refreshTokens).values({ userId: user.id, tokenHash, expiresAt })
    setRefreshCookie(reply, rawRefresh)

    reply.send({
      accessToken,
      user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl }
    })
  })

  // ── POST /auth/logout ────────────────────────────────────────────
  app.post('/logout', async (request, reply) => {
    const rawToken = getRefreshCookie(request)
    if (rawToken) {
      const tokenHash = hashToken(rawToken)
      await db.delete(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash))
    }
    clearRefreshCookie(reply)
    reply.send({ ok: true })
  })

  // ── POST /auth/refresh ───────────────────────────────────────────
  app.post('/refresh', async (request, reply) => {
    const rawToken = getRefreshCookie(request)
    if (!rawToken) {
      reply.status(401).send({ error: 'No refresh token' })
      return
    }

    const tokenHash = hashToken(rawToken)
    const [stored] = await db.select().from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash)).limit(1)

    if (!stored || stored.expiresAt < new Date()) {
      clearRefreshCookie(reply)
      reply.status(401).send({ error: 'Refresh token expired' })
      return
    }

    const accessToken = await signAccessToken(stored.userId)
    reply.send({ accessToken })
  })

  // ── GET /auth/me ─────────────────────────────────────────────────
  app.get('/me', async (request: AuthenticatedRequest, reply) => {
    const userId = request.userId
    const [user] = await db.select({
      id: users.id, name: users.name, email: users.email, avatarUrl: users.avatarUrl
    }).from(users).where(eq(users.id, userId)).limit(1)

    if (!user) {
      reply.status(404).send({ error: 'User not found' })
      return
    }
    reply.send({ user })
  })

  // ── PATCH /auth/me ───────────────────────────────────────────────
  const updateMeSchema = {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 255 },
      avatarUrl: { type: 'string', format: 'uri' },
    },
  } as const

  app.patch('/me', { schema: { body: updateMeSchema } }, async (request: AuthenticatedRequest, reply) => {
    const userId = request.userId
    const data = request.body
    if (Object.keys(data).length === 0) {
      reply.status(400).send({ error: 'No fields to update' })
      return
    }

    const [user] = await db.update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning({ id: users.id, name: users.name, email: users.email, avatarUrl: users.avatarUrl })

    reply.send({ user })
  })
}

export default authRoutes
```

**3.5** Mount the auth router in `src/app.ts`:
```typescript
import { registerAuthRoutes } from './modules/auth/index.js'
// ...
registerAuthRoutes(app)
```

**3.6** Test all auth endpoints manually with curl or a REST client before
moving to the next phase:
- `POST /api/auth/register` — creates user, returns accessToken + cookie
- `POST /api/auth/login` — returns accessToken + cookie
- `GET /api/auth/me` with Bearer token — returns user
- `POST /api/auth/refresh` with cookie — returns new accessToken
- `POST /api/auth/logout` — clears cookie, deletes row

---

## Phase 4 — Workspaces (IMPLEMENTED)

### Implementation

Uses service layer pattern:
- `modules/workspace/service.ts` - business logic
- `modules/workspace/routes.ts` - HTTP endpoints
- `modules/workspace/index.ts` - exports

All routes protected by better-auth session validation.

**Implemented endpoints:**
- `GET /workspaces`
- `POST /workspaces`
- `GET /workspaces/:id`
- `PATCH /workspaces/:id`
- `DELETE /workspaces/:id`
- `GET /workspaces/:id/members`
- `POST /workspaces/:id/members`
- `DELETE /workspaces/:id/members/:userId`

**Service helper functions:**
- `isActiveMember(workspaceId, userId)`
- `isOwner(workspaceId, userId)`
- `isAdminOrOwner(workspaceId, userId)`

---

## Phase 5 — Workspace Invitations (IMPLEMENTED)

### Install
```bash
pnpm add resend
```

### Implementation

**5.1** Email: `apps/server/src/utils/email.ts`

**5.2** Routes are part of workspace module:
- `POST /workspaces/:id/invitations` — admin+ only
- `GET /workspaces/:id/invitations` — admin+ only
- `DELETE /workspaces/:id/invitations/:invId` — admin+ only
- `GET /invitations/:token` — public
- `POST /invitations/:token/accept` — authenticated

Uses `workspaceInvite` and `workspaceInvitation` tables (both exist - cleanup needed)

---

## Phase 6 — Projects (IMPLEMENTED)

### Implementation

Uses service layer pattern:
- `modules/project/service.ts` - business logic
- `modules/project/routes.ts` - HTTP endpoints
- `modules/project/index.ts` - exports

**Implemented endpoints:**
- `GET /workspaces/:workspaceId/projects`
- `POST /workspaces/:workspaceId/projects`
- `GET /projects/:id`
- `PATCH /projects/:id`
- `DELETE /projects/:id`
- `GET /projects/:id/members`
- `POST /projects/:id/members`
- `DELETE /projects/:id/members/:userId`

---

## Phase 7 — Tasks (PARTIAL)

### Implementation

Uses service layer pattern:
- `modules/task/service.ts` - business logic
- `modules/task/routes.ts` - HTTP endpoints
- `modules/task/index.ts` - exports

**Implemented endpoints:**
- `GET /projects/:projectId/tasks`
- `POST /projects/:projectId/tasks`
- `GET /tasks/:id`
- `PATCH /tasks/:id`

**NOT YET IMPLEMENTED:**
- Position management (nextPosition, reindexColumn)
- Subtask handling
- Task tags
- Activity logs

---

## Phase 8 — Comments (IMPLEMENTED)

### Implementation

**8.1** Comments: `modules/comment/`
- `service.ts` - business logic
- `routes.ts` - HTTP endpoints
- `index.ts` - exports

**Implemented endpoints:**
- `GET /tasks/:taskId/comments`
- `POST /tasks/:taskId/comments`
- `PATCH /comments/:id`
- `DELETE /comments/:id`

⏳ **NOT YET IMPLEMENTED:**
- Tags + Task Tags
- Notifications
- User search

---

## Phase 9 — Dashboard (NOT YET IMPLEMENTED)

### To Implement

Create `modules/dashboard/routes.ts`:
```
GET /dashboard
{
  myTasks: Task[]
  upcomingDeadlines: Task[]
  projectStatusCounts: {...}
  recentActivity: ActivityLog[]
}
```

Requires activity_logs table to be created first.

---

## Phase 10 — AI features (NOT YET IMPLEMENTED)

### Install
```bash
pnpm add @anthropic-ai/sdk
```

### To Implement

**Requires creating tables first:**
- `ai_usage` - rate limiting
- `ai_logs` - logging

**10.1** Create `src/lib/ai.ts`:
```typescript
import Anthropic from '@anthropic-ai/sdk'
import { env } from './env'

export const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
export const MODEL = 'claude-sonnet-4-20250514'
```

**10.2** Create `src/lib/rateLimit.ts` - atomic upsert for rate limiting

**10.3** Create `modules/ai/routes.ts`:
- `POST /ai/breakdown` - break task into subtasks
- `POST /ai/priority` - suggest priority
- `POST /ai/parse-task` - natural language to task
- `GET /ai/usage` - remaining calls

---

## Phase 11 — Final wiring + hardening (NOT YET IMPLEMENTED)

### To Do

- [ ] Add global request ID hook
- [ ] Audit all routes for auth
- [ ] Verify activity logging
- [ ] End-to-end test

---

## Phase 12 — Deploy to Railway (NOT YET IMPLEMENTED)

### To Do

- [ ] Configure Railway deployment
- [ ] Set up environment variables
- [ ] Test production

### Steps

**12.1** Create `apps/server/Dockerfile`:
```dockerfile
FROM node:22-alpine
RUN corepack enable
WORKDIR /app
COPY pnpm-workspace.yaml package.json ./
COPY apps/server/package.json ./apps/server/
RUN pnpm install --frozen-lockfile
COPY . .
WORKDIR /app/apps/server
RUN pnpm build
CMD ["node", "dist/server.js"]
```

**12.2** Update `apps/server/tsconfig.json` to emit JS for production:
Add `"moduleResolution": "Node16"` and ensure `outDir` is `./dist`.

**12.3** Add a `start` script to `apps/server/package.json`:
```json
"start": "node dist/index.js"
```

**12.4** In Railway:
- Create a new project, connect the GitHub repo
- Set all env vars from `.env.example` (use production values)
- Set `DATABASE_URL` from Neon production database
- Set `FRONTEND_URL` to the Vercel URL (add it after frontend is deployed)
- Expose port 3000

**12.5** After deployment, run migrations against production DB:
```bash
DATABASE_URL=<prod_url> pnpm db:migrate
```

---

## File structure when complete

```
apps/server/src/
├── server.ts                 ← Fastify server bootstrap
├── app.ts                    ← Fastify app with plugins and routes
├── db/
│   ├── index.ts              ← Drizzle client
│   ├── schema/               ← Table definitions per entity
│   └── migrations/           ← Generated SQL files (committed)
├── modules/                  ← Feature modules
│   ├── auth/
│   │   ├── index.ts          ← Module exports
│   │   ├── routes.ts         ← HTTP routes
│   │   └── service.ts        ← Business logic
│   ├── workspace/
│   │   ├── index.ts
│   │   ├── routes.ts
│   │   └── service.ts
│   ├── project/
│   │   ├── index.ts
│   │   ├── routes.ts
│   │   └── service.ts
│   ├── task/
│   │   ├── index.ts
│   │   ├── routes.ts
│   │   └── service.ts
│   └── comment/
│       ├── index.ts
│       ├── routes.ts
│       └── service.ts
├── plugins/
│   └── cors.ts               ← CORS plugin
├── config/
│   └── index.ts              ← Validated env vars (Zod)
└── types/
    └── fastify.d.ts          ← Fastify type extensions
```

---

## Quick reference — most common mistakes

| Mistake | Correct approach |
|---|---|
| Storing raw refresh token in DB | Always `hashToken(raw)` before inserting |
| `DEFAULT 0` on position | Use `nextPosition()` — always compute explicitly |
| SELECT then UPDATE for rate limit | Atomic `INSERT ... ON CONFLICT DO UPDATE RETURNING` |
| Returning `passwordHash` in responses | Always explicitly select only safe fields |
| `SameSite=Strict` on the cookie | Must be `SameSite=None` in prod (cross-origin) |
| Creating subtasks before parent | Save parent first, get ID, then bulk-insert subtasks |
| Hardcoding `claude-opus` or older model strings | Always use `claude-sonnet-4-6` |
| Catching all errors silently | Log the error, return 500 with generic message |
| Missing `credentials: true` in CORS | Without this, cookies are never sent cross-origin |
| Forgetting to register plugins | Fastify plugins must be registered with `app.register()` |
