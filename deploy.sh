#!/usr/bin/env bash
# =================================================================
# NARRATA — Google Cloud Run Deployment Script
# =================================================================

set -e

# Configuration
SERVICE_NAME="narrata-agent"
REGION="us-central1"
PROJECT_ID=$(gcloud config get-value project 2>/dev/null || echo "")

if [ -z "$PROJECT_ID" ]; then
  echo "Error: No active GCP project found. Run 'gcloud config set project YOUR_PROJECT_ID' first."
  exit 1
fi

echo "Deploying Narrata to Google Cloud Run in project: $PROJECT_ID ($REGION)..."

# Build and deploy container directly via Cloud Build and Cloud Run
gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "PORT=8080" \
  --memory 1Gi \
  --timeout 300s

echo "Deployment successful! Service URL:"
gcloud run services describe "$SERVICE_NAME" --platform managed --region "$REGION" --format="value(status.url)"
