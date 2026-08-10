import { createSignal, createEffect, onCleanup, Show, For } from "solid-js";
import { createQuery } from "@tanstack/solid-query";
import {
  ChevronsUpDown,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-solid";
import { fetchQuery } from "../lib/surreal";

/**
 * Polymorphic Relational Picker
 * @param {string} props.mode - "single" | "multiple"
 * @param {any} props.value - string ID or array of string IDs
 * @param {Function} props.onChange - (val) => void
 * @param {Array} props.targets - Config array: [{ table, label, searchable, columns: [{key, label}] }]
 * @param {string} props.placeholder
 */
export default function RecordSelect(props) {
  let containerRef;
  let searchInputRef;

  const [isOpen, setIsOpen] = createSignal(false);
  const [activeTab, setActiveTab] = createSignal(0);
  const [searchInput, setSearchInput] = createSignal("");
  const [activeSearch, setActiveSearch] = createSignal("");
  const [page, setPage] = createSignal(1);
  const limit = 5;

  const isMulti = () => props.mode === "multiple";
  const activeTarget = () => props.targets[activeTab()];

  const safeValue = () => {
    if (!props.value) return [];
    return Array.isArray(props.value)
      ? [...props.value].map(String)
      : [String(props.value)];
  };

  createEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef && !containerRef.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("pointerdown", handleClickOutside);
    onCleanup(() =>
      document.removeEventListener("pointerdown", handleClickOutside),
    );
  });

  createEffect(() => {
    if (isOpen()) {
      setTimeout(() => searchInputRef?.focus(), 10);
    } else {
      setSearchInput("");
      setActiveSearch("");
      setPage(1);
    }
  });

  const stopEvent = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
  };

  const triggerSearch = (e) => {
    stopEvent(e);
    setActiveSearch(searchInput().trim());
    setPage(1);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") triggerSearch(e);
  };

  const switchTab = (index) => {
    setActiveTab(index);
    setSearchInput("");
    setActiveSearch("");
    setPage(1);
    setTimeout(() => searchInputRef?.focus(), 10);
  };

  // 1. HYDRATION: Pure JS grouping + targeted queries
  const dictionaryQuery = createQuery(() => ({
    queryKey: ["record_select_dict", safeValue()],
    enabled: safeValue().length > 0,
    queryFn: async () => {
      const ids = safeValue();
      const groups = {};

      ids.forEach((id) => {
        const prefix = id.split(":")[0];
        if (!groups[prefix]) groups[prefix] = [];
        groups[prefix].push(id);
      });

      const dict = {};
      await Promise.all(
        Object.entries(groups).map(async ([prefix, groupIds]) => {
          const target = props.targets.find((t) => t.table === prefix);
          if (!target) return;

          const cols = ["id", ...target.columns.map((c) => c.key)].join(", ");
          const res = await fetchQuery(
            `SELECT ${cols} FROM type::table($tb) WHERE id IN $ids`,
            { tb: prefix, ids: groupIds },
          );

          (res[0] || []).forEach((row) => {
            dict[row.id] = target.columns
              .map((c) => row[c.key])
              .filter(Boolean)
              .join(" • ");
          });
        }),
      );
      return dict;
    },
    staleTime: 1000 * 60 * 5,
  }));

  // 2. LOOKUP: Highly optimized, tab-isolated query
  const lookupQuery = createQuery(() => ({
    queryKey: [
      "record_select_lookup",
      activeTarget().table,
      activeSearch(),
      page(),
    ],
    enabled: isOpen(),
    queryFn: async () => {
      const target = activeTarget();
      const term = activeSearch();
      const start = (page() - 1) * limit;

      const cols = ["id", ...target.columns.map((c) => c.key)].join(", ");
      let whereClause = "";

      if (term && target.searchable?.length > 0) {
        const clauses = target.searchable.map(
          (f) => `string::starts_with(${f}, $term)`,
        );
        whereClause = `WHERE ${clauses.join(" OR ")}`;
      }

      const sql = `SELECT ${cols} FROM type::table($table) ${whereClause} LIMIT ${limit + 1} START ${start};`;
      const res = await fetchQuery(sql, { table: target.table, term });
      const data = res[0] || [];
      return { data: data.slice(0, limit), hasNext: data.length > limit };
    },
    placeholderData: (prev) => prev,
  }));

  const toggleItem = (e, id) => {
    stopEvent(e);
    const strId = String(id);
    if (!isMulti()) {
      props.onChange(strId);
      setIsOpen(false);
      return;
    }
    const current = safeValue();
    if (current.includes(strId)) {
      props.onChange(current.filter((i) => i !== strId));
    } else {
      props.onChange([...current, strId]);
    }
  };

  const removeItem = (e, id) => {
    stopEvent(e);
    const next = safeValue().filter((i) => i !== String(id));
    props.onChange(isMulti() ? next : null);
  };

  const clearAll = (e) => {
    stopEvent(e);
    props.onChange(isMulti() ? [] : null);
  };

  return (
    <div class="relative w-full text-sm" ref={containerRef}>
      {/* TRIGGER BOX */}
      <div
        class={`flex flex-col min-h-10 w-full border rounded-btn bg-base-100 transition-colors cursor-pointer ${isOpen() ? "border-primary ring-1 ring-primary/20" : "border-base-300 hover:border-base-content/30"}`}
        onClick={(e) => {
          stopEvent(e);
          setIsOpen(!isOpen());
        }}
      >
        <div class="flex items-center justify-between p-2 pb-1 border-b border-transparent">
          <span class="text-[10px] font-bold text-base-content/50 uppercase tracking-wider">
            {isMulti() ? `${safeValue().length} Selected` : "Selected Record"}
          </span>
          <div class="flex items-center gap-1 shrink-0 text-base-content/40">
            <Show when={safeValue().length > 0}>
              <button
                type="button"
                class="p-1 hover:text-error rounded-md transition-colors"
                onClick={clearAll}
              >
                <X size={14} />
              </button>
              <div class="w-[1px] h-4 bg-base-300 mx-1"></div>
            </Show>
            <ChevronsUpDown size={14} />
          </div>
        </div>

        <div class="flex flex-wrap gap-1.5 p-2 pt-0 min-h-8">
          <Show when={safeValue().length === 0}>
            <span class="text-base-content/40 my-auto text-sm">
              {props.placeholder || "Select records..."}
            </span>
          </Show>
          <Show when={dictionaryQuery.isFetching}>
            <span class="loading loading-dots loading-xs text-primary my-auto"></span>
          </Show>

          <For each={safeValue()}>
            {(id) => {
              const label = dictionaryQuery.data?.[id];
              return (
                <div class="flex items-center gap-1 bg-base-200 border border-base-300 rounded-md pl-2 pr-1 py-0.5 max-w-full">
                  <span class="truncate text-xs font-medium text-base-content">
                    {label ? label : id}
                  </span>
                  <button
                    type="button"
                    class="p-0.5 hover:bg-error hover:text-error-content rounded shrink-0 transition-colors"
                    onClick={(e) => removeItem(e, id)}
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            }}
          </For>
        </div>
      </div>

      {/* DROPDOWN POPOVER */}
      <Show when={isOpen()}>
        <div class="absolute z-50 top-full left-0 mt-1 w-full min-w-[320px] bg-base-100 border border-base-300 rounded-box shadow-xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          <Show when={props.targets.length > 1}>
            <div class="flex bg-base-200/50 border-b border-base-200 overflow-x-auto hide-scrollbar">
              <For each={props.targets}>
                {(target, idx) => (
                  <button
                    type="button"
                    class={`flex-1 min-w-[80px] py-2 px-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab() === idx() ? "text-primary border-b-2 border-primary bg-base-100" : "text-base-content/50 hover:bg-base-200"}`}
                    onClick={(e) => {
                      stopEvent(e);
                      switchTab(idx());
                    }}
                  >
                    {target.label}
                  </button>
                )}
              </For>
            </div>
          </Show>

          <div class="flex items-center gap-2 p-2 border-b border-base-200 bg-base-200/30">
            <input
              ref={searchInputRef}
              type="text"
              class="flex-1 input input-sm input-bordered focus:outline-none"
              placeholder={`Search ${activeTarget().label}...`}
              value={searchInput()}
              onInput={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onClick={stopEvent}
            />
            <button
              type="button"
              class="btn btn-sm btn-primary shrink-0"
              onClick={triggerSearch}
            >
              <Search size={14} />
            </button>
          </div>

          <div
            class="grid px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-base-content/50 bg-base-200/50 border-b border-base-200"
            style={{
              "grid-template-columns": `repeat(${activeTarget().columns.length}, minmax(0, 1fr)) 24px`,
            }}
          >
            <For each={activeTarget().columns}>
              {(col) => <span class="truncate pr-2">{col.label}</span>}
            </For>
            <span></span>
          </div>

          <div
            class="max-h-64 overflow-y-auto p-1 relative min-h-[100px]"
            onClick={stopEvent}
          >
            <Show when={lookupQuery.isFetching}>
              <div class="absolute inset-0 bg-base-100/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
                <span class="loading loading-spinner text-primary loading-sm"></span>
              </div>
            </Show>
            <Show
              when={
                lookupQuery.data?.data?.length === 0 && !lookupQuery.isFetching
              }
            >
              <div class="p-6 text-center text-base-content/40 text-sm">
                No records found.
              </div>
            </Show>
            <div class="flex flex-col gap-0.5">
              <For each={lookupQuery.data?.data}>
                {(row) => {
                  const rowId = String(row.id);
                  const isSelected = safeValue().includes(rowId);
                  return (
                    <button
                      type="button"
                      class={`w-full grid items-center px-2 py-2 text-left rounded-btn transition-colors ${isSelected ? "bg-primary/10 text-primary" : "hover:bg-base-200/60 text-base-content"}`}
                      style={{
                        "grid-template-columns": `repeat(${activeTarget().columns.length}, minmax(0, 1fr)) 24px`,
                      }}
                      onClick={(e) => toggleItem(e, rowId)}
                    >
                      <For each={activeTarget().columns}>
                        {(col) => (
                          <span class="truncate pr-2">
                            {String(row[col.key] ?? "—")}
                          </span>
                        )}
                      </For>
                      <div class="flex justify-end">
                        <Show when={isSelected}>
                          <Check size={16} class="text-primary" />
                        </Show>
                      </div>
                    </button>
                  );
                }}
              </For>
            </div>
          </div>

          <div
            class="border-t border-base-200 bg-base-200/30 p-1.5 flex items-center justify-between"
            onClick={stopEvent}
          >
            <span class="text-xs text-base-content/50 font-medium px-2">
              Page {page()}
            </span>
            <div class="flex gap-1">
              <button
                type="button"
                class="btn btn-xs btn-ghost px-2"
                disabled={page() === 1 || lookupQuery.isFetching}
                onClick={(e) => {
                  stopEvent(e);
                  setPage((p) => p - 1);
                }}
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <button
                type="button"
                class="btn btn-xs btn-ghost px-2"
                disabled={!lookupQuery.data?.hasNext || lookupQuery.isFetching}
                onClick={(e) => {
                  stopEvent(e);
                  setPage((p) => p + 1);
                }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}
