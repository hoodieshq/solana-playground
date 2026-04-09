variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region (App Engine location)"
  type        = string
  default     = "us-central1"
}

variable "api_domain" {
  description = "Domain for the API server (e.g. api.solpg.io)"
  type        = string
}

variable "client_url" {
  description = "Client URL allowed by CORS (e.g. https://beta.solpg.io)"
  type        = string
  default     = "https://beta.solpg.io"
}

variable "rust_log" {
  description = "Rust log level for the server"
  type        = string
  default     = "info"
}

variable "github_repo" {
  description = "GitHub repository (owner/repo) for WIF access control"
  type        = string
  default     = "solana-foundation/solana-playground"
}
