# ECR Infrastructure

Creates Amazon ECR repositories for all IDP Platform services, configures
image lifecycle policies, and sets up the GitHub Actions OIDC IAM role for
push access.

## Usage

```bash
cd infrastructure/terraform/ecr

terraform init
terraform plan -var="github_org=YOUR_GITHUB_USERNAME" -out=tfplan
terraform apply tfplan
```

## GitHub Actions Secret

After apply, copy the `github_ecr_role_arn` output and store it as a
GitHub Actions secret named `AWS_ECR_ROLE_ARN`:

```bash
terraform output github_ecr_role_arn
# Copy the ARN → GitHub repo → Settings → Secrets → Actions → New secret
# Name: AWS_ECR_ROLE_ARN
```

## Prerequisites

- AWS CLI configured with credentials that have ECR + IAM permissions
- Terraform 1.9+

## What gets created

- 12 ECR repositories: `idp-platform/<service-name>`
- Image lifecycle policy: keep last 30 tagged + delete untagged > 7 days
- IAM OIDC role for GitHub Actions (main branch only, OIDC — no long-lived keys)