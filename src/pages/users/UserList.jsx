import { createEffect, Show } from "solid-js";
import { A } from "@solidjs/router";
import { Plus, Filter, Download, Upload, X, Trash2 } from "lucide-solid";
import { createQuery } from "@tanstack/solid-query";

import { useUI } from "../../store/ui";
import { fetchQuery } from "../../lib/surreal";
import { userKeys } from "./user.keys";
import { useUserTableState } from "./UserTableState";

import ModuleToolbar from "../../components/ModuleToolbar";
import QueryBuilder from "../../components/QueryBuilder";
import DataTable from "../../components/DataTable";
import Pagination from "../../components/Pagination";
import ExportPanel from "../../components/ExportPanel";

export default function UserList() {
  const { setPageMeta } = useUI();
  const state = useUserTableState();

  createEffect(() => setPageMeta("Node Analytics", "users"));

  const listQuery = createQuery(() => {
    const query = state.compiledQuery();
    return {
      queryKey: userKeys.list(state.appliedQuery()),
      enabled: Boolean(query),
      queryFn: async () => {
        const [dataResponse, countResponse] = await Promise.all([
          fetchQuery(query.sql, query.variables),
          fetchQuery(query.countSql, query.variables),
        ]);
        return {
          data: dataResponse[0] || [],
          total: Number(countResponse[0]?.[0]?.count || 0),
        };
      },
      placeholderData: (previous) => previous,
    };
  });

  createEffect(() => {
    const totalPages = Math.max(
      1,
      Math.ceil((listQuery.data?.total || 0) / state.appliedQuery().limit),
    );
    if (state.appliedQuery().page > totalPages) {
      state.setPage(totalPages);
    }
  });

  const tools = [
    {
      id: "query",
      icon: Filter,
      label: "Query Builder",
      badge: () => (
        <div class="flex gap-1 ml-2">
          <span class="badge badge-ghost badge-sm">
            {state.draftQuery.filters.length} filters
          </span>
          <Show when={state.hasPendingChanges()}>
            <span class="badge badge-warning badge-sm">Unsaved</span>
          </Show>
        </div>
      ),
      content: () => (
        <QueryBuilder
          config={state.config}
          draft={state.draftQuery}
          setDraft={state.setDraftQuery}
          hasPendingChanges={state.hasPendingChanges}
          error={state.compileError()}
          onApply={state.commitQuery}
          onReset={state.resetDraft}
        />
      ),
    },
    {
      id: "export",
      icon: Download,
      label: "Export",
      content: () => (
        <ExportPanel
          config={state.config}
          queryState={state.appliedQuery()}
          selectedIds={state.selectedRecords()}
        />
      ),
    },
    {
      id: "import",
      icon: Upload,
      label: "Import",
      content: () => (
        <div class="p-6 text-center text-base-content/60 border-t border-base-200">
          <h3 class="font-bold text-base-content">
            Import Configuration Placeholder
          </h3>
          <p class="text-sm mt-1">
            File upload dropzone and mapping tools will go here.
          </p>
        </div>
      ),
    },
  ];

  return (
    <main class="flex min-h-full flex-col gap-[var(--app-pad)] pb-[var(--app-pad)]">
      <section class="overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-sm relative">
        <Show
          when={state.selectedRecords().length > 0}
          fallback={
            <header class="flex items-center justify-between gap-4 px-4 py-3 sm:px-5 animate-in fade-in">
              <div class="min-w-0 flex-1">
                <h1 class="truncate text-lg font-bold tracking-tight">
                  {state.config.ui.title}
                </h1>
                <p class="mt-0.5 truncate text-xs text-base-content/60">
                  {state.config.ui.description}
                </p>
              </div>
              <A
                href="/users/new"
                class="btn btn-primary btn-sm sm:btn-md shadow-sm"
              >
                <Plus size={18} />
                <span class="hidden sm:inline">
                  Create {state.config.ui.entityLabel}
                </span>
              </A>
            </header>
          }
        >
          <header class="flex items-center justify-between gap-4 px-4 py-3 sm:px-5 bg-accent/10 border-b border-accent/20 animate-in fade-in slide-in-from-top-2">
            <div class="flex items-center gap-3">
              <button
                class="btn btn-circle btn-sm btn-ghost text-base-content/70 hover:bg-base-200"
                onClick={state.clearSelection}
                title="Clear Selection"
              >
                <X size={16} />
              </button>
              <div>
                <h1 class="text-lg font-bold text-accent tracking-tight">
                  {state.selectedRecords().length} Selected
                </h1>
                <p class="text-xs text-base-content/70">
                  Rows persisted across pagination
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <button
                class="btn btn-sm btn-error shadow-sm"
                onClick={() => state.promptDelete(state.selectedRecords())}
              >
                <Trash2 size={14} /> Delete Selected
              </button>
            </div>
          </header>
        </Show>

        <ModuleToolbar tools={tools} />
      </section>

      <section class="min-h-96 flex-1">
        <DataTable
          config={state.config}
          select={state.appliedQuery().select}
          data={listQuery.data?.data}
          isLoading={listQuery.isLoading}
          error={listQuery.error?.message}
          entityLabelPlural={state.config.ui.entityLabelPlural}
          baseRoute="/users"
          onDelete={(id) => state.promptDelete([id])}
          isSelected={state.isSelected}
          onRowClick={state.toggleSelection}
        />
      </section>

      <Pagination
        page={state.appliedQuery().page}
        limit={state.appliedQuery().limit}
        total={listQuery.data?.total}
        label={state.config.ui.entityLabelPlural}
        onPageChange={state.setPage}
      />
    </main>
  );
}
