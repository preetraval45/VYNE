variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "environment" {
  type    = string
  default = "dev"
}

variable "account_id" {
  description = "Your AWS Account ID — replace YOUR_AWS_ACCOUNT_ID"
  type        = string
}

variable "github_org" {
  type = string
}

variable "github_repo" {
  type    = string
  default = "vyne"
}

variable "app_domain" {
  description = "Root domain for the app, e.g. vyne.dev"
  type        = string
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN for HTTPS (must be in us-east-1)"
  type        = string
}
