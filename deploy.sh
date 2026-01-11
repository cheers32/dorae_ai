#!/bin/bash

# Deployment Helper Script for Dorae Task Manager

echo "🚀 Starting Deployment to Google Cloud Run..."

# 1. Check for gcloud
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: 'gcloud' CLI is not installed."
    echo "   Please run: brew install --cask google-cloud-sdk"
    echo "   Then run: gcloud auth login"
    exit 1
fi

# 2. Collect Configuration
echo ""
echo "Please provide your configuration:"
read -p "🔹 Enter your GCP Project ID: " PROJECT_ID
read -p "🔹 Enter your MongoDB URI: " MONGO_URI
read -p "🔹 Enter your Gemini API Key: " GEMINI_API_KEY

if [ -z "$PROJECT_ID" ] || [ -z "$MONGO_URI" ] || [ -z "$GEMINI_API_KEY" ]; then
    echo "❌ Error: All fields are required to deploy."
    exit 1
fi

# 3. Deploy
echo ""
echo "📦 Building and Deploying to Cloud Run (Region: us-central1)..."
echo "   (This may take a few minutes)"

gcloud run deploy dorae-task-manager \
  --source . \
  --project "$PROJECT_ID" \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars MONGO_URI="$MONGO_URI",GEMINI_API_KEY="$GEMINI_API_KEY"

echo ""
echo "✅ Deployment Process Finished!"
