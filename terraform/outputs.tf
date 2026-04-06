output "server_ip" {
  description = "Global static IP address for the API"
  value       = google_compute_global_address.solpg_api.address
}

output "dns_instructions" {
  description = "DNS configuration required"
  value       = "Create an A record: ${var.api_domain} -> ${google_compute_global_address.solpg_api.address}"
}

output "image" {
  description = "Server Docker image on ghcr.io"
  value       = "ghcr.io/${var.github_repo}/server"
}

resource "local_file" "env_deploy" {
  filename = "${path.module}/../infra/.env.deploy"
  content  = "REGISTRY=ghcr.io\nGCP_ZONE=${var.zone}\nGCE_INSTANCE=${google_compute_instance.solpg_server.name}\n"
}
