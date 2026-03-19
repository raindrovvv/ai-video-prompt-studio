$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

if (-not $env:CODEX_BIN) {
  $localCodexCmd = Join-Path $env:USERPROFILE "AppData\Roaming\npm\codex.cmd"
  if (Test-Path $localCodexCmd) {
    $env:CODEX_BIN = $localCodexCmd
  }
}

node server.js
