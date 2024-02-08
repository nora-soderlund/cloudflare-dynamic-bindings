"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const toml_1 = require("@iarna/toml");
const core_1 = require("@actions/core");
const fs_1 = require("fs");
const bindings = JSON.parse((0, core_1.getInput)("bindings", {
    required: true,
    trimWhitespace: true
}));
const file = (0, core_1.getInput)("file", {
    required: true,
    trimWhitespace: true
});
const wrangler = (0, toml_1.parse)((0, fs_1.readFileSync)(file, {
    encoding: "utf-8"
}));
console.log(JSON.stringify(wrangler, undefined, 2));
for (let binding of bindings) {
    if (binding.type === "D1") {
        for (let environment of binding.environments) {
            let d1Databases;
            if (environment.environment) {
                if (!wrangler[`env.${environment.environment}`]) {
                    wrangler[`env.${environment.environment}`] = [];
                }
                d1Databases = wrangler[`env.${environment.environment}`];
            }
            else {
                if (!wrangler["d1_databases"]) {
                    wrangler["d1_databases"] = [];
                }
                d1Databases = wrangler["d1_databases"];
            }
            if (Array.isArray(d1Databases)) {
                d1Databases.push({
                    binding: binding.binding,
                    database_name: environment.databaseName,
                    database_id: environment.databaseId
                });
            }
            else {
                (0, core_1.setFailed)("Variable is not an array, possibly malformed wrangler.toml");
            }
        }
    }
}
(0, fs_1.writeFileSync)(file, (0, toml_1.stringify)(wrangler), {
    encoding: "utf-8"
});
//# sourceMappingURL=index.js.map