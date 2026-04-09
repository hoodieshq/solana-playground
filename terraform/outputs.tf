output "dns_instructions" {
  description = "DNS configuration required"
  value       = "Create a CNAME record: ${var.api_domain} -> ghs.googlehosted.com."
}

output "workload_identity_provider" {
  description = "Full resource name of the WIF provider (set as GCP_WORKLOAD_IDENTITY_PROVIDER secret)"
  value       = google_iam_workload_identity_pool_provider.github.name
}

output "service_account_email" {
  description = "Service account email (set as GCP_SERVICE_ACCOUNT secret)"
  value       = google_service_account.solpg.email
}
