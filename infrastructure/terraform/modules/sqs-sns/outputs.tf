output "queue_urls" {
  value = { for k, v in aws_sqs_queue.main : k => v.url }
}
output "queue_arns" {
  value = { for k, v in aws_sqs_queue.main : k => v.arn }
}
output "dlq_arns" {
  value = { for k, v in aws_sqs_queue.dlq : k => v.arn }
}
output "push_topic_arn" {
  value = aws_sns_topic.push_notifications.arn
}
