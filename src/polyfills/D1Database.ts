export class D1PreparedStatementPolyfill implements D1PreparedStatement {
  constructor(
    private readonly apiToken: string,
    private readonly accountId: string,
    private readonly databaseId: string,

    private readonly query: string,
    private readonly params: unknown[] = []
  ) {

  }

  bind(...values: unknown[]): D1PreparedStatement {
    return new D1PreparedStatementPolyfill(this.apiToken, this.accountId, this.databaseId, this.query, values);
  }

  first<T = unknown>(colName: string): Promise<T | null>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  async first<T>(colName?: string): Promise<T | null> | Promise<T | null> {
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${this.accountId}/d1/database/${this.databaseId}/query`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        sql: this.query,
        params: this.params
      })
    });

    if(!response.ok) {
      throw new Error(`Failed to query D1 database: ${await response.text()}`);
    }

    const { result } = await response.json<{ result: D1Result[] }>();

    if(colName) {
      const record = result[0].results[0] as Record<string, T>;

      return (record[colName] as T) ?? null;
    }

    return (result[0].results[0] as T) ?? null;
  }

  async run(): Promise<D1Response> {
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${this.accountId}/d1/database/${this.databaseId}/query`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        sql: this.query
      })
    });

    if(!response.ok) {
      throw new Error(`Failed to query D1 database: ${await response.text()}`);
    }

    const { result } = await response.json<{ result: D1Response[] }>();

    return result[0];
  }

  async all<T = Record<string, unknown>>(): Promise<D1Result<T>> {
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${this.accountId}/d1/database/${this.databaseId}/query`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        sql: this.query,
        params: this.params
      })
    });

    if(!response.ok) {
      throw new Error(`Failed to query D1 database: ${await response.text()}`);
    }

    const { result } = await response.json<{ result: D1Result<T>[] }>();

    return result[0];
  }

  raw<T = unknown[]>(): Promise<T[]> {
    throw new Error("Method not implemented.");
  }
}

export class D1DatabasePolyfill implements D1Database {
  constructor(
    private readonly apiToken: string,
    private readonly accountId: string,
    private readonly databaseId: string
  ) {

  }

  prepare(query: string): D1PreparedStatementPolyfill {
    return new D1PreparedStatementPolyfill(this.apiToken, this.accountId, this.databaseId, query);
  }

  dump(): Promise<ArrayBuffer> {
    throw new Error("Method not implemented.");
  }

  async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
    let results: D1Result<T>[] = [];

    for(let statement of statements) {
      results.push(await statement.all<T>());
    }

    return results;
  }

  async exec(query: string): Promise<D1ExecResult> {
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${this.accountId}/d1/database/${this.databaseId}/query`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        sql: query
      })
    });

    if(!response.ok) {
      throw new Error(`Failed to query D1 database: ${await response.text()}`);
    }

    const { result } = await response.json<{ result: D1Result[] }>();

    return {
      count: result.reduce((previousValue, currentValue) => previousValue + currentValue.meta.changes, 0),
      duration: result.reduce((previousValue, currentValue) => previousValue + currentValue.meta.duration, 0)
    };
  }
}
