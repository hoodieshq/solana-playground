variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "GCP zone"
  type        = string
  default     = "us-central1-a"
}

variable "machine_type" {
  description = "GCE instance machine type"
  type        = string
  default     = "e2-standard-4"
}

variable "disk_size_gb" {
  description = "Boot disk size in GB"
  type        = number
  default     = 50
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
  description = "GitHub repository (owner/repo) for ghcr.io image path"
  type        = string
  default     = "solana-foundation/solana-playground"
}

variable "bastion_ssh_cidrs" {
  description = "CIDR ranges allowed to SSH into the bastion (set to team IPs if known)"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "bastion_ssh_port" {
  description = "External SSH port on the bastion (non-standard to reduce scan noise)"
  type        = number
  default     = 2222
}
