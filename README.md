## Flow

1. Worker creates a new D1 database via the Cloudflare API.
2. Worker triggers a GitHub workflow to add the new binding.
3. Worker modifies wrangler.toml and triggers a new deployment.
