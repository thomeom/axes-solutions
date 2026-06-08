#!/bin/zsh
set -e

cd "$(dirname "$0")"

SITE_PACKAGES=$(find "$PWD/backend/.venv/lib" -type d -name site-packages 2>/dev/null | head -n 1)

if [ -z "$SITE_PACKAGES" ] || [ ! -d "$SITE_PACKAGES/fastapi" ] || [ ! -d "$SITE_PACKAGES/sqlalchemy" ] || [ ! -d "$SITE_PACKAGES/reportlab" ]; then
  echo "Preparing Python backend environment..."
  python3 -m venv backend/.venv
  backend/.venv/bin/python -m pip install --upgrade pip
  backend/.venv/bin/python -m pip install -r backend/requirements.txt
  SITE_PACKAGES=$(find "$PWD/backend/.venv/lib" -type d -name site-packages | head -n 1)
fi

export PYTHONPATH="$SITE_PACKAGES"
API_PORT="${API_PORT:-8000}"
WEB_PORT="${WEB_PORT:-8080}"

while lsof -i ":$WEB_PORT" -sTCP:LISTEN -n -P >/dev/null 2>&1; do
  WEB_PORT=$((WEB_PORT + 1))
done

echo "Starting Axes Solutions..."
echo "Backend:  http://127.0.0.1:$API_PORT/api/health"
echo "Frontend: http://127.0.0.1:$WEB_PORT/html/index.html"
echo "Account:  http://127.0.0.1:$WEB_PORT/html/account.html"

python3 -m uvicorn backend.server:app --host 127.0.0.1 --port "$API_PORT" &
API_PID=$!

python3 -m http.server "$WEB_PORT" --directory frontend &
WEB_PID=$!

cleanup() {
  kill "$API_PID" "$WEB_PID" 2>/dev/null || true
}

trap cleanup EXIT INT TERM
wait
