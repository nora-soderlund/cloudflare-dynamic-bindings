import toml from "@iarna/toml";
import { getInput } from "@actions/core";
import { readFileSync, writeFileSync } from "fs";

const bindings = JSON.parse(
  getInput("bindings", {
    required: true,
    trimWhitespace: true
  })
);

const file = getInput("file", {
  required: true,
  trimWhitespace: true
});

const content = readFileSync(file, {
  encoding: "utf-8"
});

const isToml = file.toLowerCase().endsWith('.toml');

const wrangler: any = (isToml)?(toml.parse(content)):(JSON.parse(content));

function getArrayPropertyInObject(path: string | null, key: string) {
  const keys = path.split('.');

  let parent = wrangler;

  if(path !== null) {
    for(let key of keys) {
      if(!parent[key]) {
        parent[key] = {};
      }
  
      parent = parent[key];
    }
  }

  parent[key] = [];

  return parent[key];
}

for(let binding of bindings) {
  if(binding.type === "D1") {
    for(let environment of binding.environments) {
      let d1Databases;

      if(environment.environment) {
        d1Databases = getArrayPropertyInObject(`env.${environment.environment}`, "d1_databases");
      }
      else {
        d1Databases = getArrayPropertyInObject(null, "d1_databases");
      }

      d1Databases.push({
        binding: binding.binding,
        database_name: environment.databaseName,
        database_id: environment.databaseId
      });
    }
  }
  else if(binding.type === "KV") {
    for(let environment of binding.environments) {
      let kvNamespaces;

      if(environment.environment) {
        kvNamespaces = getArrayPropertyInObject(`env.${environment.environment}`, "kv_namespaces");
      }
      else {
        kvNamespaces = getArrayPropertyInObject(null, "kv_namespaces");
      }

      kvNamespaces.push({
        binding: binding.binding,
        id: environment.namespaceId
      });
    }
  }
}

const newContent = (isToml)?(toml.stringify(wrangler)):(JSON.stringify(wrangler, undefined, 2));

writeFileSync(file, newContent, {
  encoding: "utf-8"
});
