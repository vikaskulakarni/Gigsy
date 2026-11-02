$ErrorActionPreference='Stop'
$Root=(Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Set-Location $Root
if(-not(Test-Path '.env.local')){throw 'Run scripts\windows\setup-gigsy.ps1 first.'}
& npm.cmd run dev
