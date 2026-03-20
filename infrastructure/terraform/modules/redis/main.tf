# ============================================================
# VYNE — Redis / ElastiCache Valkey Module
# ============================================================

locals {
  name = "vyne-${var.environment}"
}

resource "random_password" "redis_auth" {
  length  = 32
  special = false
}

resource "aws_elasticache_subnet_group" "main" {
  name       = "${local.name}-redis-subnet-group"
  subnet_ids = var.isolated_subnet_ids

  tags = { Name = "${local.name}-redis-subnet-group" }
}

resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "${local.name}-valkey"
  description          = "Vyne ${var.environment} Valkey (Redis-compatible)"

  node_type            = var.node_type
  num_cache_clusters   = var.environment == "prod" ? 2 : 1
  port                 = 6379
  engine               = "valkey"
  engine_version       = "8.0"

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [var.sg_redis_id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = random_password.redis_auth.result

  automatic_failover_enabled = var.environment == "prod" ? true : false
  multi_az_enabled           = var.environment == "prod" ? true : false

  snapshot_retention_limit = var.environment == "prod" ? 7 : 1
  snapshot_window          = "04:00-05:00"

  tags = { Name = "${local.name}-valkey" }
}

resource "aws_secretsmanager_secret" "redis_credentials" {
  name                    = "vyne/${var.environment}/redis"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0
}

resource "aws_secretsmanager_secret_version" "redis_credentials" {
  secret_id = aws_secretsmanager_secret.redis_credentials.id
  secret_string = jsonencode({
    endpoint   = aws_elasticache_replication_group.main.primary_endpoint_address
    port       = 6379
    auth_token = random_password.redis_auth.result
    url        = "rediss://:${random_password.redis_auth.result}@${aws_elasticache_replication_group.main.primary_endpoint_address}:6379"
  })
}
