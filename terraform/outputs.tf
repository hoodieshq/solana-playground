output "server_ip" {
  description = "Global static IP address for the API"
  value       = google_compute_global_address.solpg_api.address
}

output "bastion_start" {
  description = "Start the bastion when you need SSH access"
  value       = "gcloud compute instances start solpg-bastion --zone=${var.zone}"
}

output "bastion_stop" {
  description = "Stop the bastion when done"
  value       = "gcloud compute instances stop solpg-bastion --zone=${var.zone}"
}

output "ssh_command" {
  description = "SSH into the server via bastion (ProxyJump)"
  value       = "ssh -p ${var.bastion_ssh_port} -J ${google_compute_instance.bastion.network_interface[0].access_config[0].nat_ip} ${google_compute_instance.solpg_server.network_interface[0].network_ip}"
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
