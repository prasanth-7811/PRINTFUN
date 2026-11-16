# PrintHeaven - Vercel Automated Deployment Script (PowerShell)
# Usage: .\scripts\deploy-vercel.ps1 [-Prod]

param(
    [switch]$Prod = $true
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "   PRINTHEAVEN - Automated Vercel Deployment" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

# 1. Verify Frontend Build
Write-Host "`n[1/3] Building & verifying Frontend..." -ForegroundColor Yellow
Push-Location "$ProjectRoot\frontend"
try {
    npm run build
    Write-Host "Frontend build passed cleanly!" -ForegroundColor Green
} finally {
    Pop-Location
}

# 2. Verify Backend Index
Write-Host "`n[2/3] Verifying Backend Serverless API..." -ForegroundColor Yellow
Push-Location $ProjectRoot
try {
    if (Test-Path "$ProjectRoot\backend\venv\Scripts\python.exe") {
        & "$ProjectRoot\backend\venv\Scripts\python.exe" -c "import api.index; print('Backend loaded successfully:', api.index.app)"
        Write-Host "Backend API import verified!" -ForegroundColor Green
    } else {
        python -c "import api.index; print('Backend loaded successfully:', api.index.app)"
        Write-Host "Backend API import verified!" -ForegroundColor Green
    }
} finally {
    Pop-Location
}

# 3. Deploy to Vercel
Write-Host "`n[3/3] Deploying to Vercel..." -ForegroundColor Yellow
Push-Location $ProjectRoot
try {
    $deployArgs = @()
    if ($Prod) {
        $deployArgs += "--prod"
    }
    
    if (Get-Command vercel -ErrorAction SilentlyContinue) {
        Write-Host "Running: vercel $($deployArgs -join ' ')" -ForegroundColor Cyan
        vercel @deployArgs
    } else {
        Write-Host "Vercel CLI not found globally. Running via npx vercel..." -ForegroundColor Cyan
        npx vercel @deployArgs
    }
    Write-Host "`nDeployment completed successfully!" -ForegroundColor Green
} finally {
    Pop-Location
}
