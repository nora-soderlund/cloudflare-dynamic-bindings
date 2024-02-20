export async function getD1DatabaseIdentifier(token: string, accountId: string, name: string): Promise<string | null> {
	const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database`, {
		method: "GET",
		headers: {
			"Authorization": `Bearer ${token}`,
			"Content-Type": "application/json"
		}
	});

	if(!response.ok) {
		throw new Error("Failed to get D1 databases: " + await response.text());
	}

	const { result } = await response.json<any>();

	return result.find((database: any) => database.name === name)?.uuid ?? null;
}

export async function createD1Database(token: string, accountId: string, name: string): Promise<string> {
	const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database`, {
		method: "POST",
		headers: {
			"Authorization": `Bearer ${token}`,
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			name
		})
	});

	const { result } = await response.json<any>();

	if(!response.ok) {
		throw new Error("Failed to create D1 database: " + await response.text());
	}

	return result.uuid as string;
}
