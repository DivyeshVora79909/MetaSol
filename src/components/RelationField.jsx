import {
  For,
  Show,
  createEffect,
  createSignal,
  createUniqueId,
  onCleanup,
} from "solid-js";
import { createQuery } from "@tanstack/solid-query";
import { Check, ChevronDown, Search, X } from "lucide-solid";

import { fetchQuery } from "../lib/surreal";

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
const SEARCH_OPERATORS = Object.freeze({
  startsWith: (field, caseSensitive) => {
    if (caseSensitive) return `string::starts_with(<string>${field}, $search)`;
    return `string::starts_with(string::lowercase(<string>${field}), string::lowercase($search))`;
  },
});

const assertIdentifier = (value, path) => {
  if (!IDENTIFIER.test(value)) {
    throw new Error(
      `Relation field config ${path} must be a simple identifier.`,
    );
  }
  return value;
};

const displayValue = (value) =>
  value === null || value === undefined || value === "" ? "—" : String(value);

const getRequest = (config, search) => {
  const limit = config.limit || 15;

  if (typeof config.query === "function") {
    return config.query({ search, limit });
  }

  const table = assertIdentifier(config.table, "table");
  const fields = [...new Set(["id", ...(config.fields || [])])].map((field) =>
    assertIdentifier(field, "fields"),
  );
  const searchFields = (
    config.search?.fields || fields.filter((field) => field !== "id")
  ).map((field) => assertIdentifier(field, "search.fields"));
  const searchOperator = config.search?.operator || "startsWith";
  const buildPredicate = SEARCH_OPERATORS[searchOperator];
  if (!buildPredicate) {
    throw new Error(
      `Unsupported relation search operator "${searchOperator}".`,
    );
  }

  const predicates = searchFields.map((field) => buildPredicate(field));

  const where =
    search && predicates.length ? ` WHERE (${predicates.join(" OR ")})` : "";

  return {
    sql: `SELECT ${fields.join(", ")} FROM type::table($table)${where} LIMIT $limit;`,
    variables: { table, search, limit },
  };
};

/**
 * Native Solid relation control for selecting one database record.
 *
 * The caller supplies only `config` plus its controlled `value` / `onChange`.
 * The config controls the projection, searchable fields, query limit, debounce,
 * labels and columns. A custom query function can return `{ sql, variables }`
 * for lookups that do not map to one table.
 */
export default function RelationField(props) {
  let root;
  let input;

  const listboxId = `relation-options-${createUniqueId()}`;
  const [isOpen, setIsOpen] = createSignal(false);
  const [inputValue, setInputValue] = createSignal("");
  const [search, setSearch] = createSignal("");
  const [activeIndex, setActiveIndex] = createSignal(-1);

  const config = () => props.config;
  const columns = () => config().columns || [];
  const labelKey = () => config().labelKey || columns()[0]?.key || "id";
  const value = () => props.value ?? null;
  const labelFor = (record) => displayValue(record?.[labelKey()]);
  const records = () => recordsQuery.data || [];
  const selectedId = () => (value()?.id ? String(value().id) : null);
  const emptyMessage = () =>
    inputValue().trim()
      ? `No records match “${inputValue().trim()}”.`
      : "No records are available.";

  createEffect(() => {
    const currentInput = inputValue().trim();
    const delay = config().debounceMs ?? 250;

    const timeout = window.setTimeout(() => setSearch(currentInput), delay);
    onCleanup(() => window.clearTimeout(timeout));
  });

  createEffect(() => {
    const selected = value();
    if (!isOpen()) setInputValue(selected ? labelFor(selected) : "");
  });

  createEffect(() => {
    const onPointerDown = (event) => {
      if (root && !root.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    onCleanup(() => document.removeEventListener("pointerdown", onPointerDown));
  });

  const recordsQuery = createQuery(() => ({
    queryKey: [
      "relation",
      config().queryKey || config().table,
      search(),
      config().limit || 15,
    ],
    queryFn: async () => {
      const request = getRequest(config(), search());
      const response = await fetchQuery(request.sql, request.variables || {});
      return response[0] || [];
    },
    placeholderData: (previousData) => previousData,
  }));

  const open = () => {
    if (props.disabled) return;
    setIsOpen(true);
    setActiveIndex(records().length ? 0 : -1);
  };

  const select = (record) => {
    props.onChange?.({ ...record, id: String(record.id) });
    props.onBlur?.();
    setInputValue(labelFor(record));
    setIsOpen(false);
    input?.focus();
  };

  const clear = () => {
    props.onChange?.(null);
    setInputValue("");
    setSearch("");
    open();
    input?.focus();
  };

  const onKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      open();
      setActiveIndex((index) => Math.min(index + 1, records().length - 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      open();
      setActiveIndex((index) => Math.max(index - 1, 0));
    }
    if (event.key === "Enter" && isOpen() && activeIndex() >= 0) {
      event.preventDefault();
      select(records()[activeIndex()]);
    }
    if (event.key === "Escape") {
      setIsOpen(false);
      setInputValue(value() ? labelFor(value()) : "");
    }
  };

  return (
    <div ref={root} class="relative">
      <div
        class={`input input-bordered flex w-full items-center gap-2 px-3 transition-shadow focus-within:outline-primary ${props.invalid ? "input-error" : ""}`}
      >
        <Search size={16} class="shrink-0 text-base-content/45" />
        <input
          ref={input}
          type="text"
          class="min-w-0 flex-1 bg-transparent outline-none"
          value={inputValue()}
          placeholder={config().placeholder || "Search records"}
          disabled={props.disabled}
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={isOpen()}
          aria-invalid={props.invalid || undefined}
          onFocus={open}
          onBlur={props.onBlur}
          onInput={(event) => {
            setInputValue(event.currentTarget.value);
            setActiveIndex(0);
            open();
          }}
          onKeyDown={onKeyDown}
        />
        <Show when={value()}>
          <button
            type="button"
            class="btn btn-ghost btn-xs btn-square"
            aria-label="Clear selected relation"
            onMouseDown={(event) => event.preventDefault()}
            onClick={clear}
            disabled={props.disabled}
          >
            <X size={14} />
          </button>
        </Show>
        <button
          type="button"
          class="btn btn-ghost btn-xs btn-square"
          aria-label="Toggle relation options"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => (isOpen() ? setIsOpen(false) : open())}
          disabled={props.disabled}
        >
          <ChevronDown size={16} />
        </button>
      </div>

      <Show when={isOpen()}>
        <div class="absolute z-30 mt-2 w-full overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-xl">
          <div
            class="grid border-b border-base-200 bg-base-200/60 px-3 py-2 text-[0.7rem] font-semibold uppercase tracking-wide text-base-content/55"
            style={{
              "grid-template-columns": `repeat(${Math.max(columns().length, 1)}, minmax(0, 1fr))`,
            }}
          >
            <For each={columns()}>
              {(column) => <span>{column.label}</span>}
            </For>
          </div>

          <div
            id={listboxId}
            role="listbox"
            class="max-h-64 overflow-y-auto p-1"
          >
            <Show when={recordsQuery.isFetching && records().length === 0}>
              <div class="flex items-center gap-2 px-3 py-4 text-sm text-base-content/60">
                <span class="loading loading-spinner loading-xs" /> Loading
                records
              </div>
            </Show>
            <Show when={recordsQuery.isError}>
              <div class="px-3 py-4 text-sm text-error">
                Unable to load records.{" "}
                {recordsQuery.error?.message || "Please try again."}
              </div>
            </Show>
            <Show
              when={
                !recordsQuery.isFetching &&
                !recordsQuery.isError &&
                records().length === 0
              }
            >
              <div class="px-3 py-4 text-sm text-base-content/60">
                {emptyMessage()}
              </div>
            </Show>
            <For each={records()}>
              {(record, index) => {
                const selected = () => String(record.id) === selectedId();
                const active = () => index() === activeIndex();
                return (
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected()}
                    class={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-btn px-3 py-2.5 text-left text-sm transition-colors ${active() ? "bg-base-200" : "hover:bg-base-200/70"} ${selected() ? "bg-primary/10 text-primary" : ""}`}
                    onMouseEnter={() => setActiveIndex(index())}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => select(record)}
                  >
                    <span
                      class="grid min-w-0 gap-x-4"
                      style={{
                        "grid-template-columns": `repeat(${Math.max(columns().length, 1)}, minmax(0, 1fr))`,
                      }}
                    >
                      <For each={columns()}>
                        {(column) => (
                          <span
                            class={`truncate ${column.primary ? "font-medium" : "text-base-content/65"} ${column.mono ? "font-mono text-xs" : ""}`}
                            title={displayValue(record[column.key])}
                          >
                            {displayValue(record[column.key])}
                          </span>
                        )}
                      </For>
                    </span>
                    <Show when={selected()}>
                      <Check size={16} class="shrink-0" />
                    </Show>
                  </button>
                );
              }}
            </For>
          </div>

          <Show when={recordsQuery.isFetching && records().length > 0}>
            <div class="border-t border-base-200 px-3 py-2 text-xs text-base-content/55">
              Updating records…
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
}
