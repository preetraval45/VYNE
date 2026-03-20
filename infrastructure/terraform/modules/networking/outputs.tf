output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "vpc_cidr" {
  description = "VPC CIDR block"
  value       = aws_vpc.main.cidr_block
}

output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "List of private subnet IDs (ECS tasks)"
  value       = aws_subnet.private[*].id
}

output "isolated_subnet_ids" {
  description = "List of isolated subnet IDs (RDS, Redis)"
  value       = aws_subnet.isolated[*].id
}

output "sg_alb_id" {
  description = "Security group ID for ALB"
  value       = aws_security_group.alb.id
}

output "sg_ecs_id" {
  description = "Security group ID for ECS tasks"
  value       = aws_security_group.ecs.id
}

output "sg_rds_id" {
  description = "Security group ID for RDS"
  value       = aws_security_group.rds.id
}

output "sg_redis_id" {
  description = "Security group ID for Redis"
  value       = aws_security_group.redis.id
}
