$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$tsx = Join-Path $root "node_modules\tsx\dist\cli.mjs"
$stdout = Join-Path $root "bridge.stdout.log"
$stderr = Join-Path $root "bridge.stderr.log"
$node = (Get-Command node.exe).Source

if (-not (Test-Path -LiteralPath $tsx)) {
  throw "No se encontró tsx. Ejecutá npm install desde bridge-huella antes de iniciar el servicio."
}

$arguments = '"' + $tsx + '" src/index.ts'
$proceso = Start-Process -FilePath $node -ArgumentList $arguments -WorkingDirectory $root `
  -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
Write-Output "Puente ATILRA iniciado en segundo plano. PID: $($proceso.Id)"
Write-Output "Logs: $stdout y $stderr"
