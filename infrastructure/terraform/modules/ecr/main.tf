# ============================================================
# VYNE — ECR Repositories Module
# One repository per service
# ============================================================

locals {
  name = "vyne-${var.environment}"
  repositories = [
    "api-gateway",
    "core-service",
    "erp-service",
    "projects-service",
    "messaging-service",
    "ai-service",
    "observability-service",
    "notification-service",
    "web"
  ]
}

resource "aws_ecr_repository" "services" {
  for_each = toset(local.repositories)

  name                 = "vyne/${each.key}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = { Service = each.key }
}

resource "aws_ecr_lifecycle_policy" "services" {
  for_each   = aws_ecr_repository.services
  repository = each.value.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 tagged images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v", "sha-"]
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 2
        description  = "Expire untagged images older than 7 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 7
        }
        action = { type = "expire" }
      }
    ]
  })
}
