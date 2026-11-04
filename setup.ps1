# Instala todo lo que necesita el curso. Ejecutar UNA vez desde la carpeta del repo:
#   powershell -ExecutionPolicy Bypass -File .\setup.ps1
# Se puede repetir sin miedo: si algo ya está instalado, lo salta.

$ErrorActionPreference = 'Stop'
$Repo = $PSScriptRoot
# El entorno de Python va FUERA de OneDrive: OneDrive sincroniza miles de ficheros y lo rompe.
$Venv = Join-Path $env:USERPROFILE '.venvs\piano'
$Py = Join-Path $Venv 'Scripts\python.exe'

function Paso($texto) { Write-Host "`n==> $texto" -ForegroundColor Cyan }

Paso '1/4 Comprobando uv (gestor de Python)'
if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
    Write-Host 'uv no está instalado; instalándolo...'
    powershell -ExecutionPolicy Bypass -Command "irm https://astral.sh/uv/install.ps1 | iex"
    $env:Path = "$env:USERPROFILE\.local\bin;$env:Path"
}

Paso "2/4 Creando entorno de Python en $Venv e instalando librerías"
if (-not (Test-Path $Py)) { uv venv $Venv --python 3.12 }
uv pip install --python $Py -r (Join-Path $Repo 'requirements.txt')

Paso '3/4 Descargando el navegador que graba los vídeos (Chromium)'
& $Py -m playwright install chromium

Paso '4/4 Instalando Three.js (gráficos 3D de los vídeos)'
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host 'Node.js no está instalado; instalándolo con winget...'
    winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements
    $env:Path = "$env:ProgramFiles\nodejs;$env:Path"
}
Push-Location $Repo
npm install --no-fund --no-audit
Pop-Location

Write-Host "`nListo. Prueba:  .\piano.ps1 lab 1" -ForegroundColor Green
