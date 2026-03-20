# ============================================================
# VYNE — Cognito User Pool Module
# Email/password auth + custom attributes (org_id, role)
# ============================================================

locals {
  name = "vyne-${var.environment}"
}

resource "aws_cognito_user_pool" "main" {
  name = "${local.name}-user-pool"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length                   = 8
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = true
    require_uppercase                = true
    temporary_password_validity_days = 7
  }

  # Custom attributes for multi-tenancy
  schema {
    name                     = "org_id"
    attribute_data_type      = "String"
    mutable                  = true
    required                 = false
    string_attribute_constraints {
      min_length = 0
      max_length = 256
    }
  }

  schema {
    name                     = "role"
    attribute_data_type      = "String"
    mutable                  = true
    required                 = false
    string_attribute_constraints {
      min_length = 0
      max_length = 64
    }
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_subject        = "Your Vyne verification code"
    email_message        = "Your Vyne verification code is {####}"
  }

  admin_create_user_config {
    allow_admin_create_user_only = false
  }

  user_pool_add_ons {
    advanced_security_mode = var.environment == "prod" ? "ENFORCED" : "OFF"
  }

  tags = { Name = "${local.name}-user-pool" }
}

# ── App Client (SPA — no client secret) ──────────────────────

resource "aws_cognito_user_pool_client" "web" {
  name         = "${local.name}-web-client"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret = false

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH",
  ]

  access_token_validity  = 60  # minutes
  id_token_validity      = 60
  refresh_token_validity = 30  # days

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }

  callback_urls = var.callback_urls
  logout_urls   = var.logout_urls

  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["email", "openid", "profile"]
  allowed_oauth_flows_user_pool_client = true

  supported_identity_providers = ["COGNITO"]

  prevent_user_existence_errors = "ENABLED"

  read_attributes = [
    "email",
    "name",
    "custom:org_id",
    "custom:role",
  ]

  write_attributes = [
    "email",
    "name",
    "custom:org_id",
    "custom:role",
  ]
}

# ── Cognito Domain ────────────────────────────────────────────

resource "aws_cognito_user_pool_domain" "main" {
  domain       = "${local.name}"
  user_pool_id = aws_cognito_user_pool.main.id
}
