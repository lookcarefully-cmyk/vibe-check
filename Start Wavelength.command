#!/bin/zsh
#
# Double-click this file in Finder to run Wavelength.
#
# It opens a Terminal window, starts the server, and opens the site in your
# browser. Leave the Terminal window open while you're using it — closing it
# (or pressing Control-C) stops the server.

cd "$(dirname "$0")" || exit 1

# This Mac has no system-wide Node, so point at the local install.
export PATH="$HOME/.local/node/bin:$PATH"

if ! command -v node >/dev/null 2>&1; then
  echo "Could not find Node at ~/.local/node/bin."
  echo "Press Return to close."
  read -r
  exit 1
fi

[ -d node_modules ] || npm install

# If it's already running, just open the browser and stop.
if lsof -nP -iTCP:3210 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Wavelength is already running. Opening it..."
  open "http://localhost:3210"
  echo "Press Return to close this window."
  read -r
  exit 0
fi

echo "Starting Wavelength..."
echo "The browser will open in a few seconds. Keep this window open."
echo

# Open the browser once the server is actually answering.
(
  for _ in $(seq 1 40); do
    if curl -s -o /dev/null --max-time 1 "http://localhost:3210/social-addictive"; then
      open "http://localhost:3210"
      exit 0
    fi
    sleep 1
  done
) &

npm run dev
