<#
PowerShell script to create a pg_dump backup using DATABASE_URL from .env.production or .env
Usage:
  # From repo root
  cd backend
  pwsh .\scripts\backup-db.ps1

This script will:
 - Read DATABASE_URL from .env.production (preferred) or .env
 - Parse user/host/port/db/password
 - Run pg_dump in custom format (-Fc) into ./backups with a timestamped filename
 - Remove the temporary PGPASSWORD env var after use

Notes:
 - Requires pg_dump in PATH (Postgres client tools). On Windows install PostgreSQL or use Chocolatey: choco install postgresql
 - Supabase connections require SSL; pg_dump uses libpq and will use sslmode if present in the URL.
#>

Set-StrictMode -Version Latest
try {
  $repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
  Set-Location $repoRoot
} catch {
  # if invoked from elsewhere, keep current location
}

$envFile = Join-Path (Resolve-Path ..) '.env.production'
if (-not (Test-Path $envFile)) { $envFile = Join-Path (Resolve-Path ..) '.env' }
if (-not (Test-Path $envFile)) { Write-Error "No .env.production or .env file found in parent folder. Please provide DATABASE_URL."; exit 1 }

$content = Get-Content $envFile -Raw
$match = [regex]::Match($content, 'DATABASE_URL\s*=\s*"?(?<url>[^"]+)"?')
if (-not $match.Success) { Write-Error "DATABASE_URL not found in $envFile"; exit 1 }

$dbUrl = $match.Groups['url'].Value.Trim()
Write-Host "Using DATABASE_URL from $envFile"

# parse postgresql://user:pass@host:port/dbname?params
$regex = 'postgres(?:ql)?:\/\/(?<user>[^:]+):(?<pass>[^@]+)@(?<host>[^:\/]+):(?<port>\d+)\/(?<db>[^?]+)(\?(?<params>.*))?'
$m = [regex]::Match($dbUrl, $regex)
if (-not $m.Success) {
  Write-Host "DATABASE_URL is not in expected format; attempting to pass full URL to pg_dump"
  $useFull = $true
} else {
  $dbUser = $m.Groups['user'].Value
  $dbPass = $m.Groups['pass'].Value
  $dbHost = $m.Groups['host'].Value
  $dbPort = $m.Groups['port'].Value
  $dbName = $m.Groups['db'].Value
  $dbParams = $m.Groups['params'].Value
  $useFull = $false
}

$timestamp = (Get-Date).ToString('yyyyMMdd_HHmmss')
$backupDir = Join-Path (Resolve-Path ..) 'backups'
New-Item -Path $backupDir -ItemType Directory -Force | Out-Null
$backupFile = Join-Path $backupDir "sagipero_$timestamp.dump"

if ($useFull) {
  # Try to run pg_dump with connection string
  Write-Host "Running pg_dump with full connection string to: $backupFile"
  $env:PGPASSWORD = ''
  & pg_dump.exe $dbUrl -Fc -f $backupFile
  $exit = $LASTEXITCODE
} else {
  Write-Host "Running pg_dump to: $backupFile"
  $env:PGPASSWORD = $dbPass
  & pg_dump.exe -h $dbHost -p $dbPort -U $dbUser -d $dbName -Fc -f $backupFile
  $exit = $LASTEXITCODE
}

# cleanup
if (Test-Path Env:\PGPASSWORD) { Remove-Item Env:\PGPASSWORD }

if ($exit -eq 0) { Write-Host "✅ Backup completed: $backupFile" } else { Write-Error "pg_dump failed with exit code $exit"; exit $exit }

Write-Host "Tip: encrypt the dump with GPG if storing offsite: gpg --symmetric --cipher-algo AES256 $backupFile"
