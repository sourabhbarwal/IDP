variable "aws_region" {
  description = "AWS region for ECR repositories"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "services" {
  description = "List of all IDP Platform services requiring ECR repositories"
  type        = list(string)
  default = [
    "auth-service",
    "service-catalog-service",
    "repository-service",
    "template-service",
    "deployment-service",
    "monitoring-service",
    "logging-service",
    "alert-service",
    "notification-service",
    "audit-service",
    "cost-service",
    "frontend",
  ]
}

variable "image_retention_count" {
  description = "Number of images to retain per repository (lifecycle policy)"
  type        = number
  default     = 30
}

variable "github_org" {
  description = "GitHub organisation/user that owns the IDP repository"
  type        = string
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
  default     = "IDP"
}