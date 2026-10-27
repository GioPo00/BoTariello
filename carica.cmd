@echo off
REM ===========================================================================
REM  Carica la pipeline nel repository GitHub.
REM  Doppio clic su questo file. Ti chiedera' login (si apre il browser).
REM  Se il caricamento e' gia' stato fatto, non fa niente di dannoso.
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
echo === Identita' (serve per firmare i commit) ===
git config --local user.name  "GioPo00"
git config --local user.email "GioPo00@users.noreply.github.com"
echo   nome  : %GioPo00%
echo   email : GioPo00@users.noreply.github.com
echo   (se vuoi cambiarli, modificalo nelle prime due righe di questo file)

echo.
echo === Repository locale ===
if not exist ".git" git init -b main
git branch -M main
git add -A
git commit -m "pipeline listino: rigenera i prezzi ogni 15 minuti"
if errorlevel 1 (
  echo (nessuna modifica da caricare: il commit c'e' gia')
)

echo.
echo === Collegamento al repository GitHub ===
git remote remove origin 2>nul
git remote add origin https://github.com/GioPo00/BoTariello.git
git remote -v

echo.
echo === Caricamento ===
echo (si aprira' il browser per il login GitHub: completa la finestra)
git push -u origin main
if errorlevel 1 (
  echo.
  echo CARICAMENTO NON RIUSCITO. Cosa puo' essere:
  echo   - il login non e' stato completato nel browser;
  echo   - manca un token: in GitHub -> Settings -> Developer settings ->
  echo     Personal access tokens -> Fine-grained -> Contents: Read and write
  echo     sul solo repository BoTariello.
  pause
  exit /b 1
)

echo.
echo ======================================================================
echo  Caricamento riuscito. Adesso:
echo.
echo  1. github.com/GioPo00/BoTariello/settings/actions
echo     -> Workflow permissions -> "Read and write permissions".
echo
echo  2. github.com/GioPo00/BoTariello/actions
echo     -> clicca "listino" -> "Run workflow" -> Run workflow
echo     -> ripeti con "galleria"
echo
echo  3. Verifica che questi due URL rispondano col JSON:
echo     https://raw.githubusercontent.com/GioPo00/BoTariello/dati/listino-console.json
echo     https://raw.githubusercontent.com/GioPo00/BoTariello/galleria/catalogo-fc27.json
echo
echo  4. Ricarica l'estensione NOVAFUT (chrome://extensions -> ricarica).
echo ======================================================================
echo.
pause
