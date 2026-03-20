# ============================================================
# VYNE — SQS + SNS Module
# FIFO queues with DLQs + SNS push topic
# ============================================================

locals {
  name = "vyne-${var.environment}"
  queues = {
    "erp"           = { group = "erp-events" }
    "messaging"     = { group = "messaging-events" }
    "notifications" = { group = "notification-events" }
    "ai"            = { group = "ai-triggers" }
  }
}

# ── Dead-Letter Queues ────────────────────────────────────────

resource "aws_sqs_queue" "dlq" {
  for_each = local.queues

  name                        = "${local.name}-${each.key}-dlq.fifo"
  fifo_queue                  = true
  content_based_deduplication = true
  message_retention_seconds   = 1209600 # 14 days

  tags = { Queue = each.key, Type = "dlq" }
}

# ── FIFO Queues ───────────────────────────────────────────────

resource "aws_sqs_queue" "main" {
  for_each = local.queues

  name                        = "${local.name}-${each.key}.fifo"
  fifo_queue                  = true
  content_based_deduplication = true

  visibility_timeout_seconds = 30
  message_retention_seconds  = 86400   # 1 day
  max_message_size           = 262144  # 256 KB

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq[each.key].arn
    maxReceiveCount     = 3
  })

  tags = { Queue = each.key }
}

# ── Queue Policy: Allow EventBridge to send ───────────────────

resource "aws_sqs_queue_policy" "main" {
  for_each  = aws_sqs_queue.main
  queue_url = each.value.url

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowEventBridge"
        Effect = "Allow"
        Principal = { Service = "events.amazonaws.com" }
        Action   = "sqs:SendMessage"
        Resource = each.value.arn
        Condition = {
          ArnEquals = {
            "aws:SourceArn" = "arn:aws:events:*:*:rule/*"
          }
        }
      }
    ]
  })
}

# ── SNS Topic for Mobile Push ─────────────────────────────────

resource "aws_sns_topic" "push_notifications" {
  name         = "${local.name}-push-notifications"
  display_name = "Vyne Push Notifications"

  tags = { Name = "${local.name}-push-notifications" }
}
