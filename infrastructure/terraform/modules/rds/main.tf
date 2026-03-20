# ============================================================
# VYNE — RDS Module
# Aurora PostgreSQL Serverless v2 with pgvector
# ============================================================

locals {
  name = "vyne-${var.environment}"
}

resource "random_password" "db_password" {
  length           = 32
  special          = true
  override_special = "!#$%^&*()-_=+[]{}<>:?"
}

# ── DB Subnet Group ───────────────────────────────────────────

resource "aws_db_subnet_group" "main" {
  name       = "${local.name}-db-subnet-group"
  subnet_ids = var.isolated_subnet_ids

  tags = { Name = "${local.name}-db-subnet-group" }
}

# ── DB Parameter Group ────────────────────────────────────────

resource "aws_rds_cluster_parameter_group" "main" {
  name        = "${local.name}-pg17-params"
  family      = "aurora-postgresql17"
  description = "Vyne Aurora PostgreSQL 17 params"

  # Enable pgvector
  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements,pgaudit"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000" # Log queries > 1s
  }

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  tags = { Name = "${local.name}-pg17-params" }
}

# ── Aurora Serverless v2 Cluster ─────────────────────────────

resource "aws_rds_cluster" "main" {
  cluster_identifier = "${local.name}-aurora-cluster"
  engine             = "aurora-postgresql"
  engine_version     = "17.4"
  engine_mode        = "provisioned"

  database_name   = var.db_name
  master_username = var.db_username
  master_password = random_password.db_password.result

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.sg_rds_id]

  db_cluster_parameter_group_name = aws_rds_cluster_parameter_group.main.name

  serverlessv2_scaling_configuration {
    min_capacity = var.min_capacity
    max_capacity = var.max_capacity
  }

  backup_retention_period = var.backup_retention_days
  preferred_backup_window = "03:00-04:00"
  deletion_protection     = var.deletion_protection
  skip_final_snapshot     = var.environment != "prod"
  final_snapshot_identifier = var.environment == "prod" ? "${local.name}-final-snapshot" : null

  enabled_cloudwatch_logs_exports = ["postgresql"]

  tags = { Name = "${local.name}-aurora-cluster" }
}

# ── Aurora Serverless v2 Instance ────────────────────────────

resource "aws_rds_cluster_instance" "main" {
  identifier         = "${local.name}-aurora-instance-1"
  cluster_identifier = aws_rds_cluster.main.id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.main.engine
  engine_version     = aws_rds_cluster.main.engine_version

  performance_insights_enabled = true

  tags = { Name = "${local.name}-aurora-instance-1" }
}

# ── Store credentials in Secrets Manager ─────────────────────

resource "aws_secretsmanager_secret" "db_credentials" {
  name                    = "vyne/${var.environment}/database"
  description             = "Aurora PostgreSQL credentials for Vyne ${var.environment}"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0

  tags = { Name = "${local.name}-db-credentials" }
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    host     = aws_rds_cluster.main.endpoint
    port     = 5432
    dbname   = var.db_name
    username = var.db_username
    password = random_password.db_password.result
    url      = "postgresql://${var.db_username}:${random_password.db_password.result}@${aws_rds_cluster.main.endpoint}:5432/${var.db_name}"
  })
}
