@echo off
REM ===========================================================================
REM  Carica la pipeline nel repository GitHub.
REM  Doppio clic su questo file. Ti chiedera' username e password/token.
REM ===========================================================================
setlocal
cd /d "%~dp0"

echo.
echo === Controllo di git ===
git --version
if errorlevel 1 (
  echo.
  echo GIT NON TROVATO. Installalo da https://git-scm.com/download/win
  pause
  exit /b 1
)

echo.
echo === Preparazione del repository locale ===
if not exist ".git" (
  git init -b main
) else (
  echo (il repository locale c'e' gia')
)

git add -A
git commit -m "pipeline listino: rigenera i prezzi ogni 15 minuti"

echo.
echo === Collegamento al repository GitHub ===
git remote remove origin 2>nul
git remote add origin https://github.com/GioPo00/BoTariello.git
git remote -v

echo.
echo === Caricamento ===
git push -u origin main

echo.
echo ======================================================================
echo  Se il caricamento e' andato bene, adesso:
echo.
echo  1. Vai su https://github.com/GioPo00/BoTariello/settings/actions
echo     e metti "Read and write permissions".
echo.
echo  2. Vai su https://github.com/GioPo00/BoTariello/actions
echo     -> clicca "listino" -> "Run workflow" -> Run workflow.
echo        Ripeti con "galleria".
echo.
echo  3. Aspetta qualche minuto e verifica:
echo     https://raw.githubusercontent.com/GioPo00/BoTariello/dati/listino-console.json
echo     https://raw.githubusercontent.com/GioPo00/BoTariello/galleria/catalogo-fc27.json
echo.
echo  4. Ricarica l'estensione NOVAFUT (chrome://extensions -> ricarica).
echo ======================================================================
echo.
pause
