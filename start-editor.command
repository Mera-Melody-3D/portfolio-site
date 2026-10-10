#!/bin/bash
# Starts a tiny local web server for this folder and opens the site (macOS / Linux).
cd "$(dirname "$0")"
PORT=8000
echo "Site editor: http://localhost:$PORT/index.html  (open in Chrome, press E)"
( sleep 1.5; (open "http://localhost:$PORT/index.html" || xdg-open "http://localhost:$PORT/index.html") >/dev/null 2>&1 ) &
python3 -m http.server $PORT || python -m http.server $PORT
