@echo off
rem Starts a tiny local web server for this folder and opens the site.
rem Leave this window open while you edit. Close it (or press Ctrl+C) when you are done.
cd /d "%~dp0"
set PORT=8000
echo.
echo   Site editor: http://localhost:%PORT%/index.html
echo   Open it in Chrome or Edge, then press E to open the editor panel.
echo.
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:%PORT%/index.html"
where py >nul 2>nul && ( py -m http.server %PORT% & goto :eof )
where python >nul 2>nul && ( python -m http.server %PORT% & goto :eof )
where npx >nul 2>nul && ( npx --yes http-server -p %PORT% -c-1 & goto :eof )
echo Could not find Python or Node.js. Install Python from python.org (tick "Add to PATH"), or use VS Code with the "Live Server" extension.
pause
