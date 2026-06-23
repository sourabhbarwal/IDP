output "repository_urls" {
  description = "Map of service name to ECR repository URL"
  value       = { for k, v in aws_ecr_repository.services : k => v.repository_url }
}

output "ecr_registry" {
  description = "ECR registry URL (without repository path)"
  value       = split("/", values(aws_ecr_repository.services)[0].repository_url)[0]
}

output "github_ecr_role_arn" {
  description = "IAM Role ARN to set as AWS_ECR_ROLE_ARN in GitHub Actions"
  value       = aws_iam_role.github_ecr_push.arn
}