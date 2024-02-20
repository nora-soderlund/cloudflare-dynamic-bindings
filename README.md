# cloudflare-dynamic-bindings
This is a package that aims to provide a single solution for managing dynamic binds for Cloudflare Workers.

## How does it work?

1. (Optional) Worker creates a new D1 database via the Cloudflare API.
2. Worker triggers a GitHub workflow to add the new binding.
3. GitHub Actions modifies wrangler.toml and triggers a new deployment.

It's important to highlight that this action will parse and then stringify your wrangler configuration. It will look a bit different than the original because of how dynamic toml is.

For clarification, the new binding will _not be available until the next deployment_. It is in your control how you want to initiate the next deployment, some scenarios could be for example:
- Automatically when a commit is pushed to the main branch
- Automatically open a pull request in the workflow and approve manually
- Automatically when a deployment workflow has been approved manually

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

1. Install the `@nora-soderlund/cloudflare-dynamic-bindings` package, e.g.
```bash
npm install @nora-soderlund/cloudflare-dynamic-bindings@0.9.3
```

2. Create a dynamic binding using the `createWranglerBinding` function, e.g.
```ts
import { createD1Database, createWranglerBinding, getD1DatabaseBinding, getD1DatabaseIdentifier } from "@nora-soderlund/cloudflare-dynamic-bindings";
import type { RepositoryProperties } from "@nora-soderlund/cloudflare-dynamic-bindings";

const repositorySettings: RepositoryProperties = {
  owner: "nora-soderlund",
  repository: "cloudflare-dynamic-bindings",
  workflow: "dynamic-bindings.yml" // use the file name you chose for setting up the repository
};

export default {
  async fetch(request: Request, env: Env, context: ExecutionContext): Promise<Response> {
    if(!request.cf) {
      throw new Error("Request is missing `cf` object.");
    }

    const binding = `DATABASE_${request.cf.colo}`;
    const databaseName = `DATABASE_${request.cf.colo}`;

    let database = env[binding];

    if(!database) {
      // Check if the database already exists but just isn't bound
      let databaseId = await getD1DatabaseIdentifier(env.CLOUDFLARE_TOKEN, env.ACCOUNT_ID, databaseName);

      if(!databaseId) {
        // Create a new database otherwise using the Cloudflare API
        databaseId = await createD1Database(env.CLOUDFLARE_TOKEN, env.ACCOUNT_ID, databaseName);
        
        // Dispatch a binding update but don't block the response
        context.waitUntil(createWranglerBinding(repositorySettings, env.GITHUB_TOKEN, {
          type: "D1",
          binding,
          environments: [
            {
              databaseId,
              databaseName
            }
          ]
        }));
      }

      // Create a D1Database polyfill instance that uses the HTTP API as a fallback
      database = getD1DatabaseBinding(env.CLOUDFLARE_TOKEN, env.ACCOUNT_ID, databaseId);
    }

    // Example query on the bound or non-bound database
    const sum = await database.prepare("SELECT ? + ? AS sum").bind(50, 50).first<number>("sum");

    // ...
  }
}
```

### Outcome

Now, when you create a wrangler binding via your worker, a commit is pushed to your primary branch with the new binding. It is now expected that you have a workflow that is triggered on new commits and deploys your worker.
