/**
 * @param owner The owner of the repository, e.g. `nora-soderlund`
 * @param repository The name of the repository, e.g. `cloudflare-dynamic-bindings`
 * @param workflow The workflow file name to trigger, e.g. `dynamic-bindings.yml`
 * @param ref The branch, tag, or commit reference to trigger the workflow in, e.g. `main`
 */
export type RepositoryProperties = {
  owner: string;
  repository: string;
  workflow: string;
  ref?: string;
};

/**
 * @param type The binding type, e.g. `D1`
 * @param binding The name of the binding, e.g. `DATABASE`
 */
export type WranglerBinding = {
  type: "D1";
  binding: string;

  environments: {
    environment?: string;
    databaseId: string;
    databaseName: string;
  }[];
};

/**
 * Creates a new Wrangler binding by triggering a GitHub workflow.
 * This function does not await for the deployment, only the trigger. 
 * Treat this function as a 201 response if succesful.
 * 
 * @param token The GitHub token with workflow scope access, e.g. `ghp_...`
 * @param bindings A single binding or an array of bindings to create.
 * 
 * @throws Throws an Error if the workflow dispatch failed.
 */
export async function createWranglerBinding({ owner, repository, workflow, ref }: RepositoryProperties, token: string, bindings: WranglerBinding | WranglerBinding[]) {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repository}/actions/workflows/${workflow}/dispatches`, {
    method: "POST",
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28"
    },
    body: JSON.stringify({
      ref,
      inputs: {
        bindings: JSON.stringify(
          (Array.isArray(bindings)?(bindings):([bindings]))
        )
      }
    })
  });

  if(!response.ok) {
    console.debug("Response from the GitHub API was not ok when dispatching a new Wrangler binding.", {
      response: await response.text()
    });

    throw new Error("Failed to dispatch a workflow trigger.");
  }
}
