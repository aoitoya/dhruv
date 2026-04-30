# Tags + Task Tags Implementation Plan

## Goal
Implement tags and task tags functionality per PLAN.md Phase 7 (tasks section).

## Scope
- Database schema for `tags` and `task_tags` tables
- Backend API routes for CRUD operations on tags
- Association/disassociation of tags with tasks
- Bruno API docs for new endpoints

## Schema (`apps/server/src/db/schema/`)

### tags table
- `id` - text() (UUID via defaultRandom())
- `workspaceId` - text(), foreign key to workspaces
- `name` - text(), NOT NULL
- `color` - text(), NOT NULL, default '#6366F1'
- `createdAt` - timestamptz (per PLAN.md rule)
- `updatedAt` - timestamptz
- Unique constraint: (workspaceId, name) - no duplicate tag names per workspace

### task_tags table
- `taskId` - text(), foreign key to tasks
- `tagId` - text(), foreign key to tags
- Primary key: (taskId, tagId)

**Note:** Use `text()` for IDs (not uuid()), matching better-auth codebase convention.

## Implementation Steps

### Step 1: Database Schema
1. Create `apps/server/src/db/schema/tags.ts` with:
   - `tags` table definition
   - `taskTags` junction table definition
2. Update `apps/server/src/db/schema/index.ts` to export new tables
3. Generate and run migration

### Step 2: Tags Module
Use class-based service pattern matching existing codebase (see `workspaceService`, `taskService`).

1. Create `apps/server/src/modules/tag/service.ts` with `TagService` class:
   - `create(workspaceId, name, color)` → returns created tag
   - `getByWorkspace(workspaceId)` → returns tag[]
   - `getById(tagId)` → returns tag or null
   - `update(tagId, data)` → returns updated tag
   - `delete(tagId)` → deletes tag
   - `isAdminOrOwner(workspaceId, userId)` → for auth checks
2. Create `apps/server/src/modules/tag/routes.ts`:
   - `GET /workspaces/:workspaceId/tags`
   - `POST /workspaces/:workspaceId/tags`
   - `PATCH /tags/:id`
   - `DELETE /tags/:id`
3. Create `apps/server/src/modules/tag/index.ts` exports register function
4. **Register routes in `app.ts`:** Add `registerTagRoutes(app)` import and call

### Step 3: Task-Tag Association
1. Update service/routes to handle association:
   - `POST /tasks/:taskId/tags` - add tags to task
   - `DELETE /tasks/:taskId/tags/:tagId` - remove tag from task
   - `GET /tasks/:taskId/tags` - get tags for task

### Step 4: Bruno Docs
1. Add new Bruno docs for all tag endpoints

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /workspaces/:workspaceId/tags | List all tags in workspace |
| POST | /workspaces/:workspaceId/tags | Create new tag |
| PATCH | /tags/:id | Update tag |
| DELETE | /tags/:id | Delete tag |
| GET | /tasks/:taskId/tags | Get tags for task |
| POST | /tasks/:taskId/tags | Add tags to task |
| DELETE | /tasks/:taskId/tags/:tagId | Remove tag from task |

## Auth Checks
- Create/Update/Delete tags: `workspaceService.isAdminOrOwner(workspaceId, userId)`
- Assign/Remove tags on tasks: `workspaceService.isActiveMember(workspaceId, userId)`
- List tags: `workspaceService.isActiveMember(workspaceId, userId)`

Use existing service helpers from `workspaceService`.

## Verification
- `pnpm db:generate` + `pnpm db:migrate` → schema created
- Test endpoints via Bruno or curl:
  ```
  GET /api/workspaces/:workspaceId/tags → returns tags[]
  POST /api/workspaces/:workspaceId/tags {name, color} → creates tag
  PATCH /api/tags/:id {name, color} → updates tag
  DELETE /api/tags/:id → deletes tag
  POST /api/tasks/:taskId/tags {tagIds: []} → associates tags
  DELETE /api/tasks/:taskId/tags/:tagId → removes association
  GET /api/tasks/:taskId/tags → returns task's tags
  ```

## Constraints
- Tags belong to a workspace (not project)
- Tags can be assigned to tasks across any project in the workspace
- Admin/Owner can create/update/delete tags
- Any workspace member can assign/remove tags from tasks

## Out of Scope
- Notifications (Phase 9)
- Activity Logs (Phase 9)
- AI Features (Phase 10)