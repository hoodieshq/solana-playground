terraform {
  required_version = ">= 1.5"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

# ---------- Network ----------

resource "google_compute_network" "solpg" {
  name                    = "solpg-network"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "solpg" {
  name          = "solpg-subnet"
  ip_cidr_range = "10.0.0.0/24"
  network       = google_compute_network.solpg.id
  region        = var.region
}

# Allow GCP health checks and load balancer traffic
resource "google_compute_firewall" "allow_health_check" {
  name    = "solpg-allow-health-check"
  network = google_compute_network.solpg.name

  allow {
    protocol = "tcp"
    ports    = ["8080"]
  }

  source_ranges = ["130.211.0.0/22", "35.191.0.0/16"]
  target_tags   = ["solpg-server"]
}

# ---------- Global Static IP ----------

resource "google_compute_global_address" "solpg_api" {
  name = "solpg-api-ip"
}

# ---------- Service Account ----------

resource "google_service_account" "solpg" {
  account_id   = "solpg-server"
  display_name = "Solana Playground Server"
}

# ---------- HTTPS Load Balancer ----------

resource "google_compute_managed_ssl_certificate" "solpg" {
  name = "solpg-ssl-cert"

  managed {
    domains = [var.api_domain]
  }
}

resource "google_compute_health_check" "solpg" {
  name               = "solpg-health-check"
  check_interval_sec = 10
  timeout_sec        = 5
  healthy_threshold  = 2
  unhealthy_threshold = 3

  tcp_health_check {
    port = 8080
  }
}

resource "google_compute_instance_group" "solpg" {
  name      = "solpg-instance-group"
  zone      = var.zone
  instances = [google_compute_instance.solpg_server.id]

  named_port {
    name = "http"
    port = 8080
  }
}

resource "google_compute_backend_service" "solpg" {
  name                  = "solpg-backend-service"
  protocol              = "HTTP"
  port_name             = "http"
  timeout_sec           = 300
  health_checks         = [google_compute_health_check.solpg.id]
  load_balancing_scheme = "EXTERNAL_MANAGED"
  security_policy       = google_compute_security_policy.solpg.id

  backend {
    group           = google_compute_instance_group.solpg.id
    balancing_mode  = "UTILIZATION"
    max_utilization = 0.8
  }
}

# ---------- Cloud Armor ----------

resource "google_compute_security_policy" "solpg" {
  name = "solpg-security-policy"

  # Allow health checks
  rule {
    action   = "allow"
    priority = 100

    match {
      expr {
        expression = "request.headers['user-agent'].contains('GoogleHC')"
      }
    }
  }

  # Throttle per IP: 10 requests per 60 seconds
  rule {
    action   = "throttle"
    priority = 200

    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }

    rate_limit_options {
      conform_action = "allow"
      exceed_action  = "deny(429)"

      rate_limit_threshold {
        count        = 10
        interval_sec = 60
      }

      enforce_on_key = "IP"
    }
  }

  # Default: allow
  rule {
    action   = "allow"
    priority = 2147483647

    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
  }
}

resource "google_compute_url_map" "solpg" {
  name            = "solpg-url-map"
  default_service = google_compute_backend_service.solpg.id
}

resource "google_compute_target_https_proxy" "solpg" {
  name             = "solpg-https-proxy"
  url_map          = google_compute_url_map.solpg.id
  ssl_certificates = [google_compute_managed_ssl_certificate.solpg.id]
}

resource "google_compute_global_forwarding_rule" "solpg_https" {
  name                  = "solpg-https-forwarding-rule"
  ip_address            = google_compute_global_address.solpg_api.address
  port_range            = "443"
  target                = google_compute_target_https_proxy.solpg.id
  load_balancing_scheme = "EXTERNAL_MANAGED"
}

# HTTP -> HTTPS redirect
resource "google_compute_url_map" "solpg_http_redirect" {
  name = "solpg-http-redirect"

  default_url_redirect {
    https_redirect         = true
    strip_query            = false
    redirect_response_code = "MOVED_PERMANENTLY_DEFAULT"
  }
}

resource "google_compute_target_http_proxy" "solpg_redirect" {
  name    = "solpg-http-redirect-proxy"
  url_map = google_compute_url_map.solpg_http_redirect.id
}

resource "google_compute_global_forwarding_rule" "solpg_http" {
  name                  = "solpg-http-forwarding-rule"
  ip_address            = google_compute_global_address.solpg_api.address
  port_range            = "80"
  target                = google_compute_target_http_proxy.solpg_redirect.id
  load_balancing_scheme = "EXTERNAL_MANAGED"
}

# ---------- GCE Instance ----------

resource "google_compute_instance" "solpg_server" {
  name         = "solpg-server"
  machine_type = var.machine_type
  zone         = var.zone
  tags         = ["solpg-server"]

  boot_disk {
    initialize_params {
      image = "cos-cloud/cos-stable"
      size  = var.disk_size_gb
      type  = "pd-ssd"
    }
  }

  network_interface {
    subnetwork = google_compute_subnetwork.solpg.id
    access_config {
      # Ephemeral IP for outbound internet access; inbound traffic arrives via LB
    }
  }

  service_account {
    email  = google_service_account.solpg.email
    scopes = ["cloud-platform"]
  }

  metadata = {
    enable-oslogin = "TRUE"
  }

  metadata_startup_script = templatefile("${path.module}/../infra/startup.sh", {
    client_url = var.client_url
    rust_log   = var.rust_log
    image      = "ghcr.io/${var.github_repo}/server"
  })
}
