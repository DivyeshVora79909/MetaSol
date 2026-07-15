# Query compiler

`compileQuery(config, state)` is the only public entry point. It accepts trusted
resource metadata plus untrusted UI state and returns `{ sql, countSql,
variables, ast }`.

The pipeline is deliberately flat:

```text
UI state -> validate + normalize -> bind variables -> render SurrealQL
```

The operator registry is the semantic contract shared by the validator and the
query builder. It deliberately has only four RHS shapes:

| Left field | Supported RHS | Operators |
| --- | --- | --- |
| Any configured type | none | `IS NONE`, `IS NOT NONE` |
| String | scalar / array | equality, fuzzy match, prefix/suffix, contains, `IN`, `NOT IN` |
| Number or datetime | scalar / array / range | comparisons, `IN`, `NOT IN`, `INSIDE`, `OUTSIDE` |
| Boolean or record | scalar / array | equality, `IN`, `NOT IN` |
| `array<T>` | scalar / array | `CONTAINS`, `CONTAINSANY`, `CONTAINSALL`, `CONTAINSNONE` |

There is no object editor, arbitrary expression field, OR, nested boolean
group, graph traversal filter, aggregation, or raw SurrealQL input in this
surface. Nested data must be exposed as configured fields, and graph-derived
collections must be exposed as configured array expressions.

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

For collection fields, use either `type: "array<record>"` (preferred) or
`type: "array", items: "record"`. This ensures `CONTAINS`, `CONTAINSANY`,
`CONTAINSALL`, and `CONTAINSNONE` bind the right Surreal type. The frontend
uses the operator's RHS metadata to render no input (unary), one typed input,
a repeatable typed value list, or two range bounds; it never asks the user to
write comma-delimited SurrealQL.

Arrays intended only for filtering can be `selectable: false`. Pair one with a
computed number field such as `array::len(parents ?? []) AS parent_count` to
show an aggregate column while retaining membership filters over `parents`.
Configure optional clauses and resource limits through `config.capabilities`;
set a capability to `false` to prohibit it. `maxFilters` and `maxSorts` bound
the UI and are independently enforced by the validator.

Incomplete value filters are omitted so a draft UI can be applied safely.
Unknown fields, unsupported operators, malformed values, duplicate clauses,
and disabled capabilities throw before SQL is generated. The config is trusted
backend metadata; raw UI strings never become a query expression.

The shipped query control reads this metadata directly. It supports configured
projection, repeated AND filters, every enabled operator shape (unary, scalar,
list, and range), multi-column sorting with optional `COLLATE` and `NUMERIC`,
and page/limit pagination. SurrealQL's `ORDER BY` grammar does not support
`NULLS FIRST` / `NULLS LAST`; null placement is intentionally not exposed. The list-view controls
intentionally expose only the single-table query surface; optional compiler
clauses such as FETCH, TIMEOUT, and PARALLEL remain available to trusted state
producers but are not presented as casual end-user controls.

Range bounds are emitted as `(<number>$min)..(<number>$max)` (and equivalent
datetime casts). The parentheses are required because a cast otherwise binds
to the full range expression in SurrealQL instead of to the individual bound.
