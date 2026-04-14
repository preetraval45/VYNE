# ============================================================
# VYNE — Staging Environment
# Production-like configuration for pre-release validation.
# ============================================================

terraform {
  required_version = ">= 1.9.0"
  required_providers {
    aws    = { source = "hashicorp/aws",    version = "~> 5.82" }
    random = { source = "hashicorp/random", version = "~> 3.6"  }
  }
  backend "s3" {
    bucket         = "vyne-terraform-state-YOUR_AWS_ACCOUNT_ID"
    key            = "vyne/staging/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "vyne-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project     = "vyne"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

data "aws_caller_identity" "current" {}

locals {
  account_id = data.aws_caller_identity.current.account_id
}

# ── Networking ────────────────────────────────────────────────

module "networking" {
  source = "../../modules/networking"

  environment        = var.environment
  vpc_cidr           = "10.1.0.0/16" # Separate CIDR from dev (10.0.x)
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]
  single_nat_gateway = true # Cost savings for non-prod
}

# ── S3 ────────────────────────────────────────────────────────

module "s3" {
  source = "../../modules/s3"

  environment          = var.environment
  account_id           = local.account_id
  cors_allowed_origins = ["https://staging.${var.app_domain}"]
  log_retention_days   = 60
}

# ── ECR ───────────────────────────────────────────────────────

module "ecr" {
  source      = "../../modules/ecr"
  environment = var.environment
}

# ── ECS ───────────────────────────────────────────────────────

module "ecs" {
  source = "../../modules/ecs"

  environment        = var.environment
  aws_region         = var.aws_region
  log_retention_days = 60
}

# ── RDS ───────────────────────────────────────────────────────

module "rds" {
  source = "../../modules/rds"

  environment         = var.environment
  vpc_id              = module.networking.vpc_id
  isolated_subnet_ids = module.networking.isolated_subnet_ids
  sg_rds_id           = module.networking.sg_rds_id

  # Staging: enough headroom to mirror prod behaviour
  min_capacity          = 0.5
  max_capacity          = 8
  deletion_protection   = false # Allow teardown for staging resets
  backup_retention_days = 7
}

# ── Redis ─────────────────────────────────────────────────────

module "redis" {
  source = "../../modules/redis"

  environment         = var.environment
  isolated_subnet_ids = module.networking.isolated_subnet_ids
  sg_redis_id         = module.networking.sg_redis_id
  node_type           = "cache.t4g.small" # One tier above dev
}

# ── Cognito ───────────────────────────────────────────────────

module "cognito" {
  source = "../../modules/cognito"

  environment   = var.environment
  callback_urls = ["https://staging.${var.app_domain}/api/auth/callback/cognito"]
  logout_urls   = ["https://staging.${var.app_domain}"]
}

# ── SQS + SNS ─────────────────────────────────────────────────

module "sqs_sns" {
  source      = "../../modules/sqs-sns"
  environment = var.environment
}

# ── EventBridge ───────────────────────────────────────────────

module "eventbridge" {
  source = "../../modules/eventbridge"

  environment             = var.environment
  erp_queue_arn           = module.sqs_sns.queue_arns["erp"]
  ai_queue_arn            = module.sqs_sns.queue_arns["ai"]
  notifications_queue_arn = module.sqs_sns.queue_arns["notifications"]
}

# ── IAM ───────────────────────────────────────────────────────

module "iam" {
  source = "../../modules/iam"

  environment = var.environment
  account_id  = local.account_id
  github_org  = var.github_org
  github_repo = var.github_repo
}

# ── ALB ───────────────────────────────────────────────────────

module "alb" {
  source = "../../modules/alb"

  environment         = var.environment
  vpc_id              = module.networking.vpc_id
  public_subnet_ids   = module.networking.public_subnet_ids
  sg_alb_id           = module.networking.sg_alb_id
  acm_certificate_arn = var.acm_certificate_arn
  logs_bucket         = module.s3.logs_bucket_name
}

# ── Outputs ───────────────────────────────────────────────────

output "vpc_id"                  { value = module.networking.vpc_id }
output "cluster_name"           { value = module.ecs.cluster_name }
output "rds_endpoint"           { value = module.rds.cluster_endpoint }
output "rds_secret_arn"         { value = module.rds.secret_arn }
output "redis_endpoint"         { value = module.redis.primary_endpoint }
output "cognito_user_pool_id"   { value = module.cognito.user_pool_id }
output "cognito_client_id"      { value = module.cognito.web_client_id }
output "ecr_repo_urls"          { value = module.ecr.repository_urls }
output "alb_dns"                { value = module.alb.alb_dns_name }
output "event_bus_name"         { value = module.eventbridge.event_bus_name }
output "files_bucket"           { value = module.s3.files_bucket_name }
output "github_actions_role_arn" { value = module.iam.github_actions_role_arn }
