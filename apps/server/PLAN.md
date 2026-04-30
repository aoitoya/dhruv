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
- **Auth:** better-auth with Redis storage
- **AI:** Anthropic SDK (`claude-sonnet-4-6`)
- **Email:** Resend
- **Validation:** Zod with Fastify JSON Schema type provider

The backend lives at `apps/server/` inside a pnpm monorepo. Shared types
live in `packages/shared/`.

---

## Absolute rules — never violate these

1. **Install deps one phase at a time.** Each phase lists exactly what to install.
2. **Never store raw tokens.** Refresh tokens and invite tokens are always
   SHA-256 hashed before writing to the DB. The raw token goes to the client only.
3. **Never store passwords in plaintext.** Always use argon2id.
4. **Never use `DEFAULT 0` on `tasks.position`.** Always compute it explicitly.
5. **AI rate limit uses atomic upsert** — never SELECT then UPDATE separately.
6. **Cookie must be `SameSite=None; Secure; HttpOnly`** in production.
   Use `SameSite=Lax` in local development (HTTP).
7. **Validate every route body** with Zod before touching the database.
8. **All timestamps are `timestamptz`** (UTC with timezone).
9. **Subtasks must be created after their parent task** — never before.
10. **Commit the `migrations/` folder.** It is not gitignored.

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

## Phase 1 — Database schema + migrations

### Install (Phase 1 only)
```bash
pnpm add drizzle-orm @neondatabase/serverless dotenv
pnpm add drizzle-kit --save-dev
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

## Phase 2 — Server bootstrap + middleware

### Install (Phase 2 only)
```bash
pnpm add zod fastify @fastify/cors @fastify/sensible
pnpm add dotenv
```

### Steps

**2.1** Create `apps/server/src/lib/env.ts` — centralise env access with
validation so missing vars fail loudly at startup, not silently at runtime:
```typescript
import 'dotenv/config'

function require(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required env var: ${key}`)
  return val
}

export const env = {
  DATABASE_URL:      require('DATABASE_URL'),
  JWT_SECRET:        require('JWT_SECRET'),
  JWT_REFRESH_SECRET:require('JWT_REFRESH_SECRET'),
  ANTHROPIC_API_KEY: require('ANTHROPIC_API_KEY'),
  RESEND_API_KEY:    require('RESEND_API_KEY'),
  CLOUDINARY_URL:    require('CLOUDINARY_URL'),
  FRONTEND_URL:      require('FRONTEND_URL'),
  NODE_ENV:          process.env.NODE_ENV || 'development',
  PORT:              Number(process.env.PORT) || 3000,
  isProd:            process.env.NODE_ENV === 'production',
}
```

**2.2** Create `apps/server/src/plugins/cors.ts`:
```typescript
import cors from '@fastify/cors'
import type { FastifyInstance } from 'fastify'
import { env } from '../config/index.js'

// Cross-origin: Vercel frontend -> Railway backend
// SameSite=None requires Secure, which requires HTTPS.
// Both Vercel and Railway use HTTPS in production, so this is safe.
// Local dev runs on HTTP, so SameSite=Lax is used instead.
export async function registerCors(app: FastifyInstance) {
  await app.register(cors, {
    origin: env.FRONTEND_URL,
    credentials: true,  // required for httpOnly cookies to be sent cross-origin
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
}
```

**2.3** Create `apps/server/src/plugins/error.ts`:
```typescript
import type { FastifyInstance } from 'fastify'

export async function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((err, request, reply) => {
    console.error(err)
    reply.status(500).send({ error: 'Internal server error' })
  })
}
```

**2.4** Rewrite `apps/server/src/index.ts` as the main app with all
plugins applied:
```typescript
import Fastify from 'fastify'
import { registerCors } from './plugins/cors'
import { env } from './config/index.js'

const app = Fastify({
  logger: true,
})

// Register plugins
registerCors(app)

// Routes will be mounted here in later phases

app.get('/health', async () => ({ ok: true, env: env.NODE_ENV }))

app.setErrorHandler((err, request, reply) => {
  console.error(err)
  reply.status(500).send({ error: 'Internal server error' })
})

app.setNotFoundHandler((request, reply) => {
  reply.status(404).send({ error: 'Not found' })
})

app.listen({ port: env.PORT, host: '0.0.0.0' }, (err) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Dhruv server running on http://localhost:${env.PORT}`)
})

export default app
```

Run `pnpm dev` and confirm `/health` responds.

---

## Phase 3 — Auth

### Install (Phase 3 only)
```bash
pnpm add jose argon2
```

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

## Phase 4 — Workspaces

### Install (Phase 4 only)
```bash
# No new dependencies needed for this phase
```

### Steps

**4.1** Create `apps/server/src/modules/workspace/guards.ts` — reusable workspace/project
membership checks that will be used across many routes:
```typescript
import { eq, and } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { workspaceMembers, projectMembers } from '../../db/schema/index.js'
import type { AuthenticatedRequest } from '../../types/fastify.js'

export async function getWorkspaceMembership(userId: string, workspaceId: string) {
  const [member] = await db.select()
    .from(workspaceMembers)
    .where(and(
      eq(workspaceMembers.userId, userId),
      eq(workspaceMembers.workspaceId, workspaceId)
    ))
    .limit(1)
  return member || null
}

export async function requireWorkspaceMember(request: AuthenticatedRequest, workspaceId: string) {
  const userId = request.userId
  const member = await getWorkspaceMembership(userId, workspaceId)
  if (!member) throw { statusCode: 403, message: 'Not a workspace member' }
  return member
}

export async function requireWorkspaceAdmin(request: AuthenticatedRequest, workspaceId: string) {
  const userId = request.userId
  const member = await getWorkspaceMembership(userId, workspaceId)
  if (!member) throw { statusCode: 403, message: 'Not a workspace member' }
  if (member.role === 'member') throw { statusCode: 403, message: 'Insufficient permissions' }
  return member
}

export async function requireWorkspaceOwner(request: AuthenticatedRequest, workspaceId: string) {
  const userId = request.userId
  const member = await getWorkspaceMembership(userId, workspaceId)
  if (!member || member.role !== 'owner') throw { statusCode: 403, message: 'Owner only' }
  return member
}

export async function requireProjectMember(request: AuthenticatedRequest, projectId: string) {
  const userId = request.userId
  const [member] = await db.select()
    .from(projectMembers)
    .where(and(eq(projectMembers.userId, userId), eq(projectMembers.projectId, projectId)))
    .limit(1)
  if (!member) throw { statusCode: 403, message: 'Not a project member' }
  return member
}
```

**4.2** Create `apps/server/src/modules/workspace/routes.ts`.

Implement all workspace endpoints:
- `GET /workspaces` — list all workspaces the user belongs to
- `POST /workspaces` — create, auto-insert as owner in workspace_members
- `GET /workspaces/:id` — detail + member list (members only)
- `PATCH /workspaces/:id` — update (admin+)
- `DELETE /workspaces/:id` — delete (owner only)
- `GET /workspaces/:id/members` — list members with roles
- `PATCH /workspaces/:id/members/:userId` — change role (owner only)
- `DELETE /workspaces/:id/members/:userId` — remove member (admin+, cannot remove owner)
- `GET /workspaces/:id/activity` — recent activity_logs for workspace

All routes protected by auth hook. Role checks use guards from 4.1.

After creating a workspace, immediately insert the creator into
`workspace_members` with `role: 'owner'` in the same transaction if possible,
otherwise in a follow-up insert.

**4.3** Mount in `src/app.ts`:
```typescript
import { registerWorkspaceRoutes } from './modules/workspace/index.js'
// Inside appRoutes plugin:
app.register(registerWorkspaceRoutes)
```

---

## Phase 5 — Workspace Invitations

### Install (Phase 5 only)
```bash
pnpm add resend
```

### Steps

**5.1** Create `apps/server/src/lib/email.ts`:
```typescript
import { Resend } from 'resend'
import { env } from './env'

const resend = new Resend(env.RESEND_API_KEY)

export async function sendInviteEmail({
  to,
  inviterName,
  workspaceName,
  role,
  rawToken,
}: {
  to: string
  inviterName: string
  workspaceName: string
  role: string
  rawToken: string
}) {
  const link = `${env.FRONTEND_URL}/invite/${rawToken}`

  await resend.emails.send({
    from:    'Dhruv <no-reply@yourdomain.com>',  // update after adding domain in Resend
    to,
    subject: `${inviterName} invited you to ${workspaceName} on Dhruv`,
    html: `
      <p>Hi,</p>
      <p><strong>${inviterName}</strong> has invited you to join
         <strong>${workspaceName}</strong> on Dhruv as a <strong>${role}</strong>.</p>
      <p><a href="${link}">Accept invitation</a></p>
      <p>This link expires in 48 hours.</p>
      <p style="color:#888;font-size:12px">If you did not expect this, ignore this email.</p>
    `,
  })
}
```

**5.2** Create `apps/server/src/routes/invitations.ts`.

Implement:
- `POST /workspaces/:id/invitations` — admin+ only. Generate raw token,
  hash it, insert into workspace_invitations, send email via Resend.
  Token expires in 48 hours.
  Check for duplicate pending invite (same email + workspace) and return 409.
- `GET /workspaces/:id/invitations` — admin+ only. List pending invitations.
- `DELETE /workspaces/:id/invitations/:invId` — admin+ only. Set status to
  'expired' or delete row.
- `GET /invitations/:token` — **PUBLIC** (no auth). Hash the incoming token,
  look up in DB, check status === 'pending' and expiresAt > now. Return
  workspace name, inviter name, and role. Return 404 if not found or expired.
- `POST /invitations/:token/accept` — **AUTHENTICATED**. Hash token, find
  record. If expired or already accepted, return 410. Insert into
  workspace_members. Update invitation status to 'accepted'. Return workspace.

**5.3** Mount:
```typescript
import { registerInvitationRoutes } from './modules/invitations/index.js'
app.register(registerInvitationRoutes, { prefix: '/api' })
```

---

## Phase 6 — Projects

### Install (Phase 6 only)
```bash
# No new dependencies needed
```

### Steps

**6.1** Create `apps/server/src/routes/projects.ts`.

Implement:
- `GET /workspaces/:wId/projects` — list projects in workspace the user has
  access to (is in project_members or is workspace admin/owner)
- `POST /workspaces/:wId/projects` — admin+ only. Auto-add creator to
  project_members.
- `GET /projects/:id` — project detail. Check user is project member or
  workspace admin/owner.
- `PATCH /projects/:id` — update name, description, color, status, dueDate
- `DELETE /projects/:id` — admin+ only
- `GET /projects/:id/members` — list project members (needed for assignee picker)
- `POST /projects/:id/members` — add a workspace member to project. Check
  that the user being added is actually a workspace member first.
- `DELETE /projects/:id/members/:userId` — remove from project

**6.2** Mount:
```typescript
import { registerProjectRoutes } from './modules/project/index.js'
app.register(registerProjectRoutes, { prefix: '/api' })
```

---

## Phase 7 — Tasks

### Install (Phase 7 only)
```bash
# No new dependencies needed
```

### Steps

**7.1** Create `apps/server/src/lib/position.ts`:
```typescript
import { eq, and, max } from 'drizzle-orm'
import { db } from '../db'
import { tasks } from '../db/schema'

// Computes the next position for a new task in a given project+status column.
// Gap of 1000.0 leaves room for insertions without immediate reindex.
export async function nextPosition(projectId: string, status: string): Promise<number> {
  const result = await db
    .select({ maxPos: max(tasks.position) })
    .from(tasks)
    .where(and(
      eq(tasks.projectId, projectId),
      eq(tasks.status, status as any),
      // Only top-level tasks have positions (not subtasks)
      // parentTaskId IS NULL handled below if needed
    ))

  const current = result[0]?.maxPos ?? 0
  return current + 1000.0
}

// Reindex all tasks in a column when precision degrades.
// Call this if any gap < 0.001 is detected.
export async function reindexColumn(projectId: string, status: string): Promise<void> {
  const columnTasks = await db.select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.projectId, projectId), eq(tasks.status, status as any)))
    .orderBy(tasks.position)

  for (let i = 0; i < columnTasks.length; i++) {
    await db.update(tasks)
      .set({ position: (i + 1) * 1000.0 })
      .where(eq(tasks.id, columnTasks[i].id))
  }
}
```

**7.2** Create `apps/server/src/routes/tasks.ts`.

Implement:
- `GET /projects/:pId/tasks` — list tasks. Query params: `status`, `priority`,
  `assigneeId`, `sort` (dueDate|priority). Exclude subtasks from list view
  (where `parentTaskId IS NULL`). Include tags.
- `POST /projects/:pId/tasks` — create task. Compute position with
  `nextPosition()`. Validate assigneeId is a project member if provided.
  Write to activity_logs: action 'created'. If assigneeId is set and differs
  from createdBy, create a notification (type: 'assigned').
- `GET /tasks/:id` — task detail. Include subtasks (tasks where parentTaskId =
  id), tags, comments (most recent first), and activity_logs for this task.
- `PATCH /tasks/:id` — update any field. If status changes, write activity_log
  with meta `{field:'status', from: old, to: new}`. If assignee changes, write
  activity_log and notification.
- `DELETE /tasks/:id` — cascades handled by DB. Write activity_log.
- `PATCH /tasks/:id/position` — body `{ position: number }`. Validate position
  > 0. Check if min gap in column drops below 0.001 and call reindexColumn if so.

**7.3** Mount:
```typescript
import { registerTaskRoutes } from './modules/task/index.js'
app.register(registerTaskRoutes, { prefix: '/api' })
```

---

## Phase 8 — Tags + Comments + Notifications

### Install (Phase 8 only)
```bash
# No new dependencies needed
```

### Steps

**8.1** Create `apps/server/src/routes/tags.ts`:
- `GET /workspaces/:wId/tags`
- `POST /workspaces/:wId/tags`
- `PATCH /tags/:id`
- `DELETE /tags/:id`

Tags are workspace-scoped. Check workspace membership on all operations.
On tag-task association, validate task belongs to a project in the workspace.

**8.2** Create `apps/server/src/routes/comments.ts`:
- `GET /tasks/:taskId/comments` — chronological order (oldest first)
- `POST /tasks/:taskId/comments` — creates comment. Writes activity_log
  (action: 'commented'). Creates notification for task assignee if they
  are not the comment author.
- `PATCH /comments/:id` — author only. Update content + updatedAt.
- `DELETE /comments/:id` — author only.

**8.3** Create `apps/server/src/routes/notifications.ts`:
- `GET /notifications` — all for current user. Query param `unread=true`.
  Order by createdAt DESC. Limit 50.
- `PATCH /notifications/:id/read` — mark one as read. Verify ownership.
- `PATCH /notifications/read-all` — mark all as read for current user.

**8.4** Create `apps/server/src/routes/users.ts`:
- `GET /users/search?q=&workspaceId=` — search users who are members of the
  workspace. Used by assignee picker and @mention autocomplete. Match on name
  or email prefix. Return at most 10 results. Strip passwordHash from response.

**8.5** Mount all four in `src/app.ts`:
```typescript
import { registerTagRoutes } from './modules/tag/index.js'
import { registerCommentRoutes } from './modules/comment/index.js'
import { registerNotificationRoutes } from './modules/notification/index.js'
import { registerUserRoutes } from './modules/user/index.js'

app.register(registerTagRoutes, { prefix: '/api' })
app.register(registerCommentRoutes, { prefix: '/api' })
app.register(registerNotificationRoutes, { prefix: '/api' })
app.register(registerUserRoutes, { prefix: '/api' })
```

---

## Phase 9 — Dashboard

### Install (Phase 9 only)
```bash
# No new dependencies needed
```

### Steps

**9.1** Create `apps/server/src/routes/dashboard.ts`:

`GET /dashboard` — aggregated view for the current user:
```
{
  myTasks: Task[]          // assigned to me, status != done, across all workspaces
  upcomingDeadlines: Task[] // dueDate within next 14 days, status != done
  projectStatusCounts: {
    projectId: string
    projectName: string
    todo: number
    inProgress: number
    inReview: number
    done: number
  }[]
  recentActivity: ActivityLog[]  // last 20 across all user's workspaces
}
```

Run these as separate queries — do not try to do it in one giant JOIN, it is
not worth the complexity for a portfolio project.

**9.2** Mount:
```typescript
import { registerDashboardRoutes } from './modules/dashboard/index.js'
app.register(registerDashboardRoutes, { prefix: '/api/dashboard' })
```

---

## Phase 10 — AI features

### Install (Phase 10 only)
```bash
pnpm add @anthropic-ai/sdk
```

### Steps

**10.1** Create `apps/server/src/lib/ai.ts` — the central AI service:
```typescript
import Anthropic from '@anthropic-ai/sdk'
import { env } from './env'

export const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
export const MODEL = 'claude-sonnet-4-6' as const
export const MAX_TOKENS = 1024
```

**10.2** Create `apps/server/src/lib/rateLimit.ts`:
```typescript
import { sql } from 'drizzle-orm'
import { db } from '../db/index.js'

const DAILY_LIMIT = 20

// Atomic upsert — NOT a SELECT then UPDATE.
// Returns the new call_count after increment.
// If count > DAILY_LIMIT, the caller should return 429.
export async function incrementAiUsage(
  userId: string,
  feature: 'breakdown' | 'priority' | 'parse'
): Promise<number> {
  const today = new Date().toISOString().slice(0, 10)  // YYYY-MM-DD

  const result = await db.execute(sql`
    INSERT INTO ai_usage (id, user_id, feature, date, call_count)
    VALUES (gen_random_uuid(), ${userId}, ${feature}, ${today}, 1)
    ON CONFLICT (user_id, date, feature)
    DO UPDATE SET call_count = ai_usage.call_count + 1
    RETURNING call_count
  `)

  return (result.rows[0] as any).call_count as number
}

export async function getRemainingCalls(userId: string, feature: string): Promise<number> {
  const today = new Date().toISOString().slice(0, 10)
  const result = await db.execute(sql`
    SELECT call_count FROM ai_usage
    WHERE user_id = ${userId} AND feature = ${feature} AND date = ${today}
  `)
  const used = (result.rows[0] as any)?.call_count ?? 0
  return Math.max(0, DAILY_LIMIT - used)
}

export async function logAiCall(params: {
  userId: string
  feature: 'breakdown' | 'priority' | 'parse'
  prompt: string
  response: string
  latencyMs: number
}) {
  await db.execute(sql`
    INSERT INTO ai_logs (id, user_id, feature, prompt, response, latency_ms, created_at)
    VALUES (gen_random_uuid(), ${params.userId}, ${params.feature},
            ${params.prompt}, ${params.response}, ${params.latencyMs}, NOW())
  `)
}
```

**10.3** Create `apps/server/src/routes/ai.ts`.

Implement three endpoints:

**`POST /ai/breakdown`**
- Body: `{ taskId: string, title: string, description: string }`
- Check rate limit (increment, reject if > 20)
- System prompt: see spec section 4.2
- Parse JSON response carefully — wrap in try/catch, return 500 if invalid JSON
- Do NOT create subtasks here. Return the array to the frontend.
  The frontend will call PATCH /tasks (create task first if needed), then
  POST /projects/:id/tasks for each accepted subtask.
- Log to ai_logs

**`POST /ai/priority`**
- Body: `{ title, description, dueDate?, assigneeId? }`
- If assigneeId provided, fetch their current open task count from DB
- Check rate limit
- Return `{ priority: 'critical'|'high'|'medium'|'low', reason: string }`
- Log to ai_logs

**`POST /ai/parse-task`**
- Body: `{ input: string, projectId: string }`
- Fetch project members (id + name) from DB — inject into system prompt
- Inject today's date into system prompt
- Check rate limit
- Return `{ title, assigneeId, priority, dueDate }` — all fields nullable
- If Claude returns an assignee name not in the member list, set assigneeId to null
- Log to ai_logs

**`GET /ai/usage`**
- Return remaining calls for each feature today:
  `{ breakdown: number, priority: number, parse: number }`

All AI endpoints: apply `authMiddleware`. On any Anthropic API error, catch
and return `{ error: 'AI service temporarily unavailable' }` with status 503.
Never let an AI error crash the server.

**10.4** Mount:
```typescript
import { registerAiRoutes } from './modules/ai/index.js'
app.register(registerAiRoutes, { prefix: '/api/ai' })
```

---

## Phase 11 — Final wiring + hardening

### Install (Phase 11 only)
```bash
# No new dependencies needed
```

### Steps

**11.1** Add a global request ID to every response for debugging:
```typescript
import type { FastifyInstance } from 'fastify'

export async function registerRequestId(app: FastifyInstance) {
  app.addHook('onRequest', async (request) => {
    request.id = request.id || crypto.randomUUID()
  })
}
```

**11.2** Add a 404 handler for unmatched API routes:
```typescript
app.setNotFoundHandler((request, reply) => {
  reply.status(404).send({ error: 'Not found' })
})
```

**11.3** Audit every route file — verify:
- [ ] Every route has auth hook applied (except public ones)
- [ ] Every POST/PATCH has JSON schema validation applied
- [ ] No route returns `passwordHash` in any user object
- [ ] All DB queries use parameterised values (no string concatenation)
- [ ] Activity log is written for: task created, task status changed,
      task assigned, comment added
- [ ] Notification is created for: task assigned (to assignee),
      comment added (to task assignee if different from commenter)

**11.4** Environment validation — confirm `src/lib/env.ts` is imported in
`src/index.ts` before anything else. This ensures the server fails loudly
at startup if any env var is missing, rather than failing silently mid-request.

**11.5** Test the complete flow end-to-end:
1. Register two users (A and B)
2. A creates a workspace
3. A invites B by email
4. B accepts invitation
5. A creates a project and adds B to it
6. A creates a task, assigns to B
7. Verify B receives a notification
8. B adds a comment — verify activity log entry
9. Call `POST /ai/breakdown` — verify subtask array returned
10. Call `POST /ai/parse-task` — verify date resolved and assignee matched
11. Call `POST /ai/usage` 21 times for same feature — verify 22nd returns 429

---

## Phase 12 — Deploy to Railway

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
