<#
.SYNOPSIS
    Sets up GitHub secrets required for the CD pipeline.
    Run once after cloning the repo.

.PREREQUISITES
    - GitHub CLI (gh) installed and authenticated
    - Docker logged in to GHCR

.USAGE
    .\scripts\setup-cd.ps1 -Repo "sourabhbarwal/IDP"
#>

param(
  [string]$Repo = "sourabhbarwal/IDP",
  [string]$DeployHost = "",
  [string]$DeployUser = "ubuntu",
  [string]$DeployPath = "/home/ubuntu/IDP"
)

Write-Host "=== IDP Platform CD Pipeline Setup ===" -ForegroundColor Cyan

# Check gh CLI is installed
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  Write-Host "GitHub CLI not found. Install from: https://cli.github.com" -ForegroundColor Red
  exit 1
}

# GHCR_TOKEN — use GitHub Actions token (GITHUB_TOKEN is automatic in Actions)
# For local testing you need a PAT with write:packages
Write-Host "`n1. Creating GHCR access..." -ForegroundColor Yellow
Write-Host "   GitHub Actions uses GITHUB_TOKEN automatically for GHCR."
Write-Host "   For local docker push, run:"
Write-Host "   echo `$env:GITHUB_TOKEN | docker login ghcr.io -u <your-github-username> --password-stdin"

# Generate SSH key for deployment
Write-Host "`n2. Generating deployment SSH key pair..." -ForegroundColor Yellow
$keyPath = "secrets\deploy_key"
New-Item -ItemType Directory -Force -Path secrets | Out-Null

if (Get-Command ssh-keygen -ErrorAction SilentlyContinue) {
  ssh-keygen -t ed25519 -C "idp-deploy-key" -f $keyPath -N '""'
  Write-Host "   Private key: $keyPath" -ForegroundColor Green
  Write-Host "   Public key:  $keyPath.pub" -ForegroundColor Green
  Write-Host "`n   Add the PUBLIC key to your server's ~/.ssh/authorized_keys"
  Write-Host "   Add the PRIVATE key as GitHub secret DEPLOY_SSH_KEY"
} else {
  Write-Host "   ssh-keygen not found. Generate manually with:" -ForegroundColor Yellow
  Write-Host "   docker run --rm -v `"${PWD}/secrets:/out`" alpine sh -c 'ssh-keygen -t ed25519 -f /out/deploy_key -N `"`"'"
}

# Set GitHub Secrets
if ($DeployHost) {
  Write-Host "`n3. Setting GitHub repository secrets..." -ForegroundColor Yellow

  $privateKey = Get-Content "$keyPath" -Raw -ErrorAction SilentlyContinue
  if ($privateKey) {
    gh secret set DEPLOY_SSH_KEY --repo $Repo --body $privateKey
    Write-Host "   ✅ DEPLOY_SSH_KEY set" -ForegroundColor Green
  }

  gh secret set DEPLOY_HOST --repo $Repo --body $DeployHost
  Write-Host "   ✅ DEPLOY_HOST set to $DeployHost" -ForegroundColor Green

  gh secret set DEPLOY_USER --repo $Repo --body $DeployUser
  Write-Host "   ✅ DEPLOY_USER set to $DeployUser" -ForegroundColor Green

  gh secret set DEPLOY_PATH --repo $Repo --body $DeployPath
  Write-Host "   ✅ DEPLOY_PATH set to $DeployPath" -ForegroundColor Green
} else {
  Write-Host "`n3. Skipping secret setup (no DeployHost provided)." -ForegroundColor Yellow
  Write-Host "   Run with -DeployHost <ip> when you have a server."
}

# Add secrets directory to .gitignore
$gitignore = Get-Content .gitignore -ErrorAction SilentlyContinue
if ($gitignore -notcontains "secrets/deploy_key") {
  Add-Content .gitignore "`nsecrets/deploy_key`nsecrets/deploy_key.pub"
  Write-Host "`n✅ Added secrets/deploy_key to .gitignore" -ForegroundColor Green
}

Write-Host "`n=== Setup complete ===" -ForegroundColor Cyan
Write-Host "`nNext steps:" -ForegroundColor White
Write-Host "1. Add public key ($keyPath.pub) to server ~/.ssh/authorized_keys"
Write-Host "2. Copy docker-compose.prod.yml to server at $DeployPath"
Write-Host "3. Set GROQ_API_KEY and other secrets on the server in $DeployPath/.env"
Write-Host "4. Push to main → CD pipeline triggers automatically"
Write-Host "5. Create a release tag: git tag v1.0.0 && git push origin v1.0.0"