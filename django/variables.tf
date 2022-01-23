/******************************************************************************
 * Kubernetes
 */

variable "kube_namespace" {
  type = string
}

/******************************************************************************
 * postgresql
 */

variable "pg_storage_class" {
  type    = string
  default = ""
}

/******************************************************************************
 * Django
 */

variable "entrypoint_script" {
  type    = string
  default = "entrypoint_prod.sh"
}

variable "replicas" {
  type    = number
  default = 1
}
variable "container_tag" {
  type = string
}

variable "debug" {
  type    = string
  default = "0"
}

variable "secret" {
  type      = string
  sensitive = true
}

variable "settings_module" {
  type    = string
  default = "fast_grader.settings.production"
}


/******************************************************************************
 * API
 */
variable "google_client_id" {
  type = string
}

variable "google_client_secret" {
  type      = string
  sensitive = true
}
