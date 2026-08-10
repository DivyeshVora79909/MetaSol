const join = (parts) => parts.filter(Boolean).join(" ");
function bindWhere(filters, search, variables) {
  const conditions = filters.map((filter, index) => {
    if (filter.rhs === "none")
      return filter.definition.emit({
        lhs: filter.lhs,
      });
    if (filter.rhs === "range") {
      const minName = `f_${index}_min`,
        maxName = `f_${index}_max`;
      variables[minName] = filter.value[0];
      variables[maxName] = filter.value[1];
      // Cast has lower binding power than a range in SurrealQL. Parenthesize
      // each bound so `<number>` applies to `$f_0_min`, never to `$f_0_min..`.
      return filter.definition.emit({
        lhs: filter.lhs,
        range: {
          min: `(${filter.cast("scalar", minName)})`,
          max: `(${filter.cast("scalar", maxName)})`,
        },
      });
    }
    const name = `f_${index}`;
    variables[name] = filter.value;
    return filter.definition.emit({
      lhs: filter.lhs,
      rhs: filter.cast(filter.rhs, name),
    });
  });

  // Construct the global OR search block without casting to preserve B-Tree index speeds
  if (search?.term && search?.expressions?.length > 0) {
    variables.__search_term = search.term;
    const searchClauses = search.expressions.map(
      (expr) => `string::starts_with(${expr}, $__search_term)`,
    );
    conditions.push(`(${searchClauses.join(" OR ")})`);
  }

  return conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
}
/** A deliberately dumb renderer: validation and semantic decisions happen upstream. */
export function buildQuery(config, ast) {
  const variables = {
      __table: config.table,
    },
    where = bindWhere(ast.filters, ast.search, variables);
  const omit = ast.options.omit.length
    ? `OMIT ${ast.options.omit.map((field) => field.expression).join(", ")}`
    : "";
  const order = ast.sorts.length
    ? `ORDER BY ${ast.sorts.map((sort) => [sort.expression, sort.collate && "COLLATE", sort.numeric && "NUMERIC", sort.order].filter(Boolean).join(" ")).join(", ")}`
    : "";
  const fetch = ast.fetch.length
    ? `FETCH ${ast.fetch.map((field) => field.expression).join(", ")}`
    : "";
  const timeout = ast.options.timeout ? `TIMEOUT ${ast.options.timeout}` : "",
    parallel = ast.options.parallel ? "PARALLEL" : "",
    explain = ast.options.explain
      ? `EXPLAIN${ast.options.explain === "FULL" ? " FULL" : ""}`
      : "";
  const start = (ast.page - 1) * ast.limit;
  const sql = `${join([`SELECT ${ast.select.map((field) => field.expression).join(", ")}`, omit, "FROM type::table($__table)", where, order, `LIMIT ${ast.limit}`, `START ${start}`, fetch, timeout, parallel, explain])};`;
  // GROUP ALL is the one aggregation-shaped construct required to return one total for pagination.
  const countSql = `${join(["SELECT count() FROM type::table($__table)", where, "GROUP ALL"])};`;
  return {
    sql,
    countSql,
    variables,
  };
}
