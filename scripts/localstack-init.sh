#!/usr/bin/env bash
# ============================================================
# VYNE — LocalStack initialization (runs after LocalStack starts)
# Creates S3 buckets, SQS queues, SNS topics, EventBridge bus
# ============================================================

set -euo pipefail

AWS="aws --endpoint-url=http://localhost:4566 --region us-east-1"
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1

echo "[localstack] Initializing AWS resources..."

# ── S3 Buckets ────────────────────────────────────────────────
echo "[localstack] Creating S3 buckets..."
$AWS s3 mb s3://vyne-files-dev 2>/dev/null || true
$AWS s3api put-bucket-cors --bucket vyne-files-dev --cors-configuration '{
  "CORSRules": [{
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": ["http://localhost:3000"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }]
}' 2>/dev/null || true

# ── EventBridge Bus ───────────────────────────────────────────
echo "[localstack] Creating EventBridge bus..."
$AWS events create-event-bus --name vyne-events 2>/dev/null || true

# ── SQS Queues (FIFO) ─────────────────────────────────────────
echo "[localstack] Creating SQS queues..."

create_fifo_queue() {
  local name="$1"
  $AWS sqs create-queue \
    --queue-name "${name}.fifo" \
    --attributes '{
      "FifoQueue": "true",
      "ContentBasedDeduplication": "true",
      "MessageRetentionPeriod": "86400",
      "VisibilityTimeout": "30"
    }' 2>/dev/null || true

  # Dead-letter queue
  DLQ_ARN=$($AWS sqs create-queue \
    --queue-name "${name}-dlq.fifo" \
    --attributes '{"FifoQueue": "true", "ContentBasedDeduplication": "true"}' \
    --query 'QueueUrl' --output text 2>/dev/null || echo "")
}

create_fifo_queue "vyne-erp"
create_fifo_queue "vyne-messaging"
create_fifo_queue "vyne-notifications"
create_fifo_queue "vyne-ai"

# ── SNS Topic ─────────────────────────────────────────────────
echo "[localstack] Creating SNS topic..."
$AWS sns create-topic --name vyne-push-notifications 2>/dev/null || true

# ── Secrets Manager ───────────────────────────────────────────
echo "[localstack] Creating Secrets Manager secrets..."
$AWS secretsmanager create-secret \
  --name "vyne/dev/database" \
  --secret-string '{"url": "postgresql://vyne:vyne_dev_password@postgres:5432/vyne_dev"}' \
  2>/dev/null || true

$AWS secretsmanager create-secret \
  --name "vyne/dev/redis" \
  --secret-string '{"url": "redis://redis:6379"}' \
  2>/dev/null || true

$AWS secretsmanager create-secret \
  --name "vyne/dev/jwt" \
  --secret-string '{"secret": "local_dev_jwt_secret_replace_in_production_64_chars_min"}' \
  2>/dev/null || true

echo "[localstack] AWS resources initialized successfully!"
