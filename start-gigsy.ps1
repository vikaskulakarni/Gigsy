$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root
if (-not (Test-Path '.env.local')) { throw 'Run .\setup-gigsy.ps1 first.' }
& npm.cmd run dev
