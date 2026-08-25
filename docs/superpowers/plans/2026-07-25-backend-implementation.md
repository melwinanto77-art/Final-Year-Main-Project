# Conscious Orbit Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete `server/` backend (Express 5 + TypeScript + Prisma/PostgreSQL) for The Conscious Orbit: two state machines, 10 business-intelligence modules, dual-provider LLM adapter, SpyFu stub, JWT auth — per the approved spec `docs/superpowers/specs/2026-07-25-backend-design.md`.

**Architecture:** Layered Express app (`routes → controllers → services → prisma`) in a self-contained `server/` folder. Hybrid storage: uniform `ProjectModule` rows with Zod-validated JSONB `data` for modules 1–9, relational `Objective`/`KeyResult` tables for module 10. All calculators are pure functions, unit-tested first (TDD). Integration tests run via Supertest against the real Dockerized Postgres.

**Tech Stack:** Node 20+, Express 5, TypeScript (strict, CommonJS), Prisma 6 + PostgreSQL 16 (Docker), Zod, jsonwebtoken + bcryptjs, `@anthropic-ai/sdk`, `openai`, Vitest + Supertest.

## Global Constraints

- **NEVER modify any existing file outside `server/` and `docs/`** — no edits to `src/`, `index.html`, `vite.config.js`, root `package.json`. The frontend must remain byte-identical.
- All commands run from `C:\Users\kewin\Documents\the-conscious-orbit\server` unless stated otherwise (the folder is created in Task 1).
- API port **4000**; Postgres on host port **5433** (user `orbit`, password `orbit`, db `conscious_orbit`, test db `conscious_orbit_test`).
- Error envelope everywhere: `{ error: { code, message, details? } }`.
- Anthropic model is exactly `claude-opus-5`; OpenAI model is exactly `gpt-4o`.
- Lifecycle order: `RECEIVED → PENDING → PROCESSED → PUBLISHED`; action pairing RECEIVED↔SCRUMING, PENDING↔REQUIREMENT, PROCESSED↔MAPPING, PUBLISHED↔DELIVERED.
- Commit after every task from the **repo root** with the exact message given in the task (all end with the Co-Authored-By line: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`).
- Windows host: shell commands in tasks are Git-Bash compatible (`npm`, `npx`, `docker compose` all work as written).

## File Map (what exists when done)

```
server/
  package.json  tsconfig.json  vitest.config.ts  docker-compose.yml  .env.example  .env  .gitignore
  docker/init.sql
  prisma/schema.prisma  prisma/seed.ts
  src/index.ts  src/app.ts
  src/config/env.ts
  src/lib/prisma.ts
  src/middleware/errors.ts  src/middleware/auth.ts
  src/schemas/auth.ts  src/schemas/modules.ts
  src/services/auth.ts  src/services/stateMachine.ts  src/services/score.ts  src/services/modules.ts  src/services/okr.ts  src/services/spyfu.ts
  src/services/calculators/marketSize.ts  feasibility.ts  pricing.ts  gtm.ts  okr.ts
  src/services/llm/index.ts  prompt.ts  anthropic.ts  openai.ts  stub.ts
  src/controllers/auth.ts  projects.ts  modules.ts  okr.ts
  src/routes/auth.ts  projects.ts  modules.ts  okr.ts
  tests/helpers.ts
  tests/unit/*.test.ts   tests/integration/*.test.ts
```

---

### Task 1: Scaffold server project, Docker DB, Prisma schema & first migration

**Files:**
- Create: `server/package.json`, `server/tsconfig.json`, `server/docker-compose.yml`, `server/docker/init.sql`, `server/.env.example`, `server/.env`, `server/.gitignore`, `server/prisma/schema.prisma`, `server/src/config/env.ts`, `server/src/lib/prisma.ts`

**Interfaces:**
- Produces: `env` object (`src/config/env.ts`) with fields `PORT, DATABASE_URL, JWT_SECRET, CORS_ORIGIN, LLM_PROVIDER?, ANTHROPIC_API_KEY?, OPENAI_API_KEY?, SPYFU_API_KEY?, SPYFU_API_URL`; `prisma` singleton (`src/lib/prisma.ts`); all Prisma models/enums per spec §4.

- [ ] **Step 1: Create files**

`server/package.json`:
```json
{
  "name": "conscious-orbit-server",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit",
    "test": "vitest run tests/unit",
    "test:integration": "cross-env DATABASE_URL=postgresql://orbit:orbit@localhost:5433/conscious_orbit_test vitest run tests/integration --no-file-parallelism",
    "test:db:push": "cross-env DATABASE_URL=postgresql://orbit:orbit@localhost:5433/conscious_orbit_test prisma db push --skip-generate",
    "db:up": "docker compose up -d",
    "db:migrate": "prisma migrate dev",
    "seed": "tsx prisma/seed.ts"
  },
  "prisma": { "seed": "tsx prisma/seed.ts" },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.70.0",
    "@prisma/client": "^6.5.0",
    "bcryptjs": "^3.0.2",
    "cors": "^2.8.5",
    "dotenv": "^17.0.0",
    "express": "^5.1.0",
    "jsonwebtoken": "^9.0.2",
    "openai": "^6.0.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.0",
    "@types/jsonwebtoken": "^9.0.7",
    "@types/node": "^22.0.0",
    "@types/supertest": "^6.0.2",
    "cross-env": "^7.0.3",
    "prisma": "^6.5.0",
    "supertest": "^7.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "vitest": "^3.0.0"
  }
}
```

`server/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "types": ["node"]
  },
  "include": ["src/**/*.ts", "prisma/seed.ts", "tests/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

`server/docker-compose.yml`:
```yaml
services:
  db:
    image: postgres:16
    container_name: conscious-orbit-db
    environment:
      POSTGRES_USER: orbit
      POSTGRES_PASSWORD: orbit
      POSTGRES_DB: conscious_orbit
    ports:
      - "5433:5432"
    volumes:
      - orbit-db-data:/var/lib/postgresql/data
      - ./docker/init.sql:/docker-entrypoint-initdb.d/init.sql
volumes:
  orbit-db-data:
```

`server/docker/init.sql`:
```sql
CREATE DATABASE conscious_orbit_test;
```

`server/.env.example` (copy the same content to `server/.env`, but in `.env` set `JWT_SECRET=dev-secret-change-me-0123456789`):
```
PORT=4000
DATABASE_URL=postgresql://orbit:orbit@localhost:5433/conscious_orbit
JWT_SECRET=
CORS_ORIGIN=http://localhost:5173
LLM_PROVIDER=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
SPYFU_API_KEY=
SPYFU_API_URL=https://www.spyfu.com/apis
```

`server/.gitignore`:
```
node_modules/
dist/
.env
```

`server/prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum LifecycleStatus {
  RECEIVED
  PENDING
  PROCESSED
  PUBLISHED
}

enum ActionWorkflow {
  SCRUMING
  REQUIREMENT
  MAPPING
  DELIVERED
}

enum ModuleType {
  CUSTOMER_DISCOVERY
  PROFILING
  MARKET_SIZE
  FEASIBILITY
  PRICING
  MARKET_RESEARCH
  INDUSTRY_REPORT
  BUSINESS_MODEL
  GTM
  OKR
}

enum ModuleStatus {
  EMPTY
  IN_PROGRESS
  COMPLETED
}

enum Vertical {
  STARTUPS
  MSMES
  INDUSTRIES
  STUDENTS
  INSTITUTIONS
}

model User {
  id           String    @id @default(cuid())
  name         String
  email        String    @unique
  passwordHash String
  createdAt    DateTime  @default(now())
  projects     Project[]
}

model Project {
  id         String          @id @default(cuid())
  name       String
  vertical   Vertical
  tags       String[]
  status     LifecycleStatus @default(RECEIVED)
  action     ActionWorkflow  @default(SCRUMING)
  score      Int             @default(0)
  owner      User            @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  ownerId    String
  modules    ProjectModule[]
  objectives Objective[]
  createdAt  DateTime        @default(now())
  updatedAt  DateTime        @updatedAt
}

model ProjectModule {
  id        String       @id @default(cuid())
  project   Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  projectId String
  type      ModuleType
  status    ModuleStatus @default(EMPTY)
  data      Json         @default("{}")
  updatedAt DateTime     @updatedAt

  @@unique([projectId, type])
}

model Objective {
  id          String      @id @default(cuid())
  project     Project     @relation(fields: [projectId], references: [id], onDelete: Cascade)
  projectId   String
  title       String
  description String?
  progress    Float       @default(0)
  order       Int         @default(0)
  keyResults  KeyResult[]
  createdAt   DateTime    @default(now())
}

model KeyResult {
  id           String    @id @default(cuid())
  objective    Objective @relation(fields: [objectiveId], references: [id], onDelete: Cascade)
  objectiveId  String
  title        String
  targetValue  Float
  currentValue Float     @default(0)
  unit         String?
  progress     Float     @default(0)
  order        Int       @default(0)
}
```

`server/src/config/env.ts`:
```ts
import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(10, 'JWT_SECRET must be at least 10 chars'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  LLM_PROVIDER: z
    .union([z.enum(['anthropic', 'openai', 'stub']), z.literal('')])
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  SPYFU_API_KEY: z.string().optional(),
  SPYFU_API_URL: z.string().default('https://www.spyfu.com/apis'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
```

`server/src/lib/prisma.ts`:
```ts
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
```

- [ ] **Step 2: Install, start DB, migrate**

Run (from `server/`):
```bash
npm install
docker compose up -d
npx prisma migrate dev --name init
```
Expected: install succeeds; container `conscious-orbit-db` healthy; migration `init` created and applied; `npx prisma migrate status` reports up to date. If `conscious_orbit_test` was not created (volume pre-existed), run: `docker exec conscious-orbit-db psql -U orbit -d conscious_orbit -c "CREATE DATABASE conscious_orbit_test;"`.

- [ ] **Step 3: Verify typecheck passes**

Run: `npm run typecheck` — Expected: no errors.

- [ ] **Step 4: Commit**

From repo root:
```bash
git add server/
git commit -m "feat(server): scaffold Express+Prisma backend, Docker Postgres, initial schema

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Error infrastructure, app skeleton, health endpoint

**Files:**
- Create: `server/src/middleware/errors.ts`, `server/src/app.ts`, `server/src/index.ts`, `server/vitest.config.ts`, `server/tests/integration/health.test.ts`

**Interfaces:**
- Consumes: `env`, `prisma` (Task 1)
- Produces: `class AppError { constructor(status: number, code: string, message: string, details?: unknown) }` and `errorHandler` (`src/middleware/errors.ts`); `createApp(): express.Express` (`src/app.ts`). Every later task registers routes inside `createApp` and throws `AppError` for expected failures.

- [ ] **Step 1: Write the failing test**

`server/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    hookTimeout: 30000,
    testTimeout: 30000,
  },
});
```

`server/tests/integration/health.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';

describe('GET /health', () => {
  it('reports ok with db connectivity', async () => {
    const res = await request(createApp()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, db: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:integration` — Expected: FAIL (cannot resolve `../../src/app`).

- [ ] **Step 3: Implement app skeleton**

`server/src/middleware/errors.ts`:
```ts
import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: err.issues } });
    return;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: { code: 'CONFLICT', message: 'Resource already exists' } });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resource not found' } });
      return;
    }
  }
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Internal server error' } });
}
```

`server/src/app.ts`:
```ts
import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { prisma } from './lib/prisma';
import { errorHandler } from './middleware/errors';

export function createApp() {
  const app = express();
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json({ limit: '2mb' }));

  app.get('/health', async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, db: true });
  });

  app.use(errorHandler);
  return app;
}
```

`server/src/index.ts`:
```ts
import { createApp } from './app';
import { env } from './config/env';

const app = createApp();
app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Conscious Orbit API listening on http://localhost:${env.PORT}`);
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:integration` — Expected: PASS (1 test). Also run `npm run typecheck` — no errors.

- [ ] **Step 5: Commit**

From repo root:
```bash
git add server/
git commit -m "feat(server): app skeleton, central error handling, health endpoint

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---
### Task 3: JWT auth (register / login / me)

**Files:**
- Create: `server/src/schemas/auth.ts`, `server/src/services/auth.ts`, `server/src/middleware/auth.ts`, `server/src/controllers/auth.ts`, `server/src/routes/auth.ts`, `server/tests/helpers.ts`, `server/tests/integration/auth.test.ts`
- Modify: `server/src/app.ts` (mount route)

**Interfaces:**
- Consumes: `env`, `prisma`, `AppError`
- Produces: `requireAuth` middleware setting `req.user: { id: string; name: string; email: string }` (via Express global declaration merge); test helpers `truncateAll(): Promise<void>` and `registerAndLogin(app, email?): Promise<string>` returning a bearer token. All later protected routes use `requireAuth`.

- [ ] **Step 1: Write the failing tests**

`server/tests/helpers.ts`:
```ts
import type { Express } from 'express';
import request from 'supertest';
import { prisma } from '../src/lib/prisma';

export async function truncateAll() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "User", "Project", "ProjectModule", "Objective", "KeyResult" CASCADE',
  );
}

export async function registerAndLogin(app: Express, email = 'founder@test.io'): Promise<string> {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: 'Test Founder', email, password: 'orbit-pass-123' });
  return res.body.token as string;
}
```

`server/tests/integration/auth.test.ts`:
```ts
import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { truncateAll } from '../helpers';

const app = createApp();

beforeEach(async () => {
  await truncateAll();
});

describe('auth', () => {
  it('registers a user and returns token + user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Ada', email: 'ada@test.io', password: 'longenough1' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTypeOf('string');
    expect(res.body.user).toMatchObject({ name: 'Ada', email: 'ada@test.io' });
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('rejects duplicate email with 409', async () => {
    await request(app).post('/api/v1/auth/register').send({ name: 'A', email: 'dup@test.io', password: 'longenough1' });
    const res = await request(app).post('/api/v1/auth/register').send({ name: 'B', email: 'dup@test.io', password: 'longenough1' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('rejects short password with 400', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ name: 'A', email: 'x@test.io', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('logs in with correct credentials, rejects wrong password', async () => {
    await request(app).post('/api/v1/auth/register').send({ name: 'A', email: 'l@test.io', password: 'longenough1' });
    const ok = await request(app).post('/api/v1/auth/login').send({ email: 'l@test.io', password: 'longenough1' });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toBeTypeOf('string');
    const bad = await request(app).post('/api/v1/auth/login').send({ email: 'l@test.io', password: 'wrongpass1' });
    expect(bad.status).toBe(401);
  });

  it('GET /auth/me returns current user with valid token, 401 without', async () => {
    const reg = await request(app).post('/api/v1/auth/register').send({ name: 'Me', email: 'me@test.io', password: 'longenough1' });
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${reg.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe('me@test.io');
    const anon = await request(app).get('/api/v1/auth/me');
    expect(anon.status).toBe(401);
  });
});
```

- [ ] **Step 2: Push schema to test DB, run tests to verify they fail**

Run: `npm run test:db:push` then `npm run test:integration` — Expected: auth tests FAIL (404s — routes missing).

- [ ] **Step 3: Implement auth**

`server/src/schemas/auth.ts`:
```ts
import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
```

`server/src/services/auth.ts`:
```ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';
import { AppError } from '../middleware/errors';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
}

function toPublic(user: { id: string; name: string; email: string }): PublicUser {
  return { id: user.id, name: user.name, email: user.email };
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: '7d' });
}

export async function registerUser(name: string, email: string, password: string) {
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { name, email, passwordHash } });
  return { token: signToken(user.id), user: toPublic(user) };
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid email or password');
  }
  return { token: signToken(user.id), user: toPublic(user) };
}
```

`server/src/middleware/auth.ts`:
```ts
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { AppError } from './errors';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user: { id: string; name: string; email: string };
    }
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new AppError(401, 'UNAUTHORIZED', 'Missing bearer token');
  }
  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(header.slice('Bearer '.length), env.JWT_SECRET) as jwt.JwtPayload;
  } catch {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired token');
  }
  const user = await prisma.user.findUnique({ where: { id: String(payload.sub) } });
  if (!user) {
    throw new AppError(401, 'UNAUTHORIZED', 'User no longer exists');
  }
  req.user = { id: user.id, name: user.name, email: user.email };
  next();
}
```

`server/src/controllers/auth.ts`:
```ts
import type { Request, Response } from 'express';
import { loginSchema, registerSchema } from '../schemas/auth';
import { loginUser, registerUser } from '../services/auth';

export async function register(req: Request, res: Response) {
  const body = registerSchema.parse(req.body);
  const result = await registerUser(body.name, body.email, body.password);
  res.status(201).json(result);
}

export async function login(req: Request, res: Response) {
  const body = loginSchema.parse(req.body);
  const result = await loginUser(body.email, body.password);
  res.json(result);
}

export async function me(req: Request, res: Response) {
  res.json({ user: req.user });
}
```

`server/src/routes/auth.ts`:
```ts
import { Router } from 'express';
import { login, me, register } from '../controllers/auth';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.post('/register', register);
router.post('/login', login);
router.get('/me', requireAuth, me);
export default router;
```

In `server/src/app.ts`, add `import authRoutes from './routes/auth';` at the top with the other imports, and after the `/health` handler add:
```ts
app.use('/api/v1/auth', authRoutes);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:integration` — Expected: all auth tests + health PASS. `npm run typecheck` — no errors.

- [ ] **Step 5: Commit**

From repo root:
```bash
git add server/
git commit -m "feat(server): JWT auth with register/login/me and requireAuth middleware

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Market-size calculator (Module 3 core logic)

**Files:**
- Create: `server/src/services/calculators/marketSize.ts`, `server/tests/unit/marketSize.test.ts`

**Interfaces:**
- Produces: `calculateMarketSize(input: { tam: number; samConversionPct: number; somConversionPct: number }): { sam: number; som: number }` — throws `AppError(400, 'VALIDATION_ERROR', …)` on invalid input. Used by Task 13's calculate endpoint and Task 12's publish score.

- [ ] **Step 1: Write the failing tests**

`server/tests/unit/marketSize.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { calculateMarketSize } from '../../src/services/calculators/marketSize';
import { AppError } from '../../src/middleware/errors';

describe('calculateMarketSize', () => {
  it('computes SAM and SOM strictly from TAM and conversion rates', () => {
    expect(calculateMarketSize({ tam: 50_000_000, samConversionPct: 15, somConversionPct: 10 }))
      .toEqual({ sam: 7_500_000, som: 750_000 });
  });

  it('rounds to 2 decimals', () => {
    expect(calculateMarketSize({ tam: 1000, samConversionPct: 33.33, somConversionPct: 50 }))
      .toEqual({ sam: 333.3, som: 166.65 });
  });

  it('accepts boundary rates 0 and 100', () => {
    expect(calculateMarketSize({ tam: 100, samConversionPct: 100, somConversionPct: 0 }))
      .toEqual({ sam: 100, som: 0 });
  });

  it('rejects tam <= 0', () => {
    expect(() => calculateMarketSize({ tam: 0, samConversionPct: 10, somConversionPct: 10 })).toThrow(AppError);
    expect(() => calculateMarketSize({ tam: -5, samConversionPct: 10, somConversionPct: 10 })).toThrow(AppError);
  });

  it('rejects rates outside 0-100 and non-finite values', () => {
    expect(() => calculateMarketSize({ tam: 100, samConversionPct: 101, somConversionPct: 10 })).toThrow(AppError);
    expect(() => calculateMarketSize({ tam: 100, samConversionPct: -1, somConversionPct: 10 })).toThrow(AppError);
    expect(() => calculateMarketSize({ tam: 100, samConversionPct: 10, somConversionPct: NaN })).toThrow(AppError);
    expect(() => calculateMarketSize({ tam: Infinity, samConversionPct: 10, somConversionPct: 10 })).toThrow(AppError);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test` — Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

`server/src/services/calculators/marketSize.ts`:
```ts
import { AppError } from '../../middleware/errors';

export interface MarketSizeInput {
  tam: number;
  samConversionPct: number;
  somConversionPct: number;
}

export interface MarketSizeResult {
  sam: number;
  som: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function assertPct(value: number, field: string) {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new AppError(400, 'VALIDATION_ERROR', `${field} must be a number between 0 and 100`);
  }
}

export function calculateMarketSize(input: MarketSizeInput): MarketSizeResult {
  if (!Number.isFinite(input.tam) || input.tam <= 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'tam must be a finite number greater than 0');
  }
  assertPct(input.samConversionPct, 'samConversionPct');
  assertPct(input.somConversionPct, 'somConversionPct');
  const sam = round2(input.tam * (input.samConversionPct / 100));
  const som = round2(sam * (input.somConversionPct / 100));
  return { sam, som };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test` — Expected: PASS.

- [ ] **Step 5: Commit**

From repo root:
```bash
git add server/
git commit -m "feat(server): TAM/SAM/SOM market-size calculator with strict validation

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Feasibility calculator (Module 4 core logic)

**Files:**
- Create: `server/src/services/calculators/feasibility.ts`, `server/tests/unit/feasibility.test.ts`

**Interfaces:**
- Produces: `calculateFeasibility(input: { params: Record<string, number>; weights?: Record<string, number> }): { score: number; b2bAcquisitionViable: boolean; verdict: 'PROCEED' | 'PIVOT' }` — throws `AppError(400, …)` on invalid input. Used by Task 13 and Task 12's publish score.

- [ ] **Step 1: Write the failing tests**

`server/tests/unit/feasibility.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { calculateFeasibility } from '../../src/services/calculators/feasibility';
import { AppError } from '../../src/middleware/errors';

describe('calculateFeasibility', () => {
  it('computes unweighted mean of params, rounded', () => {
    const r = calculateFeasibility({ params: { marketDemand: 80, techReadiness: 60, teamStrength: 70 } });
    expect(r.score).toBe(70);
    expect(r.b2bAcquisitionViable).toBe(true);
    expect(r.verdict).toBe('PROCEED');
  });

  it('applies weights', () => {
    const r = calculateFeasibility({
      params: { a: 100, b: 0 },
      weights: { a: 3, b: 1 },
    });
    expect(r.score).toBe(75);
  });

  it('verdict boundary: score exactly 60 is PROCEED, 59 is PIVOT', () => {
    expect(calculateFeasibility({ params: { a: 60 } }).verdict).toBe('PROCEED');
    const pivot = calculateFeasibility({ params: { a: 59 } });
    expect(pivot.verdict).toBe('PIVOT');
    expect(pivot.b2bAcquisitionViable).toBe(false);
  });

  it('rejects empty params', () => {
    expect(() => calculateFeasibility({ params: {} })).toThrow(AppError);
  });

  it('rejects params outside 0-100', () => {
    expect(() => calculateFeasibility({ params: { a: 101 } })).toThrow(AppError);
    expect(() => calculateFeasibility({ params: { a: -1 } })).toThrow(AppError);
  });

  it('rejects weights not covering the same keys or non-positive', () => {
    expect(() => calculateFeasibility({ params: { a: 50 }, weights: { b: 1 } })).toThrow(AppError);
    expect(() => calculateFeasibility({ params: { a: 50 }, weights: { a: 0 } })).toThrow(AppError);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test` — Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

`server/src/services/calculators/feasibility.ts`:
```ts
import { AppError } from '../../middleware/errors';

export interface FeasibilityInput {
  params: Record<string, number>;
  weights?: Record<string, number>;
}

export interface FeasibilityResult {
  score: number;
  b2bAcquisitionViable: boolean;
  verdict: 'PROCEED' | 'PIVOT';
}

export function calculateFeasibility({ params, weights }: FeasibilityInput): FeasibilityResult {
  const keys = Object.keys(params);
  if (keys.length === 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'params must contain at least one entry');
  }
  for (const key of keys) {
    const value = params[key];
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      throw new AppError(400, 'VALIDATION_ERROR', `params.${key} must be a number between 0 and 100`);
    }
  }
  const w: Record<string, number> = weights ?? Object.fromEntries(keys.map((k) => [k, 1]));
  for (const key of keys) {
    const weight = w[key];
    if (!Number.isFinite(weight) || weight <= 0) {
      throw new AppError(400, 'VALIDATION_ERROR', `weights.${key} must be a positive number`);
    }
  }
  const totalWeight = keys.reduce((sum, k) => sum + w[k], 0);
  const score = Math.round(keys.reduce((sum, k) => sum + params[k] * w[k], 0) / totalWeight);
  const viable = score >= 60;
  return { score, b2bAcquisitionViable: viable, verdict: viable ? 'PROCEED' : 'PIVOT' };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test` — Expected: PASS.

- [ ] **Step 5: Commit**

From repo root:
```bash
git add server/
git commit -m "feat(server): weighted feasibility score calculator with PROCEED/PIVOT verdict

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Pricing calculator (Module 5 core logic)

**Files:**
- Create: `server/src/services/calculators/pricing.ts`, `server/tests/unit/pricing.test.ts`

**Interfaces:**
- Produces: `calculatePricing(input: { competitors: { name: string; pricingModel: string; price: number }[]; userPricing: { pricingModel: string; price: number } }): { avgCompetitorPrice: number; differential: number; differentialPct: number; positioning: 'PREMIUM' | 'PARITY' | 'DISCOUNT' }` — throws `AppError(400, …)`. Used by Task 13 and Task 12's publish score.

- [ ] **Step 1: Write the failing tests**

`server/tests/unit/pricing.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { calculatePricing } from '../../src/services/calculators/pricing';
import { AppError } from '../../src/middleware/errors';

const comp = (price: number) => ({ name: `c${price}`, pricingModel: 'per-delivery', price });

describe('calculatePricing', () => {
  it('computes average, differential and pct', () => {
    const r = calculatePricing({
      competitors: [comp(10), comp(20)],
      userPricing: { pricingModel: 'per-delivery', price: 18 },
    });
    expect(r.avgCompetitorPrice).toBe(15);
    expect(r.differential).toBe(3);
    expect(r.differentialPct).toBe(20);
    expect(r.positioning).toBe('PREMIUM');
  });

  it('positioning bands: within ±5% is PARITY, below is DISCOUNT', () => {
    expect(calculatePricing({ competitors: [comp(100)], userPricing: { pricingModel: 'x', price: 104 } }).positioning).toBe('PARITY');
    expect(calculatePricing({ competitors: [comp(100)], userPricing: { pricingModel: 'x', price: 95 } }).positioning).toBe('PARITY');
    expect(calculatePricing({ competitors: [comp(100)], userPricing: { pricingModel: 'x', price: 94 } }).positioning).toBe('DISCOUNT');
    expect(calculatePricing({ competitors: [comp(100)], userPricing: { pricingModel: 'x', price: 106 } }).positioning).toBe('PREMIUM');
  });

  it('rejects empty competitor list', () => {
    expect(() => calculatePricing({ competitors: [], userPricing: { pricingModel: 'x', price: 10 } })).toThrow(AppError);
  });

  it('rejects negative prices and zero average', () => {
    expect(() => calculatePricing({ competitors: [comp(-1)], userPricing: { pricingModel: 'x', price: 10 } })).toThrow(AppError);
    expect(() => calculatePricing({ competitors: [comp(0)], userPricing: { pricingModel: 'x', price: 10 } })).toThrow(AppError);
    expect(() => calculatePricing({ competitors: [comp(10)], userPricing: { pricingModel: 'x', price: -2 } })).toThrow(AppError);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test` — Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

`server/src/services/calculators/pricing.ts`:
```ts
import { AppError } from '../../middleware/errors';

export interface CompetitorPricing {
  name: string;
  pricingModel: string;
  price: number;
}

export interface PricingInput {
  competitors: CompetitorPricing[];
  userPricing: { pricingModel: string; price: number };
}

export interface PricingResult {
  avgCompetitorPrice: number;
  differential: number;
  differentialPct: number;
  positioning: 'PREMIUM' | 'PARITY' | 'DISCOUNT';
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function calculatePricing({ competitors, userPricing }: PricingInput): PricingResult {
  if (competitors.length === 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'At least one competitor is required');
  }
  for (const c of competitors) {
    if (!Number.isFinite(c.price) || c.price < 0) {
      throw new AppError(400, 'VALIDATION_ERROR', `Competitor "${c.name}" price must be a number >= 0`);
    }
  }
  if (!Number.isFinite(userPricing.price) || userPricing.price < 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'userPricing.price must be a number >= 0');
  }
  const avg = competitors.reduce((sum, c) => sum + c.price, 0) / competitors.length;
  if (avg <= 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Average competitor price must be greater than 0');
  }
  const differential = round2(userPricing.price - avg);
  const differentialPct = round2((differential / avg) * 100);
  const positioning: PricingResult['positioning'] =
    differentialPct > 5 ? 'PREMIUM' : differentialPct < -5 ? 'DISCOUNT' : 'PARITY';
  return { avgCompetitorPrice: round2(avg), differential, differentialPct, positioning };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test` — Expected: PASS.

- [ ] **Step 5: Commit**

From repo root:
```bash
git add server/
git commit -m "feat(server): pricing differential calculator with positioning bands

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---
### Task 7: GTM suggestions generator (Module 9 core logic)

**Files:**
- Create: `server/src/services/calculators/gtm.ts`, `server/tests/unit/gtm.test.ts`

**Interfaces:**
- Produces: `generateGtmSuggestions(input: { channels: { name: string; budgetPct: number }[]; customerAvailability: { channelReach: Record<string, number> } }): { channel: string; priority: 'HIGH' | 'MEDIUM' | 'LOW'; tactic: string }[]` and exported type `GtmSuggestion`. Throws `AppError(400, …)`. Used by Task 15's suggest endpoint and Task 12's publish score.

- [ ] **Step 1: Write the failing tests**

`server/tests/unit/gtm.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { generateGtmSuggestions } from '../../src/services/calculators/gtm';
import { AppError } from '../../src/middleware/errors';

describe('generateGtmSuggestions', () => {
  it('assigns priority from budget x reach strength', () => {
    const r = generateGtmSuggestions({
      channels: [
        { name: 'Direct Sales', budgetPct: 60 },
        { name: 'Online Ads', budgetPct: 30 },
        { name: 'Community', budgetPct: 10 },
      ],
      customerAvailability: { channelReach: { 'Direct Sales': 90, 'Online Ads': 90, Community: 90 } },
    });
    // strengths: 54, 27, 9
    expect(r.map((s) => s.priority)).toEqual(['HIGH', 'MEDIUM', 'LOW']);
    expect(r.map((s) => s.channel)).toEqual(['Direct Sales', 'Online Ads', 'Community']);
  });

  it('defaults missing reach to 50', () => {
    const r = generateGtmSuggestions({
      channels: [{ name: 'Partner Network', budgetPct: 100 }],
      customerAvailability: { channelReach: {} },
    });
    // strength 100 * 50 / 100 = 50 -> HIGH
    expect(r[0].priority).toBe('HIGH');
  });

  it('picks archetype-specific tactics', () => {
    const r = generateGtmSuggestions({
      channels: [
        { name: 'Direct Sales', budgetPct: 30 },
        { name: 'Partner Network', budgetPct: 30 },
        { name: 'Govt Tenders', budgetPct: 30 },
      ],
      customerAvailability: { channelReach: {} },
    });
    expect(r[0].tactic).toMatch(/outbound/i);
    expect(r[1].tactic).toMatch(/partners/i);
    expect(r[2].tactic).toMatch(/tenders/i);
  });

  it('falls back to a generic pilot tactic for unknown channels', () => {
    const r = generateGtmSuggestions({
      channels: [{ name: 'Skywriting', budgetPct: 10 }],
      customerAvailability: { channelReach: {} },
    });
    expect(r[0].tactic).toContain('Skywriting');
  });

  it('rejects empty channels, budget sum > 100, and out-of-range values', () => {
    expect(() => generateGtmSuggestions({ channels: [], customerAvailability: { channelReach: {} } })).toThrow(AppError);
    expect(() =>
      generateGtmSuggestions({
        channels: [{ name: 'a', budgetPct: 60 }, { name: 'b', budgetPct: 50 }],
        customerAvailability: { channelReach: {} },
      }),
    ).toThrow(AppError);
    expect(() =>
      generateGtmSuggestions({
        channels: [{ name: 'a', budgetPct: 10 }],
        customerAvailability: { channelReach: { a: 150 } },
      }),
    ).toThrow(AppError);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test` — Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

`server/src/services/calculators/gtm.ts`:
```ts
import { AppError } from '../../middleware/errors';

export interface GtmChannel {
  name: string;
  budgetPct: number;
}

export interface GtmInput {
  channels: GtmChannel[];
  customerAvailability: { channelReach: Record<string, number> };
}

export interface GtmSuggestion {
  channel: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  tactic: string;
}

const TACTICS: { match: RegExp; tactic: string }[] = [
  { match: /direct|outbound|sales/i, tactic: 'Deploy a dedicated outbound pod targeting the ideal customer profile with a 3-touch sequence.' },
  { match: /partner|channel|reseller/i, tactic: 'Sign 2-3 anchor distribution partners and co-market through their existing accounts.' },
  { match: /online|digital|ads|social/i, tactic: 'Run conversion-optimized paid campaigns on the highest-intent keywords and retarget engaged visitors.' },
  { match: /content|seo|community/i, tactic: 'Publish authority content answering the top buyer questions and nurture an owned community.' },
  { match: /govt|government|tender|ngo/i, tactic: 'Pursue public tenders and institutional partnerships with compliance-ready collateral.' },
];

function tacticFor(channelName: string): string {
  const hit = TACTICS.find((t) => t.match.test(channelName));
  return hit ? hit.tactic : `Pilot ${channelName} with a capped budget and double down only if CAC beats the blended target.`;
}

export function generateGtmSuggestions({ channels, customerAvailability }: GtmInput): GtmSuggestion[] {
  if (channels.length === 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'At least one channel is required');
  }
  let budgetSum = 0;
  for (const ch of channels) {
    if (!Number.isFinite(ch.budgetPct) || ch.budgetPct < 0 || ch.budgetPct > 100) {
      throw new AppError(400, 'VALIDATION_ERROR', `channels.${ch.name}.budgetPct must be between 0 and 100`);
    }
    budgetSum += ch.budgetPct;
  }
  if (budgetSum > 100) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Channel budget percentages must sum to at most 100');
  }
  for (const [name, reach] of Object.entries(customerAvailability.channelReach)) {
    if (!Number.isFinite(reach) || reach < 0 || reach > 100) {
      throw new AppError(400, 'VALIDATION_ERROR', `channelReach.${name} must be between 0 and 100`);
    }
  }
  return channels.map((ch) => {
    const reach = customerAvailability.channelReach[ch.name] ?? 50;
    const strength = (ch.budgetPct * reach) / 100; // 0..100
    const priority: GtmSuggestion['priority'] = strength >= 50 ? 'HIGH' : strength >= 25 ? 'MEDIUM' : 'LOW';
    return { channel: ch.name, priority, tactic: tacticFor(ch.name) };
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test` — Expected: PASS.

- [ ] **Step 5: Commit**

From repo root:
```bash
git add server/
git commit -m "feat(server): rule-based GTM command-plan suggestion generator

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: OKR progress math (Module 10 core logic)

**Files:**
- Create: `server/src/services/calculators/okr.ts`, `server/tests/unit/okrMath.test.ts`

**Interfaces:**
- Produces: `keyResultProgress(currentValue: number, targetValue: number): number` (0–100, 1 decimal, clamped) and `objectiveProgress(krProgresses: number[]): number` (mean, 1 decimal, 0 for empty). Throws `AppError(400, …)` for `targetValue <= 0` or negative `currentValue`. Used by Task 17's OKR service.

- [ ] **Step 1: Write the failing tests**

`server/tests/unit/okrMath.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { keyResultProgress, objectiveProgress } from '../../src/services/calculators/okr';
import { AppError } from '../../src/middleware/errors';

describe('keyResultProgress', () => {
  it('computes percent of target, 1 decimal', () => {
    expect(keyResultProgress(1, 3)).toBe(33.3);
    expect(keyResultProgress(50, 100)).toBe(50);
  });

  it('clamps overshoot at 100', () => {
    expect(keyResultProgress(150, 100)).toBe(100);
  });

  it('floors at 0 for zero current', () => {
    expect(keyResultProgress(0, 10)).toBe(0);
  });

  it('rejects target <= 0 and negative current', () => {
    expect(() => keyResultProgress(1, 0)).toThrow(AppError);
    expect(() => keyResultProgress(-1, 10)).toThrow(AppError);
  });
});

describe('objectiveProgress', () => {
  it('averages KR progresses, 1 decimal', () => {
    expect(objectiveProgress([100, 50, 0])).toBe(50);
    expect(objectiveProgress([33.3, 66.7])).toBe(50);
  });

  it('returns 0 for no key results', () => {
    expect(objectiveProgress([])).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test` — Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

`server/src/services/calculators/okr.ts`:
```ts
import { AppError } from '../../middleware/errors';

const round1 = (n: number) => Math.round(n * 10) / 10;

export function keyResultProgress(currentValue: number, targetValue: number): number {
  if (!Number.isFinite(targetValue) || targetValue <= 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'targetValue must be greater than 0');
  }
  if (!Number.isFinite(currentValue) || currentValue < 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'currentValue must be a number >= 0');
  }
  const pct = (currentValue / targetValue) * 100;
  return round1(Math.min(100, Math.max(0, pct)));
}

export function objectiveProgress(krProgresses: number[]): number {
  if (krProgresses.length === 0) return 0;
  const mean = krProgresses.reduce((sum, p) => sum + p, 0) / krProgresses.length;
  return round1(mean);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test` — Expected: PASS.

- [ ] **Step 5: Commit**

From repo root:
```bash
git add server/
git commit -m "feat(server): OKR key-result and objective progress math

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: State machine + Orbital Score aggregation

**Files:**
- Create: `server/src/services/stateMachine.ts`, `server/src/services/score.ts`, `server/tests/unit/stateMachine.test.ts`, `server/tests/unit/score.test.ts`

**Interfaces:**
- Consumes: `GtmSuggestion` type (Task 7)
- Produces:
  - `LIFECYCLE_ORDER: readonly LifecycleStatus[]`, `ACTION_FOR: Record<LifecycleStatus, ActionWorkflow>`, `nextStatus(current: LifecycleStatus, direction: 'forward' | 'back'): LifecycleStatus` (throws `AppError(422, 'INVALID_TRANSITION', …)` at the ends) — `src/services/stateMachine.ts`.
  - `computeOrbitalScore(inputs: { feasibilityScore: number; tam: number; som: number; differentialPct: number; suggestions: GtmSuggestion[] }): { score: number; verdict: 'PROCEED' | 'PIVOT' }` and `scoreFromModules(modules: { type: ModuleType; data: unknown }[]): { score: number; verdict: 'PROCEED' | 'PIVOT' }` (extracts the fields from module `data` JSON; throws `AppError(422, 'MODULES_INCOMPLETE', …)` if any needed field is missing) — `src/services/score.ts`.
  - Used by Task 12's transition service.

- [ ] **Step 1: Write the failing tests**

`server/tests/unit/stateMachine.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { ACTION_FOR, nextStatus } from '../../src/services/stateMachine';
import { AppError } from '../../src/middleware/errors';

describe('nextStatus', () => {
  it('moves one step forward through the lifecycle', () => {
    expect(nextStatus('RECEIVED', 'forward')).toBe('PENDING');
    expect(nextStatus('PENDING', 'forward')).toBe('PROCESSED');
    expect(nextStatus('PROCESSED', 'forward')).toBe('PUBLISHED');
  });

  it('moves one step back', () => {
    expect(nextStatus('PUBLISHED', 'back')).toBe('PROCESSED');
    expect(nextStatus('PENDING', 'back')).toBe('RECEIVED');
  });

  it('rejects moving forward from PUBLISHED and back from RECEIVED', () => {
    expect(() => nextStatus('PUBLISHED', 'forward')).toThrow(AppError);
    expect(() => nextStatus('RECEIVED', 'back')).toThrow(AppError);
  });
});

describe('ACTION_FOR', () => {
  it('pairs every lifecycle status with its action', () => {
    expect(ACTION_FOR).toEqual({
      RECEIVED: 'SCRUMING',
      PENDING: 'REQUIREMENT',
      PROCESSED: 'MAPPING',
      PUBLISHED: 'DELIVERED',
    });
  });
});
```

`server/tests/unit/score.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { computeOrbitalScore, scoreFromModules } from '../../src/services/score';
import { AppError } from '../../src/middleware/errors';

describe('computeOrbitalScore', () => {
  it('aggregates 30/30/20/20 weighted component scores', () => {
    const r = computeOrbitalScore({
      feasibilityScore: 80,
      tam: 50_000_000,
      som: 750_000, // market = min(100, round(40 + 0.015*1000)) = 55
      differentialPct: 10, // pricing = 90
      suggestions: [
        { channel: 'a', priority: 'HIGH', tactic: 't' },
        { channel: 'b', priority: 'LOW', tactic: 't' },
      ], // gtm = mean(90, 40) = 65
    });
    // 0.3*80 + 0.3*55 + 0.2*90 + 0.2*65 = 24 + 16.5 + 18 + 13 = 71.5 -> 72
    expect(r.score).toBe(72);
    expect(r.verdict).toBe('PROCEED');
  });

  it('caps market component at 100 and returns PIVOT below 60', () => {
    const r = computeOrbitalScore({
      feasibilityScore: 10,
      tam: 100,
      som: 100, // 40 + 1000 -> capped 100
      differentialPct: 200, // pricing = 0
      suggestions: [{ channel: 'a', priority: 'LOW', tactic: 't' }], // gtm = 40
    });
    // 0.3*10 + 0.3*100 + 0.2*0 + 0.2*40 = 3 + 30 + 0 + 8 = 41
    expect(r.score).toBe(41);
    expect(r.verdict).toBe('PIVOT');
  });
});

describe('scoreFromModules', () => {
  const modules = [
    { type: 'FEASIBILITY' as const, data: { params: { a: 80 }, computed: { score: 80, b2bAcquisitionViable: true, verdict: 'PROCEED' } } },
    { type: 'MARKET_SIZE' as const, data: { tam: 50_000_000, samConversionPct: 15, somConversionPct: 10, computed: { sam: 7_500_000, som: 750_000 } } },
    { type: 'PRICING' as const, data: { competitors: [], userPricing: {}, computed: { avgCompetitorPrice: 10, differential: 1, differentialPct: 10, positioning: 'PREMIUM' } } },
    { type: 'GTM' as const, data: { channels: [], customerAvailability: { channelReach: {} }, suggestions: [{ channel: 'a', priority: 'HIGH', tactic: 't' }, { channel: 'b', priority: 'LOW', tactic: 't' }] } },
  ];

  it('extracts inputs from module data and scores', () => {
    expect(scoreFromModules(modules)).toEqual({ score: 72, verdict: 'PROCEED' });
  });

  it('throws MODULES_INCOMPLETE when a needed field is missing', () => {
    const broken = modules.filter((m) => m.type !== 'FEASIBILITY');
    expect(() => scoreFromModules(broken)).toThrow(AppError);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test` — Expected: FAIL (modules not found).

- [ ] **Step 3: Implement**

`server/src/services/stateMachine.ts`:
```ts
import type { ActionWorkflow, LifecycleStatus } from '@prisma/client';
import { AppError } from '../middleware/errors';

export const LIFECYCLE_ORDER = ['RECEIVED', 'PENDING', 'PROCESSED', 'PUBLISHED'] as const;

export const ACTION_FOR: Record<LifecycleStatus, ActionWorkflow> = {
  RECEIVED: 'SCRUMING',
  PENDING: 'REQUIREMENT',
  PROCESSED: 'MAPPING',
  PUBLISHED: 'DELIVERED',
};

export function nextStatus(current: LifecycleStatus, direction: 'forward' | 'back'): LifecycleStatus {
  const index = LIFECYCLE_ORDER.indexOf(current);
  const targetIndex = direction === 'forward' ? index + 1 : index - 1;
  if (targetIndex < 0 || targetIndex >= LIFECYCLE_ORDER.length) {
    throw new AppError(422, 'INVALID_TRANSITION', `Cannot move ${direction} from ${current}`);
  }
  return LIFECYCLE_ORDER[targetIndex];
}
```

`server/src/services/score.ts`:
```ts
import type { ModuleType } from '@prisma/client';
import { AppError } from '../middleware/errors';
import type { GtmSuggestion } from './calculators/gtm';

export interface ScoreInputs {
  feasibilityScore: number;
  tam: number;
  som: number;
  differentialPct: number;
  suggestions: GtmSuggestion[];
}

const PRIORITY_VALUE: Record<GtmSuggestion['priority'], number> = { HIGH: 90, MEDIUM: 70, LOW: 40 };

export function computeOrbitalScore(inputs: ScoreInputs): { score: number; verdict: 'PROCEED' | 'PIVOT' } {
  const market = Math.min(100, Math.round(40 + (inputs.som / inputs.tam) * 1000));
  const pricing = 100 - Math.min(100, Math.abs(inputs.differentialPct));
  const gtm = inputs.suggestions.length
    ? Math.round(
        inputs.suggestions.reduce((sum, s) => sum + PRIORITY_VALUE[s.priority], 0) / inputs.suggestions.length,
      )
    : 0;
  const score = Math.round(0.3 * inputs.feasibilityScore + 0.3 * market + 0.2 * pricing + 0.2 * gtm);
  return { score, verdict: score >= 60 ? 'PROCEED' : 'PIVOT' };
}

type ModuleRow = { type: ModuleType; data: unknown };

function need<T>(value: T | undefined | null, what: string): T {
  if (value === undefined || value === null) {
    throw new AppError(422, 'MODULES_INCOMPLETE', `Cannot compute score: missing ${what}`);
  }
  return value;
}

export function scoreFromModules(modules: ModuleRow[]): { score: number; verdict: 'PROCEED' | 'PIVOT' } {
  const byType = (t: ModuleType) => modules.find((m) => m.type === t)?.data as Record<string, any> | undefined;
  const feasibility = byType('FEASIBILITY');
  const marketSize = byType('MARKET_SIZE');
  const pricing = byType('PRICING');
  const gtm = byType('GTM');
  return computeOrbitalScore({
    feasibilityScore: need(feasibility?.computed?.score, 'FEASIBILITY.computed.score'),
    tam: need(marketSize?.tam, 'MARKET_SIZE.tam'),
    som: need(marketSize?.computed?.som, 'MARKET_SIZE.computed.som'),
    differentialPct: need(pricing?.computed?.differentialPct, 'PRICING.computed.differentialPct'),
    suggestions: need(gtm?.suggestions, 'GTM.suggestions') as GtmSuggestion[],
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test` — Expected: PASS. `npm run typecheck` — no errors.

- [ ] **Step 5: Commit**

From repo root:
```bash
git add server/
git commit -m "feat(server): lifecycle state machine and Orbital Score aggregation

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---
