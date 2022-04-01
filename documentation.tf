terraform {

  backend "s3" {
    bucket = "my-sites-terraform-remote-state"
    key    = "fast_grader_docs"
    region = "us-east-2"
  }

  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = ">= 2.7.1"
    }
    helm = {
      source  = "hashicorp/helm"
      version = ">= 2.4.1"
    }
  }
}

provider "kubernetes" {
  config_path = "~/.kube/config"
}

data "external" "git_describe" {
  program = ["sh", "django/scripts/git_describe.sh"]
}

module "deployment" {
  source  = "jdevries3133/container-deployment/kubernetes"
  version = "0.2.0"

  app_name  = "fast-grader-docs"
  container = "jdevries3133/fast_grader_docs:${data.external.git_describe.result.output}"
  domain    = "docs.classfast.app"
}
