// the resources here share a Kubernetes namespace
resource "kubernetes_namespace" "django" {
  metadata {
    name = var.kube_namespace
  }
}

/******************************************************************************
 * Django app
 */

resource "kubernetes_config_map" "django_config" {
  metadata {
    name      = "django-config"
    namespace = kubernetes_namespace.django.metadata[0].name
  }

  data = {
    DJANGO_DEBUG           = var.debug
    DJANGO_SECRET          = var.secret
    DJANGO_SETTINGS_MODULE = var.settings_module
    GOOGLE_CLIENT_ID       = var.google_client_id
    GOOGLE_CLIENT_SECRET   = var.google_client_secret
    POSTGRESQL_DB          = "fast_grader"
    POSTGRESQL_HOST        = "${helm_release.django_psql.name}-postgresql.${kubernetes_namespace.django.metadata[0].name}.svc.cluster.local"
    POSTGRESQL_USERNAME    = "django"
  }
}

resource "kubernetes_secret" "django_secrets" {
  metadata {
    name      = "django-secrets"
    namespace = kubernetes_namespace.django.metadata[0].name
  }

  data = {
    POSTGRESQL_PASSWORD = random_password.db_password.result
  }
}

resource "kubernetes_deployment" "django_deployment" {
  metadata {
    name      = "django-deployment"
    namespace = kubernetes_namespace.django.metadata[0].name
  }
  spec {
    replicas = var.replicas
    selector {
      match_labels = {
        app = "fast_grader"
      }
    }
    template {
      metadata {
        labels = {
          app = "fast_grader"
        }
      }
      spec {
        container {
          name  = "fast-grader"
          image = "jdevries3133/fast_grader_django:${var.container_tag}"

          command = [
            "sh",
            "/src/${var.entrypoint_script}"
          ]

          port {
            container_port = 8000
          }

          env_from {
            config_map_ref {
              name = kubernetes_config_map.django_config.metadata[0].name
            }
          }

          env_from {
            secret_ref {
              name = kubernetes_secret.django_secrets.metadata[0].name
            }
          }
        }
      }
    }
  }
}

resource "kubernetes_service" "django_service" {
  metadata {
    name      = "fast-grader"
    namespace = kubernetes_namespace.django.metadata[0].name
  }
  spec {
    selector = {
      app = kubernetes_deployment.django_deployment.spec.0.template.0.metadata.0.labels.app
    }
    type             = "LoadBalancer"
    session_affinity = "ClientIP"
    port {
      port        = 8000
      target_port = 8000
    }
  }
}


/******************************************************************************
 * Postgresql DB
 */


resource "random_password" "db_password" {
  length  = 32
  special = true
}

resource "helm_release" "django_psql" {
  name       = "db"
  namespace  = kubernetes_namespace.django.metadata[0].name
  repository = "https://charts.bitnami.com/bitnami"
  chart      = "postgresql"
  version    = "10.16.1"

  set {
    name  = "global.postgresql.postgresqlDatabase"
    value = "fast_grader"
  }

  set {
    name  = "global.postgresql.postgresqlUsername"
    value = "django"
  }


  set {
    name  = "global.storageClass"
    value = var.pg_storage_class
  }

  set_sensitive {
    name  = "global.postgresql.postgresqlPassword"
    value = random_password.db_password.result
  }

}
