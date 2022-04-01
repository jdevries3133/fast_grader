terraform {

  backend "s3" {
    bucket = "my-sites-terraform-remote-state"
    key    = "fast_grader"
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

provider "helm" {
  kubernetes {
    config_path = "~/.kube/config"
  }
}

variable "google_client_secret" {
  type      = string
  sensitive = true
}

data "external" "git_describe" {
  program = ["sh", "scripts/git_describe.sh"]
}

resource "random_password" "django_secret" {
  length  = 48
  special = true
}

module "basic-deployment" {
  source  = "jdevries3133/basic-deployment/kubernetes"
  version = "0.0.9"

  app_name  = terraform.workspace == "production" ? "fast-grader" : "fast-grader-beta"
  container = "jdevries3133/fast_grader_django:${data.external.git_describe.result.output}"
  domain    = terraform.workspace == "production" ? "classfast.app" : "beta.classfast.app"

  extra_env = {
    DJANGO_SECRET          = random_password.django_secret.result
    DJANGO_SETTINGS_MODULE = "fast_grader.settings.production"
    GOOGLE_CLIENT_ID       = "850669494212-rbi5f45edqpnru9a7gs1avgb480kr92b.apps.googleusercontent.com"
    GOOGLE_CLIENT_SECRET   = var.google_client_secret
    IS_PRODUCTION          = terraform.workspace == "production" ? "true" : "false"
  }
}

