variable "google_client_secret" {
  type      = string
  sensitive = true
}

variable "django_container_tag" {
  type    = string
  default = "develop-latest"
}
