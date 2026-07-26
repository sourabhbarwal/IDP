<#
.SYNOPSIS
    Generates RSA key pair for JWT RS256 signing.
    Run once — commit public key, keep private key in secrets manager.

.USAGE
    .\scripts\generate-jwt-keys.ps1
#>

$keyDir = "secrets\jwt"
New-Item -ItemType Directory -Force -Path $keyDir | Out-Null

Write-Host "Generating 4096-bit RSA key pair for JWT RS256..." -ForegroundColor Cyan

# Check if openssl is available
if (-not (Get-Command openssl -ErrorAction SilentlyContinue)) {
  Write-Host "openssl not found. Installing via Git for Windows..." -ForegroundColor Yellow
  Write-Host "Or run: winget install ShiningLight.OpenSSL" -ForegroundColor Yellow
  Write-Host "Or use the Docker-based generation below:" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "docker run --rm -v `"${PWD}/secrets/jwt:/out`" alpine/openssl sh -c \" -ForegroundColor White
  Write-Host "  openssl genrsa -out /out/private.pem 4096 && \" -ForegroundColor White
  Write-Host "  openssl rsa -in /out/private.pem -pubout -out /out/public.pem" -ForegroundColor White
  Write-Host '"""' -ForegroundColor White
  exit 1
}

# Generate private key
openssl genrsa -out "$keyDir\private.pem" 4096
Write-Host "✅ Private key: $keyDir\private.pem" -ForegroundColor Green

# Extract public key
openssl rsa -in "$keyDir\private.pem" -pubout -out "$keyDir\public.pem"
Write-Host "✅ Public key:  $keyDir\public.pem" -ForegroundColor Green

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Add secrets/jwt/private.pem to .gitignore (NEVER commit the private key)" -ForegroundColor White
Write-Host "2. Set JWT_PRIVATE_KEY_PATH=./secrets/jwt/private.pem in auth-service .env" -ForegroundColor White
Write-Host "3. Set JWT_PUBLIC_KEY_PATH=./secrets/jwt/public.pem in all other services .env" -ForegroundColor White
Write-Host "4. Set JWT_ALGORITHM=RS256 in all services" -ForegroundColor White
Write-Host ""
Write-Host "For now, local dev uses HS256 (JWT_ALGORITHM=HS256)" -ForegroundColor Yellow
Write-Host "Set JWT_ALGORITHM=RS256 only when private key is provisioned" -ForegroundColor Yellow