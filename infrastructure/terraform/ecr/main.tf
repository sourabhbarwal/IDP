terraform {
  required_version = ">= 1.9.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.70"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "idp-platform"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# ── ECR Repositories ──────────────────────────────────────────────────────────
resource "aws_ecr_repository" "services" {
  for_each = toset(var.services)

  name                 = "idp-platform/${each.key}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true  # AWS native scanning on every push
  }

  encryption_configuration {
    encryption_type = "AES256"
  }
}

# ── Lifecycle Policies ────────────────────────────────────────────────────────
resource "aws_ecr_lifecycle_policy" "retain_recent" {
  for_each   = aws_ecr_repository.services
  repository = each.value.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last ${var.image_retention_count} tagged images"
        selection = {
          tagStatus   = "tagged"
          tagPrefixList = ["sha-"]
          countType   = "imageCountMoreThan"
          countNumber = var.image_retention_count
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 2
        description  = "Delete untagged images older than 7 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 7
        }
        action = { type = "expire" }
      },
    ]
  })
}

# ── OIDC Provider for GitHub Actions ─────────────────────────────────────────
data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}

# If the OIDC provider doesn't exist yet, create it:
resource "aws_iam_openid_connect_provider" "github" {
  count = 0  # set to 1 if the provider doesn't already exist in your account

  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

# ── IAM Role for GitHub Actions ECR Push ─────────────────────────────────────
resource "aws_iam_role" "github_ecr_push" {
  name = "idp-platform-github-ecr-push"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = data.aws_iam_openid_connect_provider.github.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:${var.github_org}/${var.github_repo}:ref:refs/heads/main"
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "github_ecr_push" {
  name = "idp-platform-ecr-push-policy"
  role = aws_iam_role.github_ecr_push.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "ecr:GetAuthorizationToken"
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:DescribeRepositories",
          "ecr:ListImages",
        ]
        Resource = [for repo in aws_ecr_repository.services : repo.arn]
      }
    ]
  })
}