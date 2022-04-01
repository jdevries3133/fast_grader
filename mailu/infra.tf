terraform {

  backend "s3" {
    bucket = "my-sites-terraform-remote-state"
    key    = "fast_grader_mailu"
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


resource "random_password" "secret_key" {
  length  = 48
  special = true
}

resource "random_password" "initial_account_password" {
  length  = 20
  special = true
}

resource "random_password" "postgres" {
  length  = 48
  special = true
}

resource "random_password" "postgres_roundcube" {
  length  = 48
  special = true
}

resource "kubernetes_namespace" "mailu" {
  metadata {
    name = "mailu"
  }
}

resource "helm_release" "mailu" {
  name       = "mailu"
  namespace  = kubernetes_namespace.mailu.metadata.0.name
  repository = "https://mailu.github.io/helm-charts/"
  chart      = "mailu"
  version    = "0.3.1"

  values = ["${file("values.yml")}"]

  set {
    name  = "secretKey"
    value = random_password.secret_key.result
  }
  set {
    name  = "initialAccount.password"
    value = random_password.initial_account_password.result
  }
  set {
    name  = "database.postgresql.password"
    value = random_password.postgres.result
  }
  set {
    name  = "database.postgresql.roundcubePassword"
    value = random_password.postgres_roundcube.result
  }
}
