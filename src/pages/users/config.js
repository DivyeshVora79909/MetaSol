const BASE_FIELD = Object.freeze({
  selectable: true,
  sortable: true,
  filterable: true,
  fetchable: false,
  omittable: true,
  default: true
});
const field = (preset, definition) => ({
  ...BASE_FIELD,
  ...preset,
  ...definition,
  ui: {
    ...preset.ui,
    ...definition.ui
  }
});
const PRESETS = Object.freeze({
  string: {
    type: "string",
    operators: ["IS NONE", "IS NOT NONE", "=", "!=", "?=", "STARTS WITH", "ENDS WITH", "CONTAINS", "CONTAINSNOT", "IN", "NOT IN"],
    sortOptions: {
      collate: true,
      numeric: true
    },
    ui: {
      input: "text"
    }
  },
  number: {
    type: "number",
    operators: ["IS NONE", "IS NOT NONE", "=", "!=", ">", "<", ">=", "<=", "IN", "NOT IN", "INSIDE", "OUTSIDE"],
    ui: {
      input: "number",
      step: "any"
    }
  },
  boolean: {
    type: "boolean",
    operators: ["IS NONE", "IS NOT NONE", "=", "!=", "IN", "NOT IN"],
    ui: {
      input: "boolean"
    }
  },
  datetime: {
    type: "datetime",
    operators: ["IS NONE", "IS NOT NONE", "=", "!=", ">", "<", ">=", "<=", "IN", "NOT IN", "INSIDE", "OUTSIDE"],
    ui: {
      input: "datetime-local"
    }
  },
  record: {
    type: "record",
    operators: ["IS NONE", "IS NOT NONE", "=", "!=", "IN", "NOT IN"],
    ui: {
      input: "text",
      placeholder: "table:record-id"
    }
  },
  recordList: {
    type: "array",
    items: "record",
    innerType: "record",
    selectable: true,
    sortable: false,
    filterable: true,
    fetchable: true,
    default: false,
    omittable: false,
    operators: ["IS NONE", "IS NOT NONE", "CONTAINS", "CONTAINSNOT", "CONTAINSANY", "CONTAINSALL", "CONTAINSNONE"],
    ui: {
      input: "record-list",
      placeholder: "group:one, group:two"
    }
  }
});
export const USER_CONFIG = Object.freeze({
  domain: "user",
  table: "user",
  ui: {
    title: "Topology Ledger",
    description: "Configure a safe, parameterized view of the user domain.",
    entityLabel: "node",
    entityLabelPlural: "nodes",
    pageSizes: [10, 25, 50, 100],
    timeoutPresets: ["500ms", "1s", "5s", "10s"],
    // EXPLAIN changes SELECT's result shape, so keep it available to trusted
    // callers without exposing it in a records-table control by default.
    exposeExplain: false
  },
  capabilities: {
    maxLimit: 1000,
    maxSorts: 2,
    fetch: true,
    timeout: true,
    parallel: true,
    explain: true,
    omit: true
  },
  fields: [field(PRESETS.record, {
    id: "id",
    label: "Node ID",
    select: "id",
    filter: "id",
    sort: "id",
    sortable: false
  }), field(PRESETS.string, {
    id: "name",
    label: "Identity Name",
    select: "name",
    filter: "name",
    sort: "name",
    ui: {
      placeholder: "Search a name"
    }
  }), field(PRESETS.string, {
    id: "email",
    label: "Contact Vector",
    select: "email",
    filter: "email",
    sort: "email",
    operators: ["=", "!=", "STARTS WITH"],
    ui: {
      input: "email",
      placeholder: "name@example.com"
    }
  }), field(PRESETS.boolean, {
    id: "login_access",
    label: "Edge Status",
    select: "login_access",
    filter: "login_access",
    sort: "login_access"
  }), field(PRESETS.number, {
    id: "total_suspensions",
    label: "Suspensions",
    default: false,
    select: "total_suspensions",
    filter: "total_suspensions",
    sort: "total_suspensions"
  }), field(PRESETS.number, {
    id: "dominate_count",
    label: "Sub-Nodes",
    select: "array::len(dominates ?? []) AS dominate_count",
    filter: "array::len(dominates ?? [])",
    sort: "array::len(dominates ?? [])"
  }), field(PRESETS.recordList, {
    id: "parents",
    label: "Parent Groups",
    select: "parents",
    filter: "parents",
    fetch: "parents"
  }), field(PRESETS.datetime, {
    id: "created_at",
    label: "Genesis Date",
    select: "created_at",
    filter: "created_at",
    sort: "created_at"
  })],
  defaultState: {
    page: 1,
    limit: 25,
    select: ["id", "name", "email", "login_access", "dominate_count", "created_at"],
    filters: [],
    sorts: [{
      field: "created_at",
      order: "DESC"
    }],
    fetch: [],
    options: {
      timeout: undefined,
      parallel: false,
      explain: false,
      omit: []
    }
  }
});
