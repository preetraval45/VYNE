# ============================================================
# VYNE — Terraform Remote State
#
# BOOTSTRAP STEPS (run once before `terraform init`):
#
#   aws s3 mb s3://vyne-terraform-state-<ACCOUNT_ID> --region us-east-1
#   aws s3api put-bucket-versioning \
#     --bucket vyne-terraform-state-<ACCOUNT_ID> \
#     --versioning-configuration Status=Enabled
#   aws s3api put-bucket-encryption \
#     --bucket vyne-terraform-state-<ACCOUNT_ID> \
#     --server-side-encryption-configuration \
#     '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
#   aws dynamodb create-table \
#     --table-name vyne-terraform-locks \
#     --attribute-definitions AttributeName=LockID,AttributeType=S \
#     --key-schema AttributeName=LockID,KeyType=HASH \
#     --billing-mode PAY_PER_REQUEST \
#     --region us-east-1
#
# Then replace YOUR_AWS_ACCOUNT_ID below and run:
#   terraform init
# ============================================================

terraform {
  backend "s3" {
    bucket         = "vyne-terraform-state-YOUR_AWS_ACCOUNT_ID"
    key            = "vyne/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "vyne-terraform-locks"
  }
}
