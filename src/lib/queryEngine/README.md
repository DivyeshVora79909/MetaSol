# Query compiler

`compileQuery(config, state)` is the only public entry point. It accepts trusted
resource metadata plus untrusted UI state and returns `{ sql, countSql,
variables, ast }`.

The pipeline is deliberately flat:

```text
UI state -> validate + normalize -> bind variables -> render SurrealQL
```

Fields are the single schema for UI and query compilation. A field uses its
stable UI id for state and may supply separate trusted SurrealQL expressions:

```js
{
  id: "customer_count",
  label: "Customers",
  type: "number",
  selectable: true,
  filterable: true,
  sortable: true,
  operators: ["=", ">", "INSIDE"],
  select: "array::len(customers ?? []) AS customer_count",
  filter: "array::len(customers ?? [])",
  sort: "array::len(customers ?? [])",
}
```

For `array` fields, use `items` (or the legacy-compatible `innerType`) to
describe array members. This ensures `CONTAINS` and `CONTAINSANY` bind the
right Surreal type. Configure optional clauses and resource limits through
`config.capabilities`; set a capability to `false` to prohibit it.

Incomplete value filters are omitted so a draft UI can be applied safely.
Unknown fields, unsupported operators, malformed values, duplicate clauses,
and disabled capabilities throw before SQL is generated. The config is trusted
backend metadata; raw UI strings never become a query expression.

The shipped query control reads this metadata directly. It supports configured
projection, repeated AND filters, every enabled operator shape (unary, scalar,
list, and range), multi-column sorting with optional `COLLATE`/`NUMERIC`,
pagination, FETCH, TIMEOUT, and PARALLEL. Add `ui: { input: "json" }` to an
`object` field to use the generic JSON value editor; no component changes are
needed for new fields.

Range bounds are emitted as `(<number>$min)..(<number>$max)` (and equivalent
datetime casts). The parentheses are required because a cast otherwise binds
to the full range expression in SurrealQL instead of to the individual bound.
