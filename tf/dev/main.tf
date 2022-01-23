terraform {

  # no remote state backend will be used, because this is for local development
  # only
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


module "django" {
  source = "../../django"

  kube_namespace = "dev"

  replicas             = 1
  container_tag        = var.django_container_tag
  entrypoint_script    = "entrypoint_dev.sh"
  debug                = true
  secret               = "any value"
  settings_module      = "fast_grader.settings.development"
  google_client_id     = "568001308128-o44bptsgevpg54gvath9jltlbocoihje.apps.googleusercontent.com"
  google_client_secret = var.google_client_secret
}

