output "github_actions_role_arn" { value = aws_iam_role.github_actions.arn }
output "ecs_task_role_arns" {
  value = { for k, v in aws_iam_role.ecs_task : k => v.arn }
}
