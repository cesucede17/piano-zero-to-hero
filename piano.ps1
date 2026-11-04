# Atajo para todo el curso. Ejemplos:
#   .\piano.ps1 lab 1              -> abre el laboratorio de la lección 1
#   .\piano.ps1 video 1            -> genera el vídeo de la lección 1
#   .\piano.ps1 midi               -> comprueba que el PC ve tu piano
#   .\piano.ps1 practica 25 "escalas"  -> apunta 25 min de práctica
#   .\piano.ps1 progreso           -> abre el panel de progreso en el navegador

param(
    [Parameter(Position = 0)][string]$Comando = 'ayuda',
    [Parameter(Position = 1, ValueFromRemainingArguments = $true)][string[]]$Resto
)

$Repo = $PSScriptRoot
$Py = Join-Path $env:USERPROFILE '.venvs\piano\Scripts\python.exe'
$env:PYTHONUTF8 = '1'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

if (-not (Test-Path $Py)) {
    Write-Host 'Falta la instalación. Ejecuta primero:' -ForegroundColor Yellow
    Write-Host '  powershell -ExecutionPolicy Bypass -File .\setup.ps1'
    exit 1
}

function Buscar-Leccion($num) {
    $prefijo = '{0:D2}-' -f [int]$num
    $dir = Get-ChildItem (Join-Path $Repo 'lessons') -Directory | Where-Object Name -like "$prefijo*" | Select-Object -First 1
    if (-not $dir) { Write-Host "No existe la lección $num todavía." -ForegroundColor Yellow; exit 1 }
    return $dir.FullName
}

Push-Location $Repo
try {
    switch ($Comando) {
        'lab' {
            $dir = Buscar-Leccion $Resto[0]
            & $Py (Join-Path $dir 'lab\run.py') @($Resto | Select-Object -Skip 1)
        }
        'video' {
            $dir = Buscar-Leccion $Resto[0]
            & $Py (Join-Path $Repo 'tools\render_video.py') $dir @($Resto | Select-Object -Skip 1)
        }
        'midi' { & $Py -m tools.midi_check @Resto }
        'practica' { & $Py -m tools.progress practica @Resto }
        'progreso' { & $Py -m streamlit run (Join-Path $Repo 'progress\dashboard.py') }
        default {
            Write-Host 'Comandos:' -ForegroundColor Cyan
            Write-Host '  .\piano.ps1 lab 1                  laboratorio de la lección 1'
            Write-Host '  .\piano.ps1 video 1                generar el vídeo de la lección 1'
            Write-Host '  .\piano.ps1 midi                   comprobar el piano por USB-MIDI'
            Write-Host '  .\piano.ps1 practica 25 "notas"    apuntar minutos de práctica'
            Write-Host '  .\piano.ps1 progreso               panel de progreso'
        }
    }
}
finally { Pop-Location }
