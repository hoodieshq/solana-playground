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
}

# ---------- Required APIs ----------

resource "google_project_service" "appengine" {
  service            = "appengine.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "appengineflex" {
  service            = "appengineflex.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "cloudbuild" {
  service            = "cloudbuild.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "iam_credentials" {
  service            = "iamcredentials.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "iam" {
  service            = "iam.googleapis.com"
  disable_on_destroy = false
}

# ---------- App Engine ----------

resource "google_app_engine_application" "solpg" {
  project     = var.project_id
  location_id = var.region

  depends_on = [google_project_service.appengine]
}

resource "google_app_engine_domain_mapping" "api" {
  domain_name = var.api_domain

  ssl_settings {
    ssl_management_type = "AUTOMATIC"
  }

  depends_on = [google_app_engine_application.solpg]
}

# ---------- Service Account ----------

resource "google_service_account" "solpg" {
  account_id   = "solpg-server"
  display_name = "Solana Playground Server"
}

resource "google_project_iam_member" "solpg_appengine_deployer" {
  project = var.project_id
  role    = "roles/appengine.deployer"
  member  = "serviceAccount:${google_service_account.solpg.email}"
}

resource "google_project_iam_member" "solpg_appengine_admin" {
  project = var.project_id
  role    = "roles/appengine.serviceAdmin"
  member  = "serviceAccount:${google_service_account.solpg.email}"
}

resource "google_project_iam_member" "solpg_cloudbuild" {
  project = var.project_id
  role    = "roles/cloudbuild.builds.editor"
  member  = "serviceAccount:${google_service_account.solpg.email}"
}

resource "google_project_iam_member" "solpg_storage" {
  project = var.project_id
  role    = "roles/storage.admin"
  member  = "serviceAccount:${google_service_account.solpg.email}"
}

resource "google_project_iam_member" "solpg_sa_user" {
  project = var.project_id
  role    = "roles/iam.serviceAccountUser"
  member  = "serviceAccount:${google_service_account.solpg.email}"
}

# ---------- Workload Identity Federation (GitHub OIDC) ----------

resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "github-pool"
  display_name              = "GitHub Actions Pool"
  description               = "WIF pool for GitHub Actions OIDC"

  depends_on = [google_project_service.iam]
}

resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                       = "GitHub Actions Provider"

  attribute_mapping = {
    "google.subject"             = "assertion.sub"
    "attribute.actor"            = "assertion.actor"
    "attribute.repository"       = "assertion.repository"
    "attribute.repository_owner" = "assertion.repository_owner"
  }

  attribute_condition = "assertion.repository == '${var.github_repo}'"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

resource "google_service_account_iam_member" "wif_binding" {
  service_account_id = google_service_account.solpg.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_repo}"
}
