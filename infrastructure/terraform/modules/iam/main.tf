# ============================================================
# VYNE — IAM Module
# GitHub Actions OIDC role + ECS task roles per service
# ============================================================

locals {
  name = "vyne-${var.environment}"
}

# ── GitHub Actions OIDC ───────────────────────────────────────

resource "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"

  client_id_list = ["sts.amazonaws.com"]

  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1",
    "1c58a3a8518e8759bf075b76b750d4f2df264fcd"
  ]
}

resource "aws_iam_role" "github_actions" {
  name = "${local.name}-github-actions"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = aws_iam_openid_connect_provider.github.arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:${var.github_org}/${var.github_repo}:*"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "github_actions" {
  name = "${local.name}-github-actions-policy"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ECRAuth"
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload"
        ]
        Resource = "*"
      },
      {
        Sid    = "ECSDeployments"
        Effect = "Allow"
        Action = [
          "ecs:UpdateService",
          "ecs:DescribeServices",
          "ecs:RegisterTaskDefinition",
          "ecs:DescribeTaskDefinition",
          "ecs:ListTasks",
          "ecs:DescribeTasks"
        ]
        Resource = "*"
      },
      {
        Sid    = "PassRole"
        Effect = "Allow"
        Action = "iam:PassRole"
        Resource = "arn:aws:iam::${var.account_id}:role/${local.name}-ecs-*"
      },
      {
        Sid    = "Terraform"
        Effect = "Allow"
        Action = [
          "s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket",
          "dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:DeleteItem"
        ]
        Resource = [
          "arn:aws:s3:::vyne-terraform-state-${var.account_id}",
          "arn:aws:s3:::vyne-terraform-state-${var.account_id}/*",
          "arn:aws:dynamodb:*:${var.account_id}:table/vyne-terraform-locks"
        ]
      }
    ]
  })
}

# ── ECS Task Roles (per service, least-privilege) ─────────────

locals {
  service_policies = {
    "api-gateway" = {
      actions = [
        "secretsmanager:GetSecretValue",
        "sqs:SendMessage", "sqs:ReceiveMessage", "sqs:DeleteMessage",
        "events:PutEvents"
      ]
    }
    "core-service" = {
      actions = [
        "secretsmanager:GetSecretValue",
        "events:PutEvents",
        "cognito-idp:AdminCreateUser",
        "cognito-idp:AdminSetUserPassword",
        "cognito-idp:AdminGetUser"
      ]
    }
    "projects-service" = {
      actions = [
        "secretsmanager:GetSecretValue",
        "events:PutEvents",
        "bedrock:InvokeModel"
      ]
    }
    "messaging-service" = {
      actions = [
        "secretsmanager:GetSecretValue",
        "s3:PutObject", "s3:GetObject", "s3:DeleteObject",
        "sqs:SendMessage", "sqs:ReceiveMessage", "sqs:DeleteMessage",
        "events:PutEvents"
      ]
    }
    "ai-service" = {
      actions = [
        "secretsmanager:GetSecretValue",
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream",
        "sqs:SendMessage", "sqs:ReceiveMessage", "sqs:DeleteMessage",
        "events:PutEvents"
      ]
    }
    "erp-service" = {
      actions = [
        "secretsmanager:GetSecretValue",
        "s3:PutObject", "s3:GetObject",
        "sqs:SendMessage", "sqs:ReceiveMessage", "sqs:DeleteMessage",
        "events:PutEvents",
        "ses:SendEmail", "ses:SendRawEmail"
      ]
    }
    "observability-service" = {
      actions = [
        "secretsmanager:GetSecretValue",
        "events:PutEvents",
        "cloudwatch:PutMetricData"
      ]
    }
    "notification-service" = {
      actions = [
        "secretsmanager:GetSecretValue",
        "sqs:SendMessage", "sqs:ReceiveMessage", "sqs:DeleteMessage",
        "sns:Publish",
        "ses:SendEmail", "ses:SendRawEmail"
      ]
    }
  }
}

resource "aws_iam_role" "ecs_task" {
  for_each = local.service_policies

  name = "${local.name}-ecs-task-${each.key}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "ecs_task" {
  for_each = local.service_policies

  name = "${local.name}-ecs-task-${each.key}-policy"
  role = aws_iam_role.ecs_task[each.key].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = each.value.actions
      Resource = "*"
    }]
  })
}
