terraform {

  backend "s3" {
    bucket = "fast-grader-terraform-remote-state"
    key    = "production_state"
    region = "us-east-2"
  }


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
  config_path = "~/.kube/prod_config"
}

provider "helm" {
  kubernetes {
    config_path = "~/.kube/prod_config"
  }
}


module "django" {
  source = "../../django"

  replicas             = 5
  container_tag        = var.django_container_tag
  entrypoint_script    = "entrypoint_prod.sh"
  debug                = false
  secret               = var.django_secret
  settings_module      = "fast_grader.settings.production"
  google_client_id     = "568001308128-o44bptsgevpg54gvath9jltlbocoihje.apps.googleusercontent.com"
  google_client_secret = var.google_client_secret
  pg_storage_class     = "openebs-jiva-csi-default"

  kube_namespace = "fast-grader-production"

}

