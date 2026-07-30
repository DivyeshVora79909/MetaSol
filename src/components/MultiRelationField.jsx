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

export default function MultiRelationField(props) {
  let containerRef;
  let searchInputRef;

  const [isOpen, setIsOpen] = createSignal(false);
  const [searchInput, setSearchInput] = createSignal("");
  const [activeSearch, setActiveSearch] = createSignal("");
  const [page, setPage] = createSignal(1);
  const limit = 5;

  // THE LOCAL DICTIONARY: Memorizes records so we don't fetch on every click
  const [recordDict, setRecordDict] = createSignal({});

  const safeValue = () =>
    Array.isArray(props.value) ? [...props.value].map(String) : [];

  // Identify which IDs we don't have labels for yet
  const missingIds = () => safeValue().filter((id) => !recordDict()[id]);

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

  // HYDRATION: ONLY fetches records we haven't seen yet
  const hydrationQuery = createQuery(() => ({
    queryKey: ["multi_hydrate", props.config.table, missingIds()],
    enabled: missingIds().length > 0,
    queryFn: async () => {
      const sql = `SELECT * FROM type::table($table) WHERE id IN $ids.map(|$id| type::record($id));`;
      const res = await fetchQuery(sql, {
        table: props.config.table,
        ids: missingIds(),
      });
      return res[0] || [];
    },
    staleTime: 1000 * 60 * 5,
  }));

  // SEARCH LOOKUP
  const lookupQuery = createQuery(() => ({
    queryKey: ["multi_lookup", props.config.table, activeSearch(), page()],
    enabled: isOpen(),
    queryFn: async () => {
      const term = activeSearch();
      const start = (page() - 1) * limit;
      let whereClause = "";
      if (term && props.config.searchFields?.length > 0) {
        const conditions = props.config.searchFields.map(
          (f) =>
            `string::contains(string::lowercase(type::string(${f} ?? "")), string::lowercase($term))`,
        );
        whereClause = `WHERE ${conditions.join(" OR ")}`;
      }
      const sql = `SELECT * FROM type::table($table) ${whereClause} LIMIT ${limit + 1} START ${start};`;
      const res = await fetchQuery(sql, { table: props.config.table, term });
      const data = res[0] || [];
      return { data: data.slice(0, limit), hasNext: data.length > limit };
    },
  }));

  // Update Dictionary when new data arrives from EITHER query
  createEffect(() => {
    const data1 = hydrationQuery.data;
    const data2 = lookupQuery.data?.data;
    if (data1 || data2) {
      setRecordDict((prev) => {
        const next = { ...prev };
        data1?.forEach((r) => (next[String(r.id)] = r));
        data2?.forEach((r) => (next[String(r.id)] = r));
        return next;
      });
    }
  });

  const toggleItem = (e, id) => {
    stopEvent(e);
    const strId = String(id);
    const current = safeValue();
    if (current.includes(strId)) {
      props.onChange(current.filter((i) => i !== strId));
    } else {
      props.onChange([...current, strId]);
    }
  };

  const removeItem = (e, id) => {
    stopEvent(e);
    props.onChange(safeValue().filter((i) => i !== String(id)));
  };

  const clearAll = (e) => {
    stopEvent(e);
    props.onChange([]);
  };

  const renderLabel = (record) =>
    props.config.columns
      .map((col) => String(record[col.key] ?? "—"))
      .join(" • ");

  return (
    <div class="relative w-full text-sm" ref={containerRef}>
      <div
        class={`flex flex-col min-h-10 w-full border rounded-btn bg-base-100 transition-colors cursor-pointer ${isOpen() ? "border-primary ring-1 ring-primary/20" : "border-base-300 hover:border-base-content/30"}`}
        onClick={(e) => {
          stopEvent(e);
          setIsOpen(!isOpen());
        }}
      >
        <div class="flex items-center justify-between p-2 pb-1 border-b border-transparent">
          <span class="text-[10px] font-bold text-base-content/50 uppercase tracking-wider">
            {safeValue().length} Selected
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
            <span class="text-base-content/40 my-auto">
              {props.config.placeholder || "Select records..."}
            </span>
          </Show>
          <Show when={hydrationQuery.isFetching}>
            <span class="loading loading-dots loading-xs text-primary my-auto"></span>
          </Show>

          <For each={safeValue()}>
            {(id) => {
              const record = recordDict()[id];
              return (
                <div class="flex items-center gap-1 bg-base-200 border border-base-300 rounded-md pl-2 pr-1 py-0.5 max-w-full">
                  <span class="truncate text-xs font-medium text-base-content">
                    {record ? renderLabel(record) : id}
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

      <Show when={isOpen()}>
        <div class="absolute z-50 top-full left-0 mt-1 w-full min-w-[300px] bg-base-100 border border-base-300 rounded-box shadow-xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          <div class="flex items-center gap-2 p-2 border-b border-base-200 bg-base-200/30">
            <input
              type="text"
              class="flex-1 input input-sm input-bordered focus:outline-none"
              placeholder="Search..."
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
              "grid-template-columns": `repeat(${props.config.columns.length}, minmax(0, 1fr)) 24px`,
            }}
          >
            <For each={props.config.columns}>
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
                        "grid-template-columns": `repeat(${props.config.columns.length}, minmax(0, 1fr)) 24px`,
                      }}
                      onClick={(e) => toggleItem(e, rowId)}
                    >
                      <For each={props.config.columns}>
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
