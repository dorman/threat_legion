#!/usr/bin/env bash
set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()    { echo -e "${GREEN}[setup]${NC} $1"; }
warn()    { echo -e "${YELLOW}[setup]${NC} $1"; }
error()   { echo -e "${RED}[setup]${NC} $1"; exit 1; }

# ── 1. Check pnpm ────────────────────────────────────────────────────────────
if ! command -v pnpm &>/dev/null; then
  warn "pnpm not found. Installing via npm..."
  npm install -g pnpm || error "Failed to install pnpm"
fi
info "pnpm: $(pnpm --version)"

# ── 2. Install dependencies ───────────────────────────────────────────────────
info "Installing dependencies..."
pnpm install

# ── 3. Create backend .env ────────────────────────────────────────────────────
API_ENV="artifacts/api-server/.env"
if [ ! -f "$API_ENV" ]; then
  cp "artifacts/api-server/.env.example" "$API_ENV"
  info "Created $API_ENV from .env.example"
  warn "Edit $API_ENV and set DATABASE_URL if your Postgres isn't at localhost/threat_legion"
else
  info "$API_ENV already exists — skipping"
fi

# ── 4. Create frontend .env ───────────────────────────────────────────────────
WEB_ENV="artifacts/threat-legion/.env"
if [ ! -f "$WEB_ENV" ]; then
  cp "artifacts/threat-legion/.env.example" "$WEB_ENV"
  info "Created $WEB_ENV from .env.example"
else
  info "$WEB_ENV already exists — skipping"
fi

# ── 5. Ensure PostgreSQL is running ──────────────────────────────────────────
# Try to start Postgres via brew services if it isn't already listening on 5432
if ! nc -z 127.0.0.1 5432 2>/dev/null; then
  if command -v brew &>/dev/null; then
    # Find whichever brew postgres formula is installed
    PG_SVC=$(brew services list 2>/dev/null | awk '/^postgresql/ {print $1}' | head -1)
    if [ -n "$PG_SVC" ]; then
      info "Starting $PG_SVC via Homebrew..."
      brew services start "$PG_SVC"
      # Give it a moment to come up
      sleep 2
    else
      warn "No Homebrew PostgreSQL service found. Install with: brew install postgresql@16"
    fi
  else
    warn "PostgreSQL is not listening on port 5432. Please start it before continuing."
  fi
else
  info "PostgreSQL is already running"
fi

# ── 6. Create the database ────────────────────────────────────────────────────
# Read DATABASE_URL from the backend .env
DB_URL=$(grep -E '^DATABASE_URL=' "$API_ENV" | cut -d= -f2-)
DB_NAME=$(echo "$DB_URL" | sed 's|.*/||')

if command -v createdb &>/dev/null; then
  if createdb "$DB_NAME" 2>/dev/null; then
    info "Database '$DB_NAME' created"
  else
    info "Database '$DB_NAME' already exists — skipping"
  fi
else
  warn "createdb not found — skipping database creation. Create the database manually:"
  warn "  createdb $DB_NAME"
fi

# ── 7. Push schema ────────────────────────────────────────────────────────────
info "Pushing database schema..."
# Export DATABASE_URL for drizzle-kit
export DATABASE_URL="$DB_URL"
pnpm --filter @workspace/db run push || {
  warn "Schema push failed. Try running manually after ensuring Postgres is running:"
  warn "  export DATABASE_URL=$DB_URL"
  warn "  pnpm --filter @workspace/db run push"
}

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}Setup complete.${NC}"
echo ""
echo "  Start dev servers:  pnpm dev"
echo "  Backend:            http://localhost:5000"
echo "  Frontend:           http://localhost:3000"
echo ""
echo "  Then open http://localhost:3000 and add your AI provider key in Settings."
echo ""
