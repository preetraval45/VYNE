# ============================================================
# VYNE — Application Load Balancer Module
# Internet-facing ALB + HTTPS + per-service target groups
# ============================================================

locals {
  name = "vyne-${var.environment}"

  # Service name -> internal port + health check path
  services = {
    "api-gateway"            = { port = 4000, health_path = "/health" }
    "core-service"           = { port = 5001, health_path = "/health" }
    "projects-service"       = { port = 5002, health_path = "/health" }
    "messaging-service"      = { port = 5003, health_path = "/health" }
    "ai-service"             = { port = 5004, health_path = "/health" }
    "erp-service"            = { port = 5005, health_path = "/health" }
    "observability-service"  = { port = 5006, health_path = "/health" }
    "notification-service"   = { port = 5007, health_path = "/health" }
    "web"                    = { port = 3000, health_path = "/" }
  }
}

# ── Application Load Balancer ─────────────────────────────────

resource "aws_lb" "main" {
  name               = "${local.name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.sg_alb_id]
  subnets            = var.public_subnet_ids

  enable_deletion_protection = var.environment == "prod"
  enable_http2               = true

  access_logs {
    bucket  = var.logs_bucket
    prefix  = "alb/${var.environment}"
    enabled = true
  }

  tags = { Name = "${local.name}-alb" }
}

# ── HTTPS Listener ────────────────────────────────────────────

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.acm_certificate_arn

  # Default: forward to web app
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.services["web"].arn
  }
}

# ── HTTP → HTTPS Redirect ─────────────────────────────────────

resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# ── Target Groups ─────────────────────────────────────────────

resource "aws_lb_target_group" "services" {
  for_each = local.services

  name        = "${local.name}-tg-${substr(each.key, 0, min(length(each.key), 20))}"
  port        = each.value.port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = each.value.health_path
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  deregistration_delay = 30

  tags = { Service = each.key }
}

# ── Listener Rules ────────────────────────────────────────────

resource "aws_lb_listener_rule" "api_gateway" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 10

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.services["api-gateway"].arn
  }

  condition {
    path_pattern { values = ["/api/*", "/socket.io/*"] }
  }
}

resource "aws_lb_listener_rule" "core_service" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 20

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.services["core-service"].arn
  }

  condition {
    path_pattern { values = ["/core/*"] }
  }
}
