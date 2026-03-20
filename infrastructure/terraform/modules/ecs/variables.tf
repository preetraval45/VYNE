variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

variable "services" {
  description = "List of service names to create log groups for"
  type        = list(string)
  default = [
    "api-gateway",
    "core-service",
    "projects-service",
    "messaging-service",
    "ai-service",
    "erp-service",
    "observability-service",
    "notification-service",
    "web"
  ]
}
