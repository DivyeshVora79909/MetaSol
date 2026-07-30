const BASE_FIELD = Object.freeze({
  selectable: true,
  sortable: true,
  filterable: true,
  fetchable: false,
  omittable: true,
  default: true,
});

const field = (preset, definition) => ({
  ...BASE_FIELD,
  ...preset,
  ...definition,
  ui: { ...(preset.ui || {}), ...(definition.ui || {}) },
  sortOptions: {
    ...(preset.sortOptions || {}),
    ...(definition.sortOptions || {}),
  },
});

const PRESETS = Object.freeze({
  string: {
    type: "string",
    operators: [
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
    sortOptions: { collate: true, numeric: true },
    ui: { input: "text" },
  },
  number: {
    type: "number",
    operators: [
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
    ui: { input: "number", step: "any" },
  },
  boolean: {
    type: "boolean",
    operators: ["IS NONE", "IS NOT NONE", "=", "!=", "IN", "NOT IN"],
    ui: { input: "boolean" },
  },
  record: {
    type: "record",
    operators: ["IS NONE", "IS NOT NONE", "=", "!=", "IN", "NOT IN"],
    ui: { input: "text", placeholder: "table:record-id" },
  },
});

export const PRIMITIVE_CONFIG = Object.freeze({
  domain: "test_primitive",
  table: "test_primitive",
  ui: {
    title: "Test Primitives",
    description: "Manage system primitives.",
    entityLabel: "Primitive",
    entityLabelPlural: "Primitives",
    pageSizes: [10, 25, 50, 100],
  },
  capabilities: {
    maxLimit: 1000,
    maxFilters: 12,
    maxSorts: 3,
    fetch: true,
    timeout: true,
    parallel: true,
    explain: true,
    omit: true,
  },
  fields: [
    field(PRESETS.record, {
      id: "id",
      label: "ID",
      select: "id",
      filter: "id",
      sort: "id",
      sortable: false,
      omittable: false,
    }),
    field(PRESETS.string, {
      id: "a_string",
      label: "Name",
      select: "a_string",
      filter: "a_string",
      sort: "a_string",
    }),
    field(PRESETS.string, {
      id: "a_enum",
      label: "Status",
      select: "a_enum",
      filter: "a_enum",
      sort: "a_enum",
    }),
    field(PRESETS.number, {
      id: "a_int",
      label: "Integer",
      select: "a_int",
      filter: "a_int",
      sort: "a_int",
      default: false,
    }),
  ],
  defaultState: {
    page: 1,
    limit: 10,
    select: ["id", "a_string", "a_enum"],
    filters: [],
    sorts: [{ field: "a_string", order: "ASC" }],
    fetch: [],
    options: { timeout: undefined, parallel: false, explain: false, omit: [] },
  },
});
