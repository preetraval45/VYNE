# ============================================================
# VYNE — EventBridge Module
# Custom event bus + routing rules to SQS
# ============================================================

locals {
  name = "vyne-${var.environment}"
}

resource "aws_cloudwatch_event_bus" "main" {
  name = "vyne-events-${var.environment}"
  tags = { Name = "${local.name}-event-bus" }
}

# ── Archive all events for 30 days (replay capability) ────────

resource "aws_cloudwatch_event_archive" "main" {
  name             = "${local.name}-events-archive"
  event_source_arn = aws_cloudwatch_event_bus.main.arn
  retention_days   = 30
}

# ── Rules: Route domain events to SQS queues ─────────────────

resource "aws_cloudwatch_event_rule" "erp_events" {
  name           = "${local.name}-erp-events"
  description    = "Route ERP domain events to SQS"
  event_bus_name = aws_cloudwatch_event_bus.main.name

  event_pattern = jsonencode({
    source = [{ prefix = "vyne.erp" }]
  })
}

resource "aws_cloudwatch_event_target" "erp_to_sqs" {
  rule           = aws_cloudwatch_event_rule.erp_events.name
  event_bus_name = aws_cloudwatch_event_bus.main.name
  arn            = var.erp_queue_arn

  sqs_target {
    message_group_id = "erp-events"
  }
}

resource "aws_cloudwatch_event_rule" "ai_events" {
  name           = "${local.name}-ai-trigger-events"
  description    = "Route events that trigger AI agents"
  event_bus_name = aws_cloudwatch_event_bus.main.name

  event_pattern = jsonencode({
    source = [
      { prefix = "vyne.observability" },
      { prefix = "vyne.erp" }
    ]
    "detail-type" = [
      "vyne.deployment.failed",
      "vyne.alert.fired",
      "vyne.inventory.low",
      "vyne.order.failed"
    ]
  })
}

resource "aws_cloudwatch_event_target" "ai_events_to_sqs" {
  rule           = aws_cloudwatch_event_rule.ai_events.name
  event_bus_name = aws_cloudwatch_event_bus.main.name
  arn            = var.ai_queue_arn

  sqs_target {
    message_group_id = "ai-triggers"
  }
}

resource "aws_cloudwatch_event_rule" "notification_events" {
  name           = "${local.name}-notification-events"
  description    = "Route events that trigger notifications"
  event_bus_name = aws_cloudwatch_event_bus.main.name

  event_pattern = jsonencode({
    "detail-type" = [
      "vyne.message.mention",
      "vyne.issue.assigned",
      "vyne.alert.fired",
      "vyne.user.invited"
    ]
  })
}

resource "aws_cloudwatch_event_target" "notifications_to_sqs" {
  rule           = aws_cloudwatch_event_rule.notification_events.name
  event_bus_name = aws_cloudwatch_event_bus.main.name
  arn            = var.notifications_queue_arn

  sqs_target {
    message_group_id = "notifications"
  }
}
