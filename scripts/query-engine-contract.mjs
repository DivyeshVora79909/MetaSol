import assert from "node:assert/strict";
import { compileQuery, getOperator } from "../src/lib/queryEngine/index.js";

const primitiveOperators = {
  string: [
    "IS NONE",
    "IS NOT NONE",
    "=",
    "!=",
    "?=",
    "STARTS WITH",
    "ENDS WITH",
    "CONTAINS",
    "CONTAINSNOT",
    "IN",
    "NOT IN",
  ],
  number: [
    "IS NONE",
    "IS NOT NONE",
    "=",
    "!=",
    ">",
    "<",
    ">=",
    "<=",
    "IN",
    "NOT IN",
    "INSIDE",
    "OUTSIDE",
  ],
  boolean: ["IS NONE", "IS NOT NONE", "=", "!=", "IN", "NOT IN"],
  datetime: [
    "IS NONE",
    "IS NOT NONE",
    "=",
    "!=",
    ">",
    "<",
    ">=",
    "<=",
    "IN",
    "NOT IN",
    "INSIDE",
    "OUTSIDE",
  ],
  record: ["IS NONE", "IS NOT NONE", "=", "!=", "IN", "NOT IN"],
};
const arrayOperators = [
  "IS NONE",
  "IS NOT NONE",
  "CONTAINS",
  "CONTAINSANY",
  "CONTAINSALL",
  "CONTAINSNONE",
];
const arrayItems = ["string", "number", "boolean", "datetime", "record"];

const scalarValue = (type) =>
  ({
    string: "alpha",
    number: "42.5",
    boolean: true,
    datetime: "2025-01-15T12:30",
    record: "person:alpha",
  })[type];
const listValue = (type) => {
  const value = scalarValue(type);
  if (type === "boolean") return [true, false];
  if (type === "number") return [value, "7"];
  if (type === "datetime") return [value, "2025-02-15T12:30"];
  if (type === "record") return [value, "person:beta"];
  return [value, `${value}_two`];
};

const fields = [
  {
    id: "id",
    type: "string",
    selectable: true,
    filterable: false,
    sortable: true,
    select: "id",
    sort: "id",
    sortOptions: { collate: true, numeric: true },
  },
  ...Object.entries(primitiveOperators).map(([type, operators]) => ({
    id: type,
    type,
    selectable: false,
    filterable: true,
    sortable: false,
    filter: type,
    operators,
  })),
  ...arrayItems.map((items) => ({
    id: `array_${items}`,
    type: `array<${items}>`,
    selectable: false,
    filterable: true,
    sortable: false,
    filter: `array_${items}`,
    operators: arrayOperators,
  })),
];

const config = {
  table: "query_contract",
  capabilities: { maxFilters: 80, maxSorts: 2 },
  fields,
};
const baseState = {
  select: ["id"],
  page: 2,
  limit: 25,
  filters: [],
  sorts: [],
  fetch: [],
  options: {},
};
const stateFor = (filter) => ({
  ...structuredClone(baseState),
  filters: [filter],
});
const valueFor = (type, operator) => {
  const rhs = getOperator(operator).rhs;
  if (rhs === "none") return null;
  if (rhs === "range") return listValue(type);
  if (rhs === "array") return listValue(type);
  return scalarValue(type);
};

let tested = 0;
for (const [type, operators] of Object.entries(primitiveOperators)) {
  for (const operator of operators) {
    const compiled = compileQuery(
      config,
      stateFor({ field: type, operator, value: valueFor(type, operator) }),
    );
    assert.equal(compiled.ast.filters[0].operator, operator);
    assert.match(compiled.sql, /LIMIT 25 START 25;/);
    assert.doesNotMatch(compiled.sql, /NULLS/);
    tested += 1;
  }
}

for (const items of arrayItems) {
  for (const operator of arrayOperators) {
    const compiled = compileQuery(
      config,
      stateFor({
        field: `array_${items}`,
        operator,
        value: valueFor(items, operator),
      }),
    );
    assert.equal(compiled.ast.filters[0].operator, operator);
    if (getOperator(operator).rhs === "array" && items !== "string") {
      assert.match(
        compiled.sql,
        new RegExp(`<array<${items === "boolean" ? "bool" : items}>>\\$f_0`),
      );
    }
    tested += 1;
  }
}

const sorted = compileQuery(config, {
  ...structuredClone(baseState),
  sorts: [{ field: "id", order: "ASC", collate: true, numeric: true }],
});
assert.match(sorted.sql, /ORDER BY id COLLATE NUMERIC ASC LIMIT/);

const incomplete = compileQuery(
  config,
  stateFor({ field: "number", operator: ">", value: "" }),
);
assert.doesNotMatch(incomplete.sql, /WHERE/);
assert.throws(
  () =>
    compileQuery(
      config,
      stateFor({ field: "boolean", operator: ">", value: true }),
    ),
  /not enabled/,
);
assert.throws(
  () =>
    compileQuery(
      { ...config, capabilities: { maxFilters: 1 } },
      {
        ...structuredClone(baseState),
        filters: [
          { field: "string", operator: "=", value: "one" },
          { field: "string", operator: "=", value: "two" },
        ],
      },
    ),
  /At most 1 filters/,
);

console.log(
  `Query compiler contract passed: ${tested} type/operator combinations plus sort and validation guards.`,
);
