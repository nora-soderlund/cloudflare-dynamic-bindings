import { createWranglerBinding } from "../../src";
import type { RepositoryProperties } from "../../src";

const repositorySettings: RepositoryProperties = {
	owner: "nora-soderlund",
	repository: "cloudflare-dynamic-bindings",
	workflow: "dynamic-bindings.yml"
};

export type Env = {
	// A Cloudflare account id is needed to create new resources, such as D1 databases.
	ACCOUNT_ID: string;

	// A Cloudflare API token is needed to create new resources, such as D1 databases.
	CLOUDFLARE_TOKEN: string;

	// A GitHub token is needed with the workflows scope to trigger the workflow dispatch.
	GITHUB_TOKEN: string;
} & Record<string, D1Database>;

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		if(!request.cf) {
			throw new Error("Request is missing `cf` object.");
		}

		const url = new URL(request.url);

		if(url.pathname.toLowerCase() === "/d1-database") {
			const binding = `DATABASE_${request.cf.colo}`;

			// Check if there's an existing database for the current colo
			if(env[binding]) {
				return new Response(`Database and binding already exists for ${binding} already exists.`);
			}

			// Create a new database otherwise using the Cloudflare API
			const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.ACCOUNT_ID}/d1/database`, {
				method: "POST",
				headers: {
					"Authorization": `Bearer ${env.CLOUDFLARE_TOKEN}`,
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					name: binding
				})
			});

			if(!response.ok) {
				throw new Error("Failed to create D1 database: " + await response.text());
			}

			const { result } = await response.json<any>();

			try {
				// Trigger a wrangler binding update
				await createWranglerBinding(repositorySettings, env.GITHUB_TOKEN, {
					type: "D1",
					binding,
					environments: [
						{
							databaseId: result.uuid,
							databaseName: result.name
						}
					]
				});
			}
			catch(error) {
				// For the sake of testability in this example, let's destroy the database if we couldn't trigger a workflow dispatch
				await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.ACCOUNT_ID}/d1/database/${result.uuid}`, {
					method: "DELETE",
					headers: {
						"Authorization": `Bearer ${env.CLOUDFLARE_TOKEN}`,
						"Content-Type": "application/json"
					}
				});

				throw error;
			}

			return new Response(`Database ${binding} was created and wrangler update was triggered.`);
		}
		else {
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
		}

		return new Response("Path not found, please check the README.md in the `example` folder.");
	},
};
