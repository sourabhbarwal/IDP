# Phase 1 Checkpoint: Authentication, RBAC, PostgreSQL

Run these steps in order after completing Phase 1 setup. All must pass before Phase 2 begins.

## Prerequisites

Before starting, ensure you have:
- Docker Desktop installed and running
- Node.js 20+ installed (`node --version`)
- Git configured with your GitHub account

---

## Step 1 — Clone and Setup

```bash
git clone https://github.com/<your-username>/IDP.git
cd IDP

# Copy env file for local dev
cp backend/auth-service/.env.example backend/auth-service/.env
# (Optional) Edit backend/auth-service/.env to change the JWT_SECRET
```

---

## Step 2 — Start Infrastructure + Service

```bash
# From repo root — starts Postgres, Redis, and auth-service
docker compose up -d

# Watch logs until auth-service says "listening on port 3001"
docker compose logs -f auth-service
```

Expected output:
```
auth-service | auth-service listening on port 3001
```

---

## Step 3 — Run Migrations

```bash
cd backend/auth-service
npm install
npm run migration:run
```

Expected output:
```
Migration InitAuthSchema1718000000000 has been executed successfully.
Migration SeedRolesAndPermissions1718000000001 has been executed successfully.
```

---

## Step 4 — API Checkpoint Tests (using curl)

### 4a. Register a user
```bash
curl -s -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@example.com","password":"S3cure!Passw0rd","fullName":"Dev User"}' | jq .
```
**Expected:** HTTP 201, body contains `email`, `roles: ["DEVELOPER"]`, `permissions` array

### 4b. Login and capture tokens
```bash
LOGIN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@example.com","password":"S3cure!Passw0rd"}')
echo $LOGIN | jq .

ACCESS_TOKEN=$(echo $LOGIN | jq -r '.accessToken')
REFRESH_TOKEN=$(echo $LOGIN | jq -r '.refreshToken')
```
**Expected:** HTTP 200, `accessToken`, `refreshToken`, `tokenType: "Bearer"`, `user` object

### 4c. Get current user with JWT
```bash
curl -s http://localhost:3001/api/v1/users/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```
**Expected:** HTTP 200, user profile with roles and permissions

### 4d. No token → 401
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/v1/users/me
```
**Expected:** `401`

### 4e. Refresh tokens
```bash
REFRESHED=$(curl -s -X POST http://localhost:3001/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}")
echo $REFRESHED | jq .
NEW_ACCESS=$(echo $REFRESHED | jq -r '.accessToken')
NEW_REFRESH=$(echo $REFRESHED | jq -r '.refreshToken')
```
**Expected:** HTTP 200, new `accessToken` and `refreshToken` (different from previous)

### 4f. Replay detection — reuse old refresh token
```bash
curl -s -X POST http://localhost:3001/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}" | jq .
```
**Expected:** HTTP 401 (old token was already rotated)

### 4g. Logout
```bash
curl -s -X POST http://localhost:3001/api/v1/auth/logout \
  -H "Authorization: Bearer $NEW_ACCESS" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$NEW_REFRESH\"}" -o /dev/null -w "%{http_code}"
```
**Expected:** `204`

---

## Step 5 — OpenAPI Docs

Open: http://localhost:3001/api/docs

**Expected:** Swagger UI showing `auth` and `users` tag endpoints

---

## Step 6 — Unit Test Coverage

```bash
cd backend/auth-service
npm run test:cov
```

**Expected:**
- All tests pass
- Line coverage ≥ 80%

---

## Step 7 — Integration Tests

```bash
cd backend/auth-service
npm run test:e2e
```

**Expected:** All integration test cases pass (requires Docker for Testcontainers)

---

## Step 8 — Frontend

```bash
cd frontend
npm install
npm run dev
```

Open: http://localhost:5173

**Expected:**
- `/login` page renders with email + password fields
- `/register` page renders with full name, email, password, confirm password
- Register → creates account → redirects to login
- Login → redirects to `/dashboard`
- Dashboard shows user name, roles, permissions
- Sign out → back to login

---

## Step 9 — GitHub Commit

Once all above steps pass:

```bash
# From repo root
git add .
git commit -m "feat: Phase 1 - Authentication, RBAC, PostgreSQL (auth-service + frontend login)"
git push origin main
```

---

## ✅ Phase 1 Complete

Move on to Phase 2: Service Catalog.
