import { parse, stringify } from "@iarna/toml";
import { getInput, setFailed } from "@actions/core";
import type { WranglerBinding } from "../../../../src";
import { writeFileSync } from "fs";

const bindings: WranglerBinding[] = JSON.parse(
  getInput("bindings", {
    required: true,
    trimWhitespace: true
  })
);

const file = getInput("file", {
  required: true,
  trimWhitespace: true
});

const wrangler = parse(file);

for(let binding of bindings) {
  if(binding.type === "D1") {
    for(let environment of binding.environments) {
      let d1Databases;

      if(environment.environment) {
        if(!wrangler[`env.${environment.environment}`]) {
          wrangler[`env.${environment.environment}`] = [];
        }
        
        d1Databases = wrangler[`env.${environment.environment}`];
      }
      else {
        if(!wrangler["d1_databases"]) {
          wrangler["d1_databases"] = [];
        }

        d1Databases = wrangler["d1_databases"];
      }

      if(Array.isArray(d1Databases)) {
        (d1Databases as any).push({
          binding: binding.binding,
          database_name: environment.databaseName,
          database_id: environment.databaseId
        });
      }
      else {
        setFailed("Variable is not an array, possibly malformed wrangler.toml");
      }
    }
  }
}

writeFileSync(file, stringify(wrangler), {
  encoding: "utf-8"
});
