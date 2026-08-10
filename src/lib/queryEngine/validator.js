import * as v from "valibot";
import { getOperator, hasOperator, isOperatorAllowed } from "./operators.js";
import {
  castVariable,
  itemTypeFor,
  normalizeFilterValue,
  normalizeType,
  valueTypeFor,
} from "./types.js";
const FilterSchema = v.object({
  field: v.string(),
  operator: v.string(),
  value: v.any(),
});
const SortSchema = v.object({
  field: v.string(),
  order: v.picklist(["ASC", "DESC"]),
  numeric: v.optional(v.boolean(), false),
  collate: v.optional(v.boolean(), false),
});
const OptionsSchema = v.optional(
  v.object({
    timeout: v.optional(v.union([v.string(), v.number()])),
    parallel: v.optional(v.boolean()),
    explain: v.optional(v.union([v.boolean(), v.picklist(["NONE", "FULL"])])),
    omit: v.optional(v.array(v.string()), []),
  }),
  {},
);
export const QuerySchema = v.object({
  search: v.optional(v.string(), ""),
  select: v.pipe(v.array(v.string()), v.minLength(1)),
  fetch: v.optional(v.array(v.string()), []),
  sorts: v.optional(v.array(SortSchema), []),
  filters: v.optional(v.array(FilterSchema), []),
  page: v.pipe(v.number(), v.integer(), v.minValue(1)),
  limit: v.pipe(v.number(), v.integer(), v.minValue(1)),
  options: OptionsSchema,
});
const isBlank = (value) =>
  (typeof value === "string" && value.trim() === "") ||
  value === null ||
  value === undefined;
const isIncomplete = (rhs, value) =>
  rhs === "scalar"
    ? isBlank(value)
    : rhs === "array"
      ? !Array.isArray(value) || value.length === 0
      : rhs === "range"
        ? !Array.isArray(value) || value.length !== 2 || value.some(isBlank)
        : false;
const compiledFieldMaps = new WeakMap();
function compileFields(config) {
  const cached = compiledFieldMaps.get(config);
  if (cached) return cached;
  const fields = new Map();
  for (const source of config.fields) {
    if (!source?.id || fields.has(source.id))
      throw new Error(`Field ids must be unique; invalid id "${source?.id}".`);
    const type = normalizeType(source.type);
    if (type === "array" && (source.items ?? source.innerType))
      normalizeType(source.items ?? source.innerType);
    if (type === "array") itemTypeFor(source);
    for (const key of ["select", "filter", "sort", "fetch", "omit"]) {
      if (
        source[key] !== undefined &&
        (typeof source[key] !== "string" || source[key].trim() === "")
      )
        throw new Error(
          `Field "${source.id}" has an invalid ${key} expression.`,
        );
    }
    fields.set(source.id, {
      ...source,
      type,
      // Preserve generic array metadata after canonicalising `array<T>` to
      // `array`; value coercion needs the member type, not just the container.
      ...(type === "array" ? { items: itemTypeFor(source) } : {}),
      operators: source.operators ?? [],
    });
  }
  compiledFieldMaps.set(config, fields);
  return fields;
}
function requireField(fields, id, capability) {
  const field = fields.get(id);
  if (!field) throw new Error(`Unknown field "${id}".`);
  if (!field[capability])
    throw new Error(`Field "${id}" is not ${capability}.`);
  return field;
}
function normalizeTimeout(timeout) {
  if (timeout === undefined) return undefined;
  if (typeof timeout === "number" && Number.isFinite(timeout) && timeout > 0)
    return `${timeout}ms`;
  if (typeof timeout === "string" && /^\d+(?:ms|s|m)$/.test(timeout))
    return timeout;
  throw new Error(
    "Timeout must be a positive duration such as 500ms, 5s, or 1m.",
  );
}
export function validateQuery(rawState, config) {
  const state = v.parse(QuerySchema, structuredClone(rawState));
  const fields = compileFields(config);
  const maxLimit = config.capabilities?.maxLimit ?? 1000,
    maxSorts = config.capabilities?.maxSorts ?? 2,
    maxFilters = config.capabilities?.maxFilters ?? 12;
  if (state.limit > maxLimit)
    throw new Error(`Limit cannot exceed ${maxLimit}.`);
  if (state.sorts.length > maxSorts)
    throw new Error(`At most ${maxSorts} sort fields are allowed.`);
  if (state.filters.length > maxFilters)
    throw new Error(`At most ${maxFilters} filters are allowed.`);
  const unique = (items, label) => {
    if (new Set(items).size !== items.length)
      throw new Error(`${label} cannot contain duplicates.`);
  };
  unique(state.select, "SELECT");
  unique(state.fetch, "FETCH");
  unique(
    state.sorts.map((sort) => sort.field),
    "ORDER BY",
  );
  const select = state.select.map((id) => {
    const field = requireField(fields, id, "selectable");
    if (!field.select)
      throw new Error(`Field "${id}" has no SELECT expression.`);
    return {
      id,
      expression: field.select,
    };
  });
  const fetch = state.fetch.map((id) => {
    if (config.capabilities?.fetch === false)
      throw new Error("FETCH is disabled for this resource.");
    const field = requireField(fields, id, "fetchable");
    if (!field.fetch) throw new Error(`Field "${id}" has no FETCH expression.`);
    return {
      id,
      expression: field.fetch,
    };
  });
  const sorts = state.sorts.map((sort) => {
    const field = requireField(fields, sort.field, "sortable");
    if (!field.sort)
      throw new Error(`Field "${sort.field}" has no ORDER BY expression.`);
    if (sort.numeric && !field.sortOptions?.numeric)
      throw new Error(`NUMERIC sorting is not enabled for "${sort.field}".`);
    if (sort.collate && !field.sortOptions?.collate)
      throw new Error(`COLLATE sorting is not enabled for "${sort.field}".`);
    return {
      field: sort.field,
      expression: field.sort,
      order: sort.order,
      numeric: sort.numeric,
      collate: sort.collate,
    };
  });
  const filters = state.filters.flatMap((filter) => {
    const field = requireField(fields, filter.field, "filterable");
    if (!field.filter)
      throw new Error(`Field "${filter.field}" has no filter expression.`);
    if (!hasOperator(filter.operator))
      throw new Error(`Unknown operator "${filter.operator}".`);
    if (!field.operators.includes(filter.operator))
      throw new Error(
        `Operator "${filter.operator}" is not enabled for "${filter.field}".`,
      );
    const definition = getOperator(filter.operator);
    if (!isOperatorAllowed(field.type, filter.operator))
      throw new Error(
        `Operator "${filter.operator}" cannot be used with ${field.type}.`,
      );
    if (isIncomplete(definition.rhs, filter.value)) return [];
    const valueType = valueTypeFor(field, definition);
    try {
      return [
        {
          field: field.id,
          lhs: field.filter,
          operator: filter.operator,
          definition,
          rhs: definition.rhs,
          value: normalizeFilterValue(valueType, definition.rhs, filter.value),
          cast: (rhs, name) => castVariable(valueType, rhs, name),
        },
      ];
    } catch (error) {
      throw new Error(`Invalid value for "${field.id}": ${error.message}`);
    }
  });

  const search = { term: state.search, expressions: [] };
  if (
    search.term &&
    Array.isArray(config.searchable) &&
    config.searchable.length > 0
  ) {
    search.expressions = config.searchable.map((id) => {
      const field = fields.get(id);
      if (!field)
        throw new Error(`Searchable field "${id}" is not configured.`);
      if (!field.filter)
        throw new Error(`Searchable field "${id}" lacks a filter expression.`);
      return field.filter;
    });
  }

  const omitIds = state.options.omit ?? [];
  unique(omitIds, "OMIT");
  const omit = omitIds.map((id) => {
    if (config.capabilities?.omit === false)
      throw new Error("OMIT is disabled for this resource.");
    const field = requireField(fields, id, "omittable");
    return {
      id,
      expression: field.omit ?? field.select,
    };
  });
  const options = {
    timeout: normalizeTimeout(state.options.timeout),
    parallel: state.options.parallel === true,
    explain:
      state.options.explain === true || state.options.explain === "FULL"
        ? state.options.explain
        : false,
    omit,
  };
  if (options.timeout && config.capabilities?.timeout === false)
    throw new Error("TIMEOUT is disabled for this resource.");
  if (options.parallel && config.capabilities?.parallel === false)
    throw new Error("PARALLEL is disabled for this resource.");
  if (options.explain && config.capabilities?.explain === false)
    throw new Error("EXPLAIN is disabled for this resource.");
  return {
    select,
    fetch,
    sorts,
    filters,
    search,
    page: state.page,
    limit: state.limit,
    options,
  };
}
