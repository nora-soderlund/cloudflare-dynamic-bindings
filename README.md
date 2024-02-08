# cloudflare-dynamic-bindings
This is a package that aims to provide a single solution for managing dynamic binds for Cloudflare Workers.

## How does it work?

1. (Optional) Worker creates a new D1 database via the Cloudflare API.
2. Worker triggers a GitHub workflow to add the new binding.
3. GitHub Actions modifies wrangler.toml and triggers a new deployment.

It's important to highlight that this action will parse and then stringify your wrangler configuration. It will look a bit different than the original because of how dynamic toml is.

## Supported bindings

Right now only D1 databases are supported, feel free to adapt the action script to provide more options.

- [X] D1 Databases
- [ ] KV Namespaces
- [ ] Durable Objects
- [ ] R2 buckets
- [ ] Queues

## Getting started

### Prerequisities 
- A GitHub token with `workflow` permissions to your worker repository.
- (Optional) A Cloudflare token with `d1:write` permissions to create new databases.

### Setting up your repository

1. Create a new workflow in the `.github/workflows` path, for example called `dynamic-bindings.yml`
2. Use the `@nora-soderlund/cloudflare-dynamic-bindings` action to modify your wrangler.toml file on demand
```yml
name: Dynamic bindings

on:
  workflow_dispatch:
    inputs:
      bindings:
        required: true
        description: An JSON array of bindings to add.

permissions:
  contents: write

jobs:
  create-dynamic-bindings:
    name: Create dynamic bindings
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
      
      - name: Create dynamic bindings
        uses: nora-soderlund/cloudflare-dynamic-bindings@0.9.3
        with:
          file: ./wrangler.toml # change the path to your wrangler.toml file or just omit this line
          bindings: ${{ inputs.bindings }}

      - name: Commit new bindings
        run: |
          git config --global user.name 'GitHub Actions'
          git config --global user.email ''
          git commit -am "Add dynamic bindings"
          git push
```

### Setting up your worker

1. Install the `@nora-soderlund/cloudflare-dynamic-bindings` package, e.g. `pnpm install @nora-soderlund/cloudflare-dynamic-bindings@0.9.3`
2. Create a dynamic binding using the `createWranglerBinding` function, e.g.
```ts
import { createWranglerBinding } from "@nora-soderlund/cloudflare-dynamic-bindings";
import type { RepositoryProperties } from "@nora-soderlund/cloudflare-dynamic-bindings";

const repositorySettings: RepositoryProperties = {
	owner: "nora-soderlund",
	repository: "cloudflare-dynamic-bindings",
	workflow: "dynamic-bindings.yml" // use the file name you chose for setting up the repository
};

await createWranglerBinding(repositorySettings, env.GITHUB_TOKEN, {
  type: "D1",
  binding: "DATABASE_CPH",
  environments: [
    {
      databaseId: "e4ccd0df-f2ca-4d06-ab56-67d8d0373192",
      databaseName: "DATABASE_CPH"
    }
  ]
});
```

### Outcome

Now, when you create a wrangler binding via your worker, a commit is pushed to your primary branch with the new binding. It is now expected that you have a workflow that is triggered on new commits and deploys your worker.
