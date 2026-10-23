#!/bin/sh
# ============================================
# Session de navigateur persistante pour les tests en vrai navigateur.
# Lance UN Chromium (port CDP 9222, profil dans tests/e2e/output-devbrowser/) qui
# reste ouvert : les tests e2e s'y connectent au lieu de lancer leur propre
# navigateur, chacun dans son propre contexte (refermé à la fin du test).
#
#   npm run browser:start                       (ne fait rien s'il tourne déjà)
#   CDP_URL=http://127.0.0.1:9222 npm run test:sets
#   npm run browser:stop
# Navigateur : CHROME_PATH, sinon /opt/pw-browsers/chromium (sessions Claude Code),
# sinon google-chrome / chromium du système.
# ============================================
ROOT=$(cd "$(dirname "$0")/.." && pwd)
DIR="$ROOT/tests/e2e/output-devbrowser"
PORT=${DEVBROWSER_PORT:-9222}
URL="http://127.0.0.1:$PORT/json/version"
running() { curl -s --noproxy '*' "$URL" >/dev/null 2>&1; }

if [ "$1" = "stop" ]; then
    if [ -f "$DIR/chromium.pid" ] && kill "$(cat "$DIR/chromium.pid")" 2>/dev/null; then
        rm -f "$DIR/chromium.pid"; echo "Session arrêtée."
    else
        echo "Aucune session lancée par ce script."
    fi
    exit 0
fi
if running; then echo "Session déjà ouverte : CDP_URL=http://127.0.0.1:$PORT"; exit 0; fi

BIN=${CHROME_PATH:-}
[ -z "$BIN" ] && [ -x /opt/pw-browsers/chromium ] && BIN=/opt/pw-browsers/chromium
[ -z "$BIN" ] && BIN=$(command -v google-chrome || command -v chromium || command -v chromium-browser)
[ -z "$BIN" ] && { echo "Aucun Chrome/Chromium trouvé (définir CHROME_PATH)."; exit 1; }

mkdir -p "$DIR/profile"
# --no-sandbox : nécessaire quand on tourne en root (conteneurs), comme le fait Playwright
nohup "$BIN" --headless=new --no-sandbox --remote-debugging-port="$PORT" --user-data-dir="$DIR/profile" \
    --no-first-run --no-default-browser-check --window-size=1400,1000 about:blank \
    > "$DIR/chromium.log" 2>&1 &
echo $! > "$DIR/chromium.pid"
i=0
while [ $i -lt 20 ]; do
    sleep 0.5
    if running; then echo "Session ouverte : CDP_URL=http://127.0.0.1:$PORT"; exit 0; fi
    i=$((i + 1))
done
echo "Échec du lancement, voir $DIR/chromium.log"; exit 1
