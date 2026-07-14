import { For, Show, createMemo, createSignal } from "solid-js";
import { Check, ChevronDown, Database, Filter, LayoutTemplate, ListOrdered, Plus, RotateCcw, SlidersHorizontal, X } from "lucide-solid";
import { getOperator } from "../lib/queryEngine/index.js";
const blankValue = (field, operatorName) => {
  const rhs = getOperator(operatorName)?.rhs;
  if (rhs === "none") return null;
  if (rhs === "array") return [];
  if (rhs === "range") return ["", ""];
  return null;
};
const parseList = value => value.split(",").map(item => item.trim()).filter(Boolean);
const parseJson = value => {
  try {
    return JSON.parse(value);
  } catch {
    // Keep invalid draft text so the compiler can return a clear validation
    // error on Apply instead of silently changing user input.
    return value;
  }
};
export default function QueryBuilder(props) {
  const [filterField, setFilterField] = createSignal("");
  const [sortField, setSortField] = createSignal("");
  const fields = createMemo(() => props.config.fields);
  const fieldById = createMemo(() => new Map(fields().map(field => [field.id, field])));
  const capabilities = () => props.config.capabilities || {};
  const maxSorts = () => capabilities().maxSorts ?? 2;
  const selected = id => props.draft.select.includes(id);
  const addFilter = () => {
    const field = fieldById().get(filterField());
    if (!field) return;
    const operator = field.operators[0];
    props.setDraft("filters", filters => [...filters, {
      field: field.id,
      operator,
      value: blankValue(field, operator)
    }]);
    setFilterField("");
  };
  const addSort = () => {
    const field = fieldById().get(sortField());
    if (!field || props.draft.sorts.length >= maxSorts()) return;
    props.setDraft("sorts", sorts => [...sorts, {
      field: field.id,
      order: "ASC",
      numeric: false,
      collate: false
    }]);
    setSortField("");
  };
  const toggleSelection = id => {
    if (selected(id) && props.draft.select.length === 1) return;
    props.setDraft("select", columns => selected(id) ? columns.filter(column => column !== id) : [...columns, id]);
  };
  const updateFilterOperator = (index, operator) => {
    const field = fieldById().get(props.draft.filters[index].field);
    props.setDraft("filters", index, "operator", operator);
    props.setDraft("filters", index, "value", blankValue(field, operator));
  };
  const removeFilter = index => props.setDraft("filters", filters => filters.filter((_, current) => current !== index));
  const removeSort = index => props.setDraft("sorts", sorts => sorts.filter((_, current) => current !== index));
  const updateOptions = (key, value) => props.setDraft("options", key, value);
  const valueInput = (filter, index, field) => {
    const rhs = getOperator(filter.operator)?.rhs;
    const value = filter.value;
    if (rhs === "none") return <span class="text-xs text-base-content/50 italic flex-1">No value required</span>;
    if (rhs === "range") {
      const [from = "", to = ""] = Array.isArray(value) ? value : [];
      return <div class="flex flex-1 min-w-52 items-center gap-2">
        <input aria-label={`${field.label} minimum`} type={field.ui?.input === "datetime-local" ? "datetime-local" : "number"} step={field.ui?.step} class="input input-sm input-bordered w-full" value={from} onInput={event => props.setDraft("filters", index, "value", [event.currentTarget.value, to])} />
        <span class="text-base-content/40">to</span>
        <input aria-label={`${field.label} maximum`} type={field.ui?.input === "datetime-local" ? "datetime-local" : "number"} step={field.ui?.step} class="input input-sm input-bordered w-full" value={to} onInput={event => props.setDraft("filters", index, "value", [from, event.currentTarget.value])} />
      </div>;
    }
    if (rhs === "array") {
      return <input aria-label={`${field.label} values`} class="input input-sm input-bordered flex-1 min-w-52" value={Array.isArray(value) ? value.join(", ") : ""} placeholder={field.ui?.placeholder || "Separate values with commas"} onInput={event => props.setDraft("filters", index, "value", parseList(event.currentTarget.value))} />;
    }
    if (field.ui?.input === "boolean") {
      return <select aria-label={`${field.label} value`} class="select select-sm select-bordered flex-1 min-w-40" value={value === null || value === undefined ? "" : String(value)} onChange={event => props.setDraft("filters", index, "value", event.currentTarget.value === "" ? null : event.currentTarget.value === "true")}>
        <option value="">Choose a value</option><option value="true">True</option><option value="false">False</option>
      </select>;
    }
    if (field.ui?.input === "json") {
      const serialized = typeof value === "string" ? value : JSON.stringify(value ?? {}, null, 2);
      return <textarea aria-label={`${field.label} JSON value`} class="textarea textarea-bordered flex-1 min-w-52 font-mono text-xs" rows="3" value={serialized} placeholder='{"key":"value"}' onInput={event => props.setDraft("filters", index, "value", parseJson(event.currentTarget.value))} />;
    }
    return <input aria-label={`${field.label} value`} type={field.ui?.input || "text"} step={field.ui?.step} class="input input-sm input-bordered flex-1 min-w-52" value={value ?? ""} placeholder={field.ui?.placeholder} onInput={event => props.setDraft("filters", index, "value", event.currentTarget.value)} />;
  };
  return <section aria-label="Query controls" class="rounded-box border border-base-300 bg-base-100 shadow-sm">
    <header class="flex flex-wrap items-center justify-between gap-3 border-b border-base-200 px-5 py-4">
      <div class="flex items-center gap-2"><Database size={18} class="text-primary" /><div><h2 class="text-sm font-bold">Query controls</h2><p class="text-xs text-base-content/55">Changes remain local until applied.</p></div></div>
      <Show when={props.hasPendingChanges()}><span class="badge badge-warning badge-outline gap-1"><span class="h-1.5 w-1.5 rounded-full bg-warning" />Unsaved changes</span></Show>
    </header>
    <div class="grid gap-5 p-5 xl:grid-cols-[minmax(15rem,.8fr)_minmax(16rem,.9fr)_minmax(24rem,1.8fr)]">
      <section class="space-y-3"><h3 class="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-base-content/60"><LayoutTemplate size={14} /> Columns</h3>
        <div class="max-h-56 space-y-1 overflow-y-auto rounded-box border border-base-200 p-2">
          <For each={fields().filter(field => field.selectable)}>{field => <label class="flex cursor-pointer items-center gap-2 rounded-btn px-2 py-1.5 hover:bg-base-200"><input type="checkbox" class="checkbox checkbox-sm checkbox-primary" checked={selected(field.id)} disabled={selected(field.id) && props.draft.select.length === 1} onChange={() => toggleSelection(field.id)} /><span class="text-sm">{field.label}</span></label>}</For>
        </div>
        <label class="form-control"><span class="label-text text-xs font-medium">Rows per page</span><select class="select select-sm select-bordered" value={props.draft.limit} onChange={event => props.setDraft("limit", Number(event.currentTarget.value))}><For each={props.config.ui.pageSizes}>{size => <option value={size}>{size} rows</option>}</For></select></label>
      </section>

      <section class="space-y-3"><h3 class="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-base-content/60"><ListOrdered size={14} /> Sort order</h3>
        <div class="space-y-2"><For each={props.draft.sorts}>{(sort, index) => {
              const field = fieldById().get(sort.field);
              return <div class="flex flex-wrap items-center gap-2 rounded-btn border border-base-200 p-2"><span class="min-w-0 flex-1 truncate text-sm font-medium">{field?.label || sort.field}</span><select aria-label={`${field?.label || sort.field} order`} class="select select-sm select-bordered" value={sort.order} onChange={event => props.setDraft("sorts", index(), "order", event.currentTarget.value)}><option value="ASC">Ascending</option><option value="DESC">Descending</option></select><Show when={field?.sortOptions?.collate}><label class="flex items-center gap-1 text-xs"><input type="checkbox" class="checkbox checkbox-xs" checked={sort.collate} onChange={event => props.setDraft("sorts", index(), "collate", event.currentTarget.checked)} />Collate</label></Show><Show when={field?.sortOptions?.numeric}><label class="flex items-center gap-1 text-xs"><input type="checkbox" class="checkbox checkbox-xs" checked={sort.numeric} onChange={event => props.setDraft("sorts", index(), "numeric", event.currentTarget.checked)} />Numeric</label></Show><button aria-label={`Remove ${field?.label || sort.field} sort`} class="btn btn-ghost btn-sm btn-square text-error" onClick={() => removeSort(index())}><X size={16} /></button></div>;
            }}</For></div>
        <div class="flex gap-2"><select aria-label="Sort field" class="select select-sm select-bordered min-w-0 flex-1" value={sortField()} disabled={props.draft.sorts.length >= maxSorts()} onChange={event => setSortField(event.currentTarget.value)}><option value="">Add sort field</option><For each={fields().filter(field => field.sortable && !props.draft.sorts.some(sort => sort.field === field.id))}>{field => <option value={field.id}>{field.label}</option>}</For></select><button class="btn btn-sm btn-secondary" aria-label="Add sort" disabled={!sortField() || props.draft.sorts.length >= maxSorts()} onClick={addSort}><Plus size={16} /></button></div>
      </section>

      <section class="space-y-3"><div class="flex flex-wrap items-center justify-between gap-2"><h3 class="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-base-content/60"><Filter size={14} /> Filters <span class="normal-case">(AND)</span></h3><div class="flex gap-2"><select aria-label="Filter field" class="select select-sm select-bordered" value={filterField()} onChange={event => setFilterField(event.currentTarget.value)}><option value="">Add filter</option><For each={fields().filter(field => field.filterable)}>{field => <option value={field.id}>{field.label}</option>}</For></select><button class="btn btn-sm btn-primary" disabled={!filterField()} onClick={addFilter}><Plus size={16} /></button></div></div>
        <Show when={props.draft.filters.length > 0} fallback={<p class="rounded-box border border-dashed border-base-300 p-5 text-center text-sm text-base-content/50">No filters. All accessible records are eligible.</p>}><div class="max-h-64 space-y-2 overflow-y-auto"><For each={props.draft.filters}>{(filter, index) => {
                const field = fieldById().get(filter.field);
                return <div class="flex flex-wrap items-center gap-2 rounded-box border border-base-200 bg-base-100 p-2"><span class="w-32 truncate text-sm font-medium">{field?.label || filter.field}</span><select aria-label={`${field?.label || filter.field} operator`} class="select select-sm select-bordered" value={filter.operator} onChange={event => updateFilterOperator(index(), event.currentTarget.value)}><For each={field?.operators || []}>{operator => <option value={operator}>{operator}</option>}</For></select>{field && valueInput(filter, index(), field)}<button aria-label={`Remove ${field?.label || filter.field} filter`} class="btn btn-ghost btn-sm btn-square text-error" onClick={() => removeFilter(index())}><X size={16} /></button></div>;
              }}</For></div></Show>
      </section>
    </div>
    <Show when={capabilities().fetch || capabilities().timeout || capabilities().parallel || capabilities().explain && props.config.ui.exposeExplain}><details class="border-t border-base-200"><summary class="flex cursor-pointer list-none items-center gap-2 px-5 py-3 text-sm font-medium"><SlidersHorizontal size={16} /> Execution options <ChevronDown size={15} class="opacity-50" /></summary><div class="grid gap-4 border-t border-base-200 px-5 py-4 md:grid-cols-2">
      <Show when={capabilities().fetch}><fieldset><legend class="mb-2 text-xs font-bold uppercase tracking-wide text-base-content/60">Fetch linked records</legend><div class="flex flex-wrap gap-x-4 gap-y-2"><For each={fields().filter(field => field.fetchable)}>{field => <label class="flex items-center gap-2 text-sm"><input type="checkbox" class="checkbox checkbox-sm" checked={props.draft.fetch.includes(field.id)} onChange={() => props.setDraft("fetch", fetch => fetch.includes(field.id) ? fetch.filter(id => id !== field.id) : [...fetch, field.id])} />{field.label}</label>}</For></div></fieldset></Show>
      <div class="flex flex-wrap items-end gap-4"><Show when={capabilities().timeout}><label class="form-control"><span class="label-text text-xs font-bold uppercase tracking-wide text-base-content/60">Timeout</span><select class="select select-sm select-bordered" value={props.draft.options.timeout || ""} onChange={event => updateOptions("timeout", event.currentTarget.value || undefined)}><option value="">Default</option><For each={props.config.ui.timeoutPresets}>{timeout => <option value={timeout}>{timeout}</option>}</For></select></label></Show><Show when={capabilities().parallel}><label class="flex items-center gap-2 text-sm"><input type="checkbox" class="checkbox checkbox-sm" checked={props.draft.options.parallel} onChange={event => updateOptions("parallel", event.currentTarget.checked)} />Parallel</label></Show><Show when={capabilities().explain && props.config.ui.exposeExplain}><label class="form-control"><span class="label-text text-xs font-bold uppercase tracking-wide text-base-content/60">Explain</span><select class="select select-sm select-bordered" value={props.draft.options.explain === "FULL" ? "FULL" : props.draft.options.explain ? "ON" : ""} onChange={event => updateOptions("explain", event.currentTarget.value === "FULL" ? "FULL" : event.currentTarget.value === "ON")}><option value="">Off</option><option value="ON">Plan</option><option value="FULL">Full plan</option></select></label></Show></div>
    </div></details></Show>
    <footer class="flex flex-wrap items-center justify-between gap-3 border-t border-base-200 px-5 py-4"><div class="min-h-5 text-sm text-error" role="alert">{props.error}</div><div class="flex gap-2"><button class="btn btn-sm btn-ghost" disabled={!props.hasPendingChanges()} onClick={props.onReset}><RotateCcw size={16} />Reset</button><button class="btn btn-primary btn-sm" onClick={props.onApply}><Check size={16} />Apply query</button></div></footer>
  </section>;
}
