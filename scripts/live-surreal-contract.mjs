import assert from "node:assert/strict";

const endpoint = process.env.SURREAL_ENDPOINT || "http://localhost:8000/sql";
const username = process.env.SURREAL_USER || "root";
const password = process.env.SURREAL_PASS || "root";
const namespace = process.env.SURREAL_NS || "main";
const database = process.env.SURREAL_DB || "main";

const sql = async (query) => {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
      "surreal-ns": namespace,
      "surreal-db": database,
      Accept: "application/json",
      "Content-Type": "text/plain",
    },
    body: query,
  });
  assert.ok(response.ok, `SurrealDB HTTP ${response.status}`);
  const statements = await response.json();
  for (const statement of statements) {
    assert.equal(statement.status, "OK", JSON.stringify(statement.detail || statement));
  }
  return statements;
};

const selects = async (condition, label) => {
  const statements = await sql(`SELECT id FROM query_engine_contract WHERE ${condition};`);
  assert.ok(statements[0].result.some((record) => record.id === "query_engine_contract:one"), label);
};

await sql(`
  DEFINE TABLE OVERWRITE query_engine_contract SCHEMALESS PERMISSIONS FULL;
  DEFINE TABLE OVERWRITE query_contract_person SCHEMALESS PERMISSIONS FULL;
  DELETE query_engine_contract;
  DELETE query_contract_person;
  CREATE query_contract_person:alpha;
  CREATE query_contract_person:beta;
  CREATE query_engine_contract:one SET
    string_value = 'alpha beta',
    number_value = 42,
    boolean_value = true,
    datetime_value = d'2025-06-15T12:30:00Z',
    record_value = query_contract_person:alpha,
    strings = ['alpha', 'beta'],
    numbers = [1, 42],
    booleans = [true, false],
    datetimes = [d'2025-01-01T00:00:00Z', d'2025-06-15T12:30:00Z'],
    records = [query_contract_person:alpha, query_contract_person:beta];
`);

const checks = [
  ["string_value IS NOT NONE", "string unary"],
  ["string_value = 'alpha beta'", "string equality"],
  ["string_value != 'other'", "string inequality"],
  ["string_value ?= 'alpha beta'", "string fuzzy match"],
  ["string::starts_with(string_value, 'alpha')", "string starts with"],
  ["string::ends_with(string_value, 'beta')", "string ends with"],
  ["string_value CONTAINS 'alpha'", "string contains"],
  ["string_value CONTAINSNOT 'missing'", "string contains not"],
  ["string_value IN ['alpha beta', 'other']", "string membership"],
  ["string_value NOT IN ['other']", "string non-membership"],
  ["number_value > 1 AND number_value >= 42 AND number_value < 100 AND number_value <= 42", "number comparisons"],
  ["number_value IN [1, 42] AND number_value NOT IN [1]", "number membership"],
  ["number_value INSIDE 40..50 AND number_value NOTINSIDE 1..10", "number ranges"],
  ["boolean_value = true AND boolean_value IN [true] AND boolean_value NOT IN [false]", "boolean comparisons"],
  ["datetime_value INSIDE d'2025-01-01T00:00:00Z'..d'2025-12-31T23:59:59Z'", "datetime range"],
  ["record_value = query_contract_person:alpha AND record_value IN [query_contract_person:alpha]", "record comparisons"],
  ["strings CONTAINS 'alpha' AND strings CONTAINSANY ['beta'] AND strings CONTAINSALL ['alpha', 'beta'] AND strings CONTAINSNONE ['missing']", "array<string> relations"],
  ["numbers CONTAINS 42 AND numbers CONTAINSANY [42]", "array<number> relations"],
  ["booleans CONTAINS true AND booleans CONTAINSANY [true]", "array<boolean> relations"],
  ["datetimes CONTAINS d'2025-06-15T12:30:00Z' AND datetimes CONTAINSANY [d'2025-06-15T12:30:00Z']", "array<datetime> relations"],
  ["records CONTAINS query_contract_person:alpha AND records CONTAINSANY [query_contract_person:alpha]", "array<record> relations"],
];

for (const [condition, label] of checks) await selects(condition, label);

console.log(`Live SurrealDB contract passed: ${checks.length} representative semantic checks against ${endpoint}.`);
