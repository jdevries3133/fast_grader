terraform {

  backend "s3" {
    bucket = "my-sites-terraform-remote-state"
    key    = "fast_grader_mail"
    region = "us-east-2"
  }

  required_providers {
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

resource "random_password" "secret_key" {
  length  = 48
  special = true
}

resource "kubernetes_namespace" "mailu" {
  metadata {
    name = "mailu"
  }
}

resource "helm_release" "mailu" {
  name       = "fast-grader-email"
  namespace  = kubernetes_namespace.mailu.metadata.0.name
  repository = "https://mailu.github.io/helm-charts/"
  chart      = "mailu"
  version    = "0.3.1"

  values = [
    file("./values.yml")
  ]

  set {
    name  = "secretKey"
    value = random_password.secret_key.result
  }

  set {
    name  = "initialAccount.password"
    value = var.initial_account_password
  }
}
