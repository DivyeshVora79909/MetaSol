import { createMemo, createSignal, For, Show } from "solid-js";
import {
  ChevronDown,
  Filter,
  ListOrdered,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  X,
} from "lucide-solid";
import { getOperator } from "../lib/queryEngine/index.js";

const emptyFilterValue = (operator) => {
  const rhs = getOperator(operator)?.rhs;
  if (rhs === "none") return null;
  if (rhs === "array") return [];
  if (rhs === "range") return ["", ""];
  return null;
};

const parseList = (value) =>
  value.split(",").map((item) => item.trim()).filter(Boolean);

function FilterValue(props) {
  const rhs = () => getOperator(props.filter.operator)?.rhs;
  const setValue = (value) => props.setDraft("filters", props.index, "value", value);

  if (rhs() === "none") {
    return <span class="flex-1 text-sm italic text-base-content/50">No value required</span>;
  }

  if (rhs() === "range") {
    const [from = "", to = ""] = Array.isArray(props.filter.value)
      ? props.filter.value
      : [];
    const type = props.field.ui?.input === "datetime-local" ? "datetime-local" : "number";

    return (
      <div class="flex min-w-56 flex-1 items-center gap-2">
        <input
          class="input input-sm input-bordered w-full"
          type={type}
          step={props.field.ui?.step}
          value={from}
          aria-label={`${props.field.label} minimum`}
          onInput={(event) => setValue([event.currentTarget.value, to])}
        />
        <span class="text-sm text-base-content/50">to</span>
        <input
          class="input input-sm input-bordered w-full"
          type={type}
          step={props.field.ui?.step}
          value={to}
          aria-label={`${props.field.label} maximum`}
          onInput={(event) => setValue([from, event.currentTarget.value])}
        />
      </div>
    );
  }

  if (rhs() === "array") {
    return (
      <input
        class="input input-sm input-bordered min-w-56 flex-1"
        value={Array.isArray(props.filter.value) ? props.filter.value.join(", ") : ""}
        placeholder={props.field.ui?.placeholder || "Separate values with commas"}
        aria-label={`${props.field.label} values`}
        onInput={(event) => setValue(parseList(event.currentTarget.value))}
      />
    );
  }

  if (props.field.ui?.input === "boolean") {
    return (
      <select
        class="select select-sm select-bordered min-w-40 flex-1"
        value={props.filter.value === null || props.filter.value === undefined ? "" : String(props.filter.value)}
        aria-label={`${props.field.label} value`}
        onChange={(event) =>
          setValue(event.currentTarget.value === "" ? null : event.currentTarget.value === "true")
        }
      >
        <option value="">Choose a value</option>
        <option value="true">True</option>
        <option value="false">False</option>
      </select>
    );
  }

  return (
    <input
      class="input input-sm input-bordered min-w-56 flex-1"
      type={props.field.ui?.input || "text"}
      step={props.field.ui?.step}
      value={props.filter.value ?? ""}
      placeholder={props.field.ui?.placeholder}
      aria-label={`${props.field.label} value`}
      onInput={(event) => setValue(event.currentTarget.value)}
    />
  );
}

export default function QueryBuilder(props) {
  const [filterFieldId, setFilterFieldId] = createSignal("");
  const [sortFieldId, setSortFieldId] = createSignal("");
  const fields = createMemo(() => props.config.fields);
  const fieldById = createMemo(() => new Map(fields().map((field) => [field.id, field])));
  const maxSorts = () => props.config.capabilities?.maxSorts ?? 2;

  const addFilter = () => {
    const field = fieldById().get(filterFieldId());
    if (!field) return;

    const operator = field.operators[0];
    props.setDraft("filters", (filters) => [
      ...filters,
      { field: field.id, operator, value: emptyFilterValue(operator) },
    ]);
    setFilterFieldId("");
  };

  const addSort = () => {
    const field = fieldById().get(sortFieldId());
    if (!field || props.draft.sorts.length >= maxSorts()) return;

    props.setDraft("sorts", (sorts) => [
      ...sorts,
      { field: field.id, order: "ASC", numeric: false, collate: false },
    ]);
    setSortFieldId("");
  };

  const removeFilter = (index) =>
    props.setDraft("filters", (filters) => filters.filter((_, current) => current !== index));

  const removeSort = (index) =>
    props.setDraft("sorts", (sorts) => sorts.filter((_, current) => current !== index));

  return (
    <details class="group border-t border-base-200" aria-label="Refine ledger view">
      <summary class="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold sm:px-5">
        <span class="flex items-center gap-2">
          <Filter size={16} class="text-primary" />
          Refine view
          <Show when={props.hasPendingChanges()}>
            <span class="badge badge-warning badge-xs">Unsaved</span>
          </Show>
        </span>
        <ChevronDown size={16} class="transition-transform group-open:rotate-180" />
      </summary>

      <div class="space-y-5 border-t border-base-200 px-4 py-4 sm:px-5">
        <section class="space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h2 class="flex items-center gap-2 text-sm font-bold">
              <Filter size={16} /> Filters <span class="font-normal text-base-content/50">(AND)</span>
            </h2>
            <div class="flex w-full gap-2 sm:w-auto">
              <select
                class="select select-sm select-bordered min-w-0 flex-1 sm:w-52"
                value={filterFieldId()}
                aria-label="Filter field"
                onChange={(event) => setFilterFieldId(event.currentTarget.value)}
              >
                <option value="">Add filter</option>
                <For each={fields().filter((field) => field.filterable)}>
                  {(field) => <option value={field.id}>{field.label}</option>}
                </For>
              </select>
              <button
                class="btn btn-primary btn-sm btn-square"
                aria-label="Add filter"
                disabled={!filterFieldId()}
                onClick={addFilter}
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <Show
            when={props.draft.filters.length > 0}
            fallback={<p class="rounded-box bg-base-200/60 px-3 py-4 text-sm text-base-content/60">No filters applied.</p>}
          >
            <div class="space-y-2">
              <For each={props.draft.filters}>
                {(filter, index) => {
                  const field = fieldById().get(filter.field);
                  const label = field?.label || filter.field;

                  return (
                    <div class="flex flex-wrap items-center gap-2 rounded-box bg-base-200/50 p-2">
                      <span class="min-w-32 flex-1 truncate text-sm font-medium sm:flex-none">{label}</span>
                      <select
                        class="select select-sm select-bordered"
                        value={filter.operator}
                        aria-label={`${label} operator`}
                        onChange={(event) => {
                          const operator = event.currentTarget.value;
                          props.setDraft("filters", index(), "operator", operator);
                          props.setDraft("filters", index(), "value", emptyFilterValue(operator));
                        }}
                      >
                        <For each={field?.operators || []}>
                          {(operator) => <option value={operator}>{operator}</option>}
                        </For>
                      </select>
                      <Show when={field}>
                        <FilterValue
                          filter={filter}
                          index={index()}
                          field={field}
                          setDraft={props.setDraft}
                        />
                      </Show>
                      <button
                        class="btn btn-ghost btn-sm btn-square text-error"
                        aria-label={`Remove ${label} filter`}
                        onClick={() => removeFilter(index())}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  );
                }}
              </For>
            </div>
          </Show>
        </section>

        <section class="grid gap-4 border-t border-base-200 pt-5 md:grid-cols-2">
          <div class="space-y-3">
            <h2 class="flex items-center gap-2 text-sm font-bold">
              <ListOrdered size={16} /> Sort order
            </h2>
            <For each={props.draft.sorts}>
              {(sort, index) => {
                const field = fieldById().get(sort.field);
                const label = field?.label || sort.field;

                return (
                  <div class="mb-2 flex flex-wrap items-center gap-2 rounded-box bg-base-200/50 p-2">
                    <span class="min-w-28 flex-1 truncate text-sm font-medium">{label}</span>
                    <select
                      class="select select-sm select-bordered"
                      value={sort.order}
                      aria-label={`${label} order`}
                      onChange={(event) => props.setDraft("sorts", index(), "order", event.currentTarget.value)}
                    >
                      <option value="ASC">Ascending</option>
                      <option value="DESC">Descending</option>
                    </select>
                    <Show when={field?.sortOptions?.collate}>
                      <label class="flex items-center gap-1 text-xs"><input type="checkbox" class="checkbox checkbox-xs" checked={sort.collate} onChange={(event) => props.setDraft("sorts", index(), "collate", event.currentTarget.checked)} />Collate</label>
                    </Show>
                    <Show when={field?.sortOptions?.numeric}>
                      <label class="flex items-center gap-1 text-xs"><input type="checkbox" class="checkbox checkbox-xs" checked={sort.numeric} onChange={(event) => props.setDraft("sorts", index(), "numeric", event.currentTarget.checked)} />Numeric</label>
                    </Show>
                    <button class="btn btn-ghost btn-sm btn-square text-error" aria-label={`Remove ${label} sort`} onClick={() => removeSort(index())}><X size={16} /></button>
                  </div>
                );
              }}
            </For>
            <div class="flex gap-2">
              <select class="select select-sm select-bordered min-w-0 flex-1" value={sortFieldId()} aria-label="Sort field" disabled={props.draft.sorts.length >= maxSorts()} onChange={(event) => setSortFieldId(event.currentTarget.value)}>
                <option value="">Add sort field</option>
                <For each={fields().filter((field) => field.sortable && !props.draft.sorts.some((sort) => sort.field === field.id))}>
                  {(field) => <option value={field.id}>{field.label}</option>}
                </For>
              </select>
              <button class="btn btn-secondary btn-sm btn-square" aria-label="Add sort" disabled={!sortFieldId() || props.draft.sorts.length >= maxSorts()} onClick={addSort}><Plus size={16} /></button>
            </div>
          </div>

          <div class="space-y-3">
            <h2 class="flex items-center gap-2 text-sm font-bold"><SlidersHorizontal size={16} /> Display</h2>
            <label class="form-control gap-1">
              <span class="label-text text-xs font-semibold">Rows per page</span>
              <select class="select select-sm select-bordered w-full" value={props.draft.limit} onChange={(event) => props.setDraft("limit", Number(event.currentTarget.value))}>
                <For each={props.config.ui.pageSizes}>{(size) => <option value={size}>{size} rows</option>}</For>
              </select>
            </label>
          </div>
        </section>

        <div class="flex flex-col-reverse justify-between gap-3 border-t border-base-200 pt-4 sm:flex-row sm:items-center">
          <p class="text-sm text-error" role="alert">{props.error}</p>
          <div class="flex gap-2">
            <button class="btn btn-ghost btn-sm flex-1 sm:flex-none" disabled={!props.hasPendingChanges()} onClick={props.onReset}><RotateCcw size={16} />Reset</button>
            <button class="btn btn-primary btn-sm flex-1 sm:flex-none" onClick={props.onApply}>Apply changes</button>
          </div>
        </div>
      </div>
    </details>
  );
}
