import { createD1Database, createWranglerBinding, getD1DatabaseBinding, getD1DatabaseIdentifier } from "../../src/index";
import type { RepositoryProperties } from "../../src/index";

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
	async fetch(request: Request, env: Env, context: ExecutionContext): Promise<Response> {
		if(!request.cf) {
			throw new Error("Request is missing `cf` object.");
		}

		const url = new URL(request.url);

		if(url.pathname.toLowerCase() === "/d1-database") {
			const binding = `DATABASE_${request.cf.colo}`;
			const databaseName = `DATABASE_${request.cf.colo}`;

			let database = env[binding];

			// Check if there's an existing database for the current colo
			if(database) {
				return new Response(`Database and binding already exists for ${databaseName} already exists.`);
			}

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

			// Example query on the non-bound database
			const sum = await database.prepare("SELECT ? + ? AS sum").bind(50, 50).first<number>("sum");

			return new Response(`Database ${binding} was created and wrangler update was triggered and query for sum resolved into ${sum}`);
		}
		else {
			await createWranglerBinding(repositorySettings, env.GITHUB_TOKEN, {
				type: "D1",
				binding: "DATABASE_CPH",
				environments: [
					{
						environment: "staging",
						databaseId: "e4ccd0df-f2ca-4d06-ab56-67d8d0373192",
						databaseName: "DATABASE_CPH_STAGING"
					},
					{
						environment: "production",
						databaseId: "e4ccd0df-f2ca-4d06-ab56-67d8d0373192",
						databaseName: "DATABASE_CPH_PROD"
					}
				]
			});
		}

		return new Response("Path not found, please check the README.md in the `example` folder.");
	},
};
