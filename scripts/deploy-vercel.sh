#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "===================================================="
echo "   PRINTHEAVEN - Automated Vercel Deployment"
echo "===================================================="

# 1. Verify Frontend Build
echo -e "\n[1/3] Building & verifying Frontend..."
cd "$PROJECT_ROOT/frontend"
npm run build
echo "Frontend build passed cleanly!"

# 2. Verify Backend Index
echo -e "\n[2/3] Verifying Backend Serverless API..."
cd "$PROJECT_ROOT"
python3 -c "import api.index; print('Backend loaded successfully:', api.index.app)"
echo "Backend API import verified!"

# 3. Deploy to Vercel
echo -e "\n[3/3] Deploying to Vercel Production..."
if command -v vercel &> /dev/null; then
    vercel --prod
else
    npx vercel --prod
fi

echo -e "\nDeployment completed successfully!"
