import { createMemo, createSignal, For, Show, Switch, Match } from "solid-js";
import {
  Check,
  ChevronDown,
  Columns3,
  Filter,
  ListOrdered,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  X,
} from "lucide-solid";
import { getOperator } from "../lib/queryEngine/index.js";
import {
  defaultOperator,
  emptyFilterValue,
  filterEditorModel,
  isFilterComplete,
} from "../lib/queryEngine/queryBuilderModel.js";

const operatorLabel = (operator) => getOperator(operator)?.label || operator;
const isBlank = (value) =>
  (typeof value === "string" && value.trim() === "") ||
  value === null ||
  value === undefined;

function ScalarInput(props) {
  const type = () => props.type || "string";
  const input = () =>
    type() === "datetime"
      ? "datetime-local"
      : type() === "number"
        ? "number"
        : props.field.ui?.input === "email"
          ? "email"
          : "text";

  return (
    <Show
      when={type() !== "boolean"}
      fallback={
        <select
          class="select select-sm select-bordered w-full"
          value={isBlank(props.value) ? "" : String(props.value)}
          aria-label={props.label}
          onChange={(event) =>
            props.onChange(
              event.currentTarget.value === ""
                ? ""
                : event.currentTarget.value === "true",
            )
          }
        >
          <option value="">Choose a value</option>
          <option value="true">True</option>
          <option value="false">False</option>
        </select>
      }
    >
      <input
        class="input input-sm input-bordered w-full"
        type={input()}
        step={type() === "number" ? props.field.ui?.step || "any" : undefined}
        value={props.value ?? ""}
        placeholder={props.field.ui?.placeholder}
        aria-label={props.label}
        onInput={(event) => props.onChange(event.currentTarget.value)}
      />
    </Show>
  );
}

function ValueList(props) {
  const [nextValue, setNextValue] = createSignal("");
  const values = () => (Array.isArray(props.value) ? props.value : []);
  const appendValue = () => {
    if (isBlank(nextValue())) return;
    props.onChange([...values(), nextValue()]);
    setNextValue("");
  };
  const update = (index, value) =>
    props.onChange(
      values().map((current, currentIndex) =>
        currentIndex === index ? value : current,
      ),
    );

  return (
    <div class="min-w-64 flex-1 space-y-2">
      <Show when={values().length > 0}>
        <div class="space-y-1">
          <For each={values()}>
            {(value, index) => (
              <div class="flex items-center gap-1">
                <ScalarInput
                  field={props.field}
                  type={props.type}
                  value={value}
                  label={`${props.label} value ${index() + 1}`}
                  onChange={(next) => update(index(), next)}
                />
                <button
                  type="button"
                  class="btn btn-ghost btn-sm btn-square text-error"
                  aria-label={`Remove value ${index() + 1}`}
                  onClick={() =>
                    props.onChange(
                      values().filter(
                        (_, currentIndex) => currentIndex !== index(),
                      ),
                    )
                  }
                >
                  <X size={15} />
                </button>
              </div>
            )}
          </For>
        </div>
      </Show>
      <div class="flex items-center gap-1">
        <div class="flex-1">
          <ScalarInput
            field={props.field}
            type={props.type}
            value={nextValue()}
            label={`Add ${props.label} value`}
            onChange={setNextValue}
          />
        </div>
        <button
          type="button"
          class="btn btn-outline btn-sm btn-square"
          aria-label="Add value"
          disabled={isBlank(nextValue())}
          onClick={appendValue}
        >
          <Plus size={15} />
        </button>
      </div>
    </div>
  );
}

function FilterValue(props) {
  const model = () => filterEditorModel(props.field, props.filter.operator);
  const rhs = () => model()?.rhs;
  const valueType = () => model()?.operandType;
  const setValue = (value) =>
    props.setDraft("filters", props.index, "value", value);
  const rangeValue = () =>
    Array.isArray(props.filter.value) ? props.filter.value : ["", ""];

  return (
    <Switch
      fallback={
        <div class="min-w-52 flex-1">
          <ScalarInput
            field={props.field}
            type={valueType()}
            value={props.filter.value}
            label={`${props.field.label} value`}
            onChange={setValue}
          />
        </div>
      }
    >
      <Match when={rhs() === "none"}>
        <span class="min-w-52 flex-1 px-2 text-sm italic text-base-content/50">
          No value required
        </span>
      </Match>

      <Match when={rhs() === "range"}>
        <div
          class="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2"
          role="group"
          aria-label={`${props.field.label} range`}
        >
          <label class="form-control gap-1">
            <span class="label-text text-xs font-medium text-base-content/65">
              From
            </span>
            <ScalarInput
              field={props.field}
              type={valueType()}
              value={rangeValue()[0]}
              label={`${props.field.label} from`}
              onChange={(next) => setValue([next, rangeValue()[1]])}
            />
          </label>
          <label class="form-control gap-1">
            <span class="label-text text-xs font-medium text-base-content/65">
              To
            </span>
            <ScalarInput
              field={props.field}
              type={valueType()}
              value={rangeValue()[1]}
              label={`${props.field.label} to`}
              onChange={(next) => setValue([rangeValue()[0], next])}
            />
          </label>
        </div>
      </Match>

      <Match when={rhs() === "array"}>
        <ValueList
          field={props.field}
          type={valueType()}
          value={props.filter.value}
          label={props.field.label}
          onChange={setValue}
        />
      </Match>
    </Switch>
  );
}

export default function QueryBuilder(props) {
  const [filterFieldId, setFilterFieldId] = createSignal("");
  const [sortFieldId, setSortFieldId] = createSignal("");
  const fields = createMemo(() => props.config.fields);
  const fieldById = createMemo(
    () => new Map(fields().map((field) => [field.id, field])),
  );
  const selectableFields = createMemo(() =>
    fields().filter((field) => field.selectable),
  );
  const filterableFields = createMemo(() =>
    fields().filter((field) => field.filterable),
  );
  const maxSorts = () => props.config.capabilities?.maxSorts ?? 2;
  const maxFilters = () => props.config.capabilities?.maxFilters ?? 12;

  const addFilter = () => {
    const field = fieldById().get(filterFieldId());
    if (!field || props.draft.filters.length >= maxFilters()) return;
    const operator = defaultOperator(field);
    if (!operator) return;
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
    props.setDraft("filters", (filters) =>
      filters.filter((_, current) => current !== index),
    );
  const removeSort = (index) =>
    props.setDraft("sorts", (sorts) =>
      sorts.filter((_, current) => current !== index),
    );
  const toggleSelect = (id, checked) => {
    if (checked) props.setDraft("select", (select) => [...select, id]);
    else if (props.draft.select.length > 1)
      props.setDraft("select", (select) =>
        select.filter((fieldId) => fieldId !== id),
      );
  };

  return (
    <div class="space-y-5 px-4 py-4 sm:px-5">
      <section class="space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 class="flex items-center gap-2 text-sm font-bold">
              <Filter size={16} /> Filters{" "}
              <span class="font-normal text-base-content/50">
                All conditions use AND
              </span>
            </h2>
            <p class="mt-1 text-xs text-base-content/55">
              Each condition chooses one configured field, a compatible
              operator, and the operand shape that operator requires.
            </p>
          </div>
          <div class="flex w-full gap-2 sm:w-auto">
            <select
              class="select select-sm select-bordered min-w-0 flex-1 sm:w-56"
              value={filterFieldId()}
              aria-label="Add filter field"
              disabled={props.draft.filters.length >= maxFilters()}
              onChange={(event) => setFilterFieldId(event.currentTarget.value)}
            >
              <option value="">
                Add filter ({props.draft.filters.length}/{maxFilters()})
              </option>
              <For each={filterableFields()}>
                {(field) => <option value={field.id}>{field.label}</option>}
              </For>
            </select>
            <button
              type="button"
              class="btn btn-primary btn-sm btn-square"
              aria-label="Add filter"
              disabled={
                !filterFieldId() || props.draft.filters.length >= maxFilters()
              }
              onClick={addFilter}
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        <Show
          when={props.draft.filters.length > 0}
          fallback={
            <p class="rounded-box bg-base-200/60 px-3 py-4 text-sm text-base-content/60">
              No filters applied. Add as many AND conditions as needed.
            </p>
          }
        >
          <div class="space-y-2">
            <For each={props.draft.filters}>
              {(filter, index) => {
                const field = () => fieldById().get(filter.field);
                return (
                  <div
                    class={() =>
                      `rounded-box border p-3 ${isFilterComplete(filter) ? "border-base-200 bg-base-200/40" : "border-warning/40 bg-warning/10"}`
                    }
                  >
                    <div class="grid gap-2 lg:grid-cols-[minmax(10rem,0.8fr)_minmax(11rem,0.8fr)_minmax(16rem,1.5fr)_auto] lg:items-start">
                      <select
                        class="select select-sm select-bordered w-full"
                        value={filter.field}
                        aria-label="Filter field"
                        onChange={(event) => {
                          const nextField = fieldById().get(
                            event.currentTarget.value,
                          );
                          const operator =
                            nextField && defaultOperator(nextField);
                          if (nextField && operator)
                            props.setDraft("filters", index(), {
                              field: nextField.id,
                              operator,
                              value: emptyFilterValue(operator),
                            });
                        }}
                      >
                        <For each={filterableFields()}>
                          {(option) => (
                            <option value={option.id}>{option.label}</option>
                          )}
                        </For>
                      </select>
                      <select
                        class="select select-sm select-bordered w-full"
                        value={filter.operator}
                        aria-label={`${field()?.label || filter.field} operator`}
                        onChange={(event) => {
                          const operator = event.currentTarget.value;
                          props.setDraft(
                            "filters",
                            index(),
                            "operator",
                            operator,
                          );
                          props.setDraft(
                            "filters",
                            index(),
                            "value",
                            emptyFilterValue(operator),
                          );
                        }}
                      >
                        <For each={field()?.operators || []}>
                          {(operator) => (
                            <option value={operator}>
                              {operatorLabel(operator)}
                            </option>
                          )}
                        </For>
                      </select>
                      <Show when={field()}>
                        <FilterValue
                          filter={filter}
                          index={index()}
                          field={field()}
                          setDraft={props.setDraft}
                        />
                      </Show>
                      <button
                        type="button"
                        class="btn btn-ghost btn-sm btn-square text-error justify-self-end"
                        aria-label={`Remove ${field()?.label || filter.field} filter`}
                        onClick={() => removeFilter(index())}
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <Show when={!isFilterComplete(filter)}>
                      <p class="mt-2 text-xs text-warning-content">
                        Complete this condition before applying it. Incomplete
                        conditions are ignored by the compiler.
                      </p>
                    </Show>
                  </div>
                );
              }}
            </For>
          </div>
        </Show>
      </section>

      <section class="grid gap-5 border-t border-base-200 pt-5 xl:grid-cols-2">
        <div class="space-y-3">
          <div>
            <h2 class="flex items-center gap-2 text-sm font-bold">
              <Columns3 size={16} /> Columns{" "}
              <span class="font-normal text-base-content/50">
                ({props.draft.select.length} selected)
              </span>
            </h2>
            <p class="mt-1 text-xs text-base-content/55">
              Choose the configured fields to include in the SELECT result. At
              least one column is required.
            </p>
          </div>
          <div class="grid gap-2 sm:grid-cols-2">
            <For each={selectableFields()}>
              {(field) => {
                const selected = () => props.draft.select.includes(field.id);
                return (
                  <label
                    class={() =>
                      `flex cursor-pointer items-center gap-2 rounded-box border px-3 py-2 text-sm ${selected() ? "border-primary/40 bg-primary/5" : "border-base-200"}`
                    }
                  >
                    <input
                      type="checkbox"
                      class="checkbox checkbox-sm checkbox-primary"
                      checked={selected()}
                      disabled={selected() && props.draft.select.length === 1}
                      onChange={(event) =>
                        toggleSelect(field.id, event.currentTarget.checked)
                      }
                    />
                    <span class="min-w-0 flex-1 truncate">{field.label}</span>
                  </label>
                );
              }}
            </For>
          </div>
        </div>

        <div class="space-y-4">
          <div class="space-y-3">
            <div>
              <h2 class="flex items-center gap-2 text-sm font-bold">
                <ListOrdered size={16} /> Sort order
              </h2>
              <p class="mt-1 text-xs text-base-content/55">
                Sort precedence follows this list. Text fields can optionally
                use collation or numeric ordering.
              </p>
            </div>
            <For each={props.draft.sorts}>
              {(sort, index) => {
                const field = () => fieldById().get(sort.field);
                return (
                  <div class="grid gap-2 rounded-box bg-base-200/50 p-2 sm:grid-cols-[1fr_auto_auto_auto_auto_auto] sm:items-center">
                    <span class="min-w-0 truncate text-sm font-medium">
                      {field()?.label || sort.field}
                    </span>
                    <select
                      class="select select-sm select-bordered"
                      value={sort.order}
                      aria-label={`${field()?.label || sort.field} order`}
                      onChange={(event) =>
                        props.setDraft(
                          "sorts",
                          index(),
                          "order",
                          event.currentTarget.value,
                        )
                      }
                    >
                      <option value="ASC">Ascending</option>
                      <option value="DESC">Descending</option>
                    </select>
                    <Show when={field()?.sortOptions?.collate}>
                      <label class="flex items-center gap-1 whitespace-nowrap text-xs">
                        <input
                          type="checkbox"
                          class="checkbox checkbox-xs"
                          checked={sort.collate}
                          onChange={(event) =>
                            props.setDraft(
                              "sorts",
                              index(),
                              "collate",
                              event.currentTarget.checked,
                            )
                          }
                        />{" "}
                        Collate
                      </label>
                    </Show>
                    <Show when={field()?.sortOptions?.numeric}>
                      <label class="flex items-center gap-1 whitespace-nowrap text-xs">
                        <input
                          type="checkbox"
                          class="checkbox checkbox-xs"
                          checked={sort.numeric}
                          onChange={(event) =>
                            props.setDraft(
                              "sorts",
                              index(),
                              "numeric",
                              event.currentTarget.checked,
                            )
                          }
                        />{" "}
                        Numeric
                      </label>
                    </Show>
                    <button
                      type="button"
                      class="btn btn-ghost btn-sm btn-square text-error"
                      aria-label={`Remove ${field()?.label || sort.field} sort`}
                      onClick={() => removeSort(index())}
                    >
                      <X size={16} />
                    </button>
                  </div>
                );
              }}
            </For>
            <div class="flex gap-2">
              <select
                class="select select-sm select-bordered min-w-0 flex-1"
                value={sortFieldId()}
                aria-label="Add sort field"
                disabled={props.draft.sorts.length >= maxSorts()}
                onChange={(event) => setSortFieldId(event.currentTarget.value)}
              >
                <option value="">
                  Add sort ({props.draft.sorts.length}/{maxSorts()})
                </option>
                <For
                  each={fields().filter(
                    (field) =>
                      field.sortable &&
                      !props.draft.sorts.some(
                        (sort) => sort.field === field.id,
                      ),
                  )}
                >
                  {(field) => <option value={field.id}>{field.label}</option>}
                </For>
              </select>
              <button
                type="button"
                class="btn btn-secondary btn-sm btn-square"
                aria-label="Add sort"
                disabled={
                  !sortFieldId() || props.draft.sorts.length >= maxSorts()
                }
                onClick={addSort}
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
          <div class="border-t border-base-200 pt-4">
            <h2 class="mb-2 flex items-center gap-2 text-sm font-bold">
              <SlidersHorizontal size={16} /> Pagination
            </h2>
            <label class="form-control gap-1">
              <span class="label-text text-xs font-semibold">
                Rows per page
              </span>
              <select
                class="select select-sm select-bordered w-full"
                value={props.draft.limit}
                onChange={(event) =>
                  props.setDraft("limit", Number(event.currentTarget.value))
                }
              >
                <For each={props.config.ui.pageSizes}>
                  {(size) => <option value={size}>{size} rows</option>}
                </For>
              </select>
            </label>
          </div>
        </div>
      </section>

      <div class="flex flex-col-reverse justify-between gap-3 border-t border-base-200 pt-4 sm:flex-row sm:items-center">
        <Show when={props.error}>
          <p class="text-sm text-error" role="alert">
            {props.error}
          </p>
        </Show>
        <span />
        <div class="flex gap-2">
          <button
            type="button"
            class="btn btn-ghost btn-sm flex-1 sm:flex-none"
            aria-label="Reset query changes"
            disabled={!props.hasPendingChanges()}
            onClick={props.onReset}
          >
            <RotateCcw size={16} /> Reset
          </button>
          <button
            type="button"
            class="btn btn-primary btn-sm flex-1 sm:flex-none"
            aria-label="Apply query changes"
            onClick={props.onApply}
          >
            Apply changes
          </button>
        </div>
      </div>
    </div>
  );
}
