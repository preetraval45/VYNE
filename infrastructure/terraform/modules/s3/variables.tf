variable "environment" { type = string }
variable "account_id" { type = string }
variable "cors_allowed_origins" {
  type    = list(string)
  default = ["https://app.vyne.io"]
}
variable "log_retention_days" {
  type    = number
  default = 90
}
# ALB account ID varies by region — us-east-1 is 127311923021
variable "alb_account_id" {
  type    = string
  default = "127311923021"
}
