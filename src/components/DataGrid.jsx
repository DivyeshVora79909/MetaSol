import { createSignal, createMemo, Show } from "solid-js";
import { createStore, unwrap } from "solid-js/store";
import { createQuery, useQueryClient } from "@tanstack/solid-query";
import {
  Filter,
  Download,
  Plus,
  Trash2,
  X,
  LayoutGrid,
  List,
  Search,
} from "lucide-solid";
import toast from "solid-toast";
import { A } from "@solidjs/router";

import { fetchQuery } from "../lib/surreal";
import { compileQuery } from "../lib/queryEngine/index.js";

import ModuleToolbar from "./ModuleToolbar";
import QueryBuilder from "./QueryBuilder";
import DataTable from "./DataTable";
import DataCards from "./DataCards";
import Pagination from "./Pagination";
import ExportPanel from "./ExportPanel";

const clone = (v) => structuredClone(v);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const shape = ({ page: _p, ...rest }) => rest;

export default function DataGrid(props) {
  const queryClient = useQueryClient();
  const CONFIG = props.config;

  const [draftQuery, setDraftQuery] = createStore(clone(CONFIG.defaultState));
  const [appliedQuery, setAppliedQuery] = createSignal(
    clone(CONFIG.defaultState),
  );
  const [selectedIds, setSelectedIds] = createSignal([]);
  const [compileError, setCompileError] = createSignal("");
  const [viewMode, setViewMode] = createSignal(
    localStorage.getItem("rebase_view_mode") || "table",
  );

  const toggleViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem("rebase_view_mode", mode);
  };

  const hasPendingChanges = createMemo(
    () => !same(unwrap(draftQuery), appliedQuery()),
  );

  const compiledQuery = createMemo(() => {
    try {
      setCompileError("");
      return compileQuery(CONFIG, appliedQuery());
    } catch (e) {
      setCompileError(e.message || "Invalid query configuration.");
      return null;
    }
  });

  const listQuery = createQuery(() => {
    const query = compiledQuery();
    return {
      queryKey: [CONFIG.domain, "list", JSON.stringify(appliedQuery())],
      enabled: Boolean(query),
      queryFn: async () => {
        const [dataRes, countRes] = await Promise.all([
          fetchQuery(query.sql, query.variables),
          fetchQuery(query.countSql, query.variables),
        ]);
        return {
          data: dataRes[0] || [],
          total: Number(countRes[0]?.[0]?.count || 0),
        };
      },
      placeholderData: (prev) => prev,
    };
  });

  const commitQuery = () => {
    const next = clone(unwrap(draftQuery));
    if (!same(shape(next), shape(appliedQuery()))) {
      next.page = 1;
      setDraftQuery("page", 1);
    }
    try {
      compileQuery(CONFIG, next);
      setCompileError("");
      setAppliedQuery(next);
    } catch (e) {
      setCompileError(e.message);
    }
  };

  let searchTimeout;
  const handleSearch = (val) => {
    setDraftQuery("search", val);
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      commitQuery();
    }, 500);
  };

  const resetDraft = () => {
    setCompileError("");
    setDraftQuery(clone(CONFIG.defaultState));
  };

  const setPage = (p) => {
    setDraftQuery("page", p);
    setAppliedQuery((curr) => ({ ...curr, page: p }));
  };

  const toggleSelection = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const deleteRecords = async (ids) => {
    if (!ids?.length) return;
    if (!window.confirm(`Permanently delete ${ids.length} record(s)?`)) return;

    try {
      const res = await fetchQuery(
        `DELETE ${CONFIG.table} WHERE id IN $ids RETURN BEFORE;`,
        { ids },
      );
      const deletedCount = res[0]?.length || 0;
      if (deletedCount === 0) throw new Error("Permission denied or missing.");

      toast.success(`Deleted ${deletedCount} record(s).`);
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: [CONFIG.domain, "list"] });
    } catch (err) {
      toast.error(`Delete failed: ${err.message}`);
    }
  };

  const tools = [
    {
      id: "query",
      icon: Filter,
      label: "Filters",
      badge: () => (
        <Show when={draftQuery.filters.length > 0 || hasPendingChanges()}>
          <div class="flex gap-1 ml-2">
            <Show when={draftQuery.filters.length > 0}>
              <span class="badge badge-ghost badge-sm">
                {draftQuery.filters.length}
              </span>
            </Show>
            <Show when={hasPendingChanges()}>
              <span class="badge badge-warning badge-sm">Unsaved</span>
            </Show>
          </div>
        </Show>
      ),
      content: () => (
        <QueryBuilder
          config={CONFIG}
          draft={draftQuery}
          setDraft={setDraftQuery}
          hasPendingChanges={hasPendingChanges}
          error={compileError()}
          onApply={commitQuery}
          onReset={resetDraft}
        />
      ),
    },
    {
      id: "export",
      icon: Download,
      label: "Export",
      content: () => (
        <ExportPanel
          config={CONFIG}
          queryState={appliedQuery()}
          selectedIds={selectedIds()}
        />
      ),
    },
  ];

  return (
    <div class="flex flex-col h-full gap-4 pb-4">
      <section class="overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-sm">
        <Show
          when={selectedIds().length > 0}
          fallback={
            <header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 py-3 sm:px-5">
              <div class="min-w-0 flex-1 hidden sm:block">
                <h2 class="truncate text-lg font-bold tracking-tight">
                  {CONFIG.ui.title}
                </h2>
                <p class="mt-0.5 truncate text-xs text-base-content/60">
                  {CONFIG.ui.description}
                </p>
              </div>

              <div class="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                <Show when={CONFIG.searchable?.length > 0}>
                  <div class="relative flex-1 sm:w-56">
                    <Search
                      size={14}
                      class="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50"
                    />
                    <input
                      type="text"
                      placeholder="Search..."
                      class="input input-sm input-bordered w-full pl-8 focus:outline-primary transition-all bg-base-200/50 focus:bg-base-100"
                      value={draftQuery.search || ""}
                      onInput={(e) => handleSearch(e.currentTarget.value)}
                    />
                  </div>
                </Show>

                <div class="join border border-base-300 shadow-sm hidden sm:inline-flex">
                  <button
                    type="button"
                    class={`btn btn-sm join-item hover:bg-base-200 transition-colors ${viewMode() === "table" ? "bg-base-300 text-primary" : "btn-ghost text-base-content/60"}`}
                    onClick={() => toggleViewMode("table")}
                    title="Table View"
                  >
                    <List size={16} />
                  </button>
                  <button
                    type="button"
                    class={`btn btn-sm join-item hover:bg-base-200 transition-colors ${viewMode() === "grid" ? "bg-base-300 text-primary" : "btn-ghost text-base-content/60"}`}
                    onClick={() => toggleViewMode("grid")}
                    title="Grid View"
                  >
                    <LayoutGrid size={16} />
                  </button>
                </div>
                <A
                  href={props.createPath || "new"}
                  class="btn btn-primary btn-sm sm:btn-md shadow-sm whitespace-nowrap"
                >
                  <Plus size={18} />{" "}
                  <span class="hidden sm:inline">
                    New {CONFIG.ui.entityLabel}
                  </span>
                </A>
              </div>
            </header>
          }
        >
          <header class="flex items-center justify-between gap-4 px-4 py-3 sm:px-5 bg-primary/10 border-b border-primary/20">
            <div class="flex items-center gap-3">
              <button
                class="btn btn-circle btn-sm btn-ghost hover:bg-base-200 text-primary"
                onClick={() => setSelectedIds([])}
              >
                <X size={16} />
              </button>
              <div>
                <h2 class="text-lg font-bold text-primary tracking-tight">
                  {selectedIds().length} Selected
                </h2>
              </div>
            </div>
            <button
              class="btn btn-sm btn-error shadow-sm"
              onClick={() => deleteRecords(selectedIds())}
            >
              <Trash2 size={14} /> Delete Selected
            </button>
          </header>
        </Show>

        <ModuleToolbar tools={tools} />
      </section>

      <section class="min-h-96 flex-1 flex flex-col min-w-0">
        <Show when={viewMode() === "table"}>
          <DataTable
            config={CONFIG}
            select={appliedQuery().select}
            data={listQuery.data?.data}
            isLoading={listQuery.isFetching}
            error={listQuery.error?.message}
            entityLabelPlural={CONFIG.ui.entityLabelPlural}
            baseRoute={props.baseRoute}
            onDelete={(id) => deleteRecords([id])}
            isSelected={(id) => selectedIds().includes(id)}
            onRowClick={toggleSelection}
          />
        </Show>
        <Show when={viewMode() === "grid"}>
          <DataCards
            config={CONFIG}
            select={appliedQuery().select}
            data={listQuery.data?.data}
            isLoading={listQuery.isFetching}
            error={listQuery.error?.message}
            entityLabelPlural={CONFIG.ui.entityLabelPlural}
            baseRoute={props.baseRoute}
            onDelete={(id) => deleteRecords([id])}
            isSelected={(id) => selectedIds().includes(id)}
            onRowClick={toggleSelection}
          />
        </Show>
      </section>

      <Pagination
        page={appliedQuery().page}
        limit={appliedQuery().limit}
        total={listQuery.data?.total}
        label={CONFIG.ui.entityLabelPlural}
        onPageChange={setPage}
        isLoading={listQuery.isFetching}
      />
    </div>
  );
}
