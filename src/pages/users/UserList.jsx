import { createEffect, Show } from "solid-js";
import { A } from "@solidjs/router";
import { Plus, Filter, Download, Upload, X, Trash2 } from "lucide-solid";
import { useUI } from "../../store/ui";
import ModuleToolbar from "../../components/ModuleToolbar";
import QueryBuilder from "../../components/QueryBuilder";
import DataTable from "../../components/DataTable";
import Pagination from "../../components/Pagination";
import ExportPanel from "../../components/ExportPanel";
import { useUserDomain } from "./UserContext";
import { fetchQuery } from "../../lib/surreal";
import toast from "solid-toast";

export default function UserList() {
  const { setPageMeta, openModal } = useUI();
  const domain = useUserDomain();

  createEffect(() => setPageMeta("Node Analytics", "users"));

  const handleDelete = (id) => {
    openModal(
      "Eradicate Node?",
      `Are you sure you want to permanently destroy the node [${id}]? This will sever all topological connections and cannot be reversed.`,
      "error",
      async () => {
        try {
          await fetchQuery("DELETE type::record($id);", { id });
          toast.success(`Node ${id} eliminated successfully.`);
          domain.invalidateDomain();
        } catch (err) {
          toast.error(`Matrix rejection: ${err.message}`);
        }
      },
    );
  };

  const tools = [
    {
      id: "query",
      icon: Filter,
      label: "Query Builder",
      badge: () => (
        <div class="flex gap-1 ml-2">
          <span class="badge badge-ghost badge-sm">
            {domain.draftQuery.filters.length} filters
          </span>
          <Show when={domain.hasPendingChanges()}>
            <span class="badge badge-warning badge-sm">Unsaved</span>
          </Show>
        </div>
      ),
      content: () => (
        <QueryBuilder
          config={domain.config}
          draft={domain.draftQuery}
          setDraft={domain.setDraftQuery}
          hasPendingChanges={domain.hasPendingChanges}
          error={domain.compileError()}
          onApply={domain.commitQuery}
          onReset={domain.resetDraft}
        />
      ),
    },
    {
      id: "export",
      icon: Download,
      label: "Export",
      content: () => (
        <ExportPanel
          config={domain.config}
          queryState={domain.appliedQuery()}
          selectedIds={domain.selectedRecords()}
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
          when={domain.selectedRecords().length > 0}
          fallback={
            <header class="flex items-center justify-between gap-4 px-4 py-3 sm:px-5 animate-in fade-in">
              <div class="min-w-0 flex-1">
                <h1 class="truncate text-lg font-bold tracking-tight">
                  {domain.config.ui.title}
                </h1>
                <p class="mt-0.5 truncate text-xs text-base-content/60">
                  {domain.config.ui.description}
                </p>
              </div>
              <A
                href="/users/new"
                class="btn btn-primary btn-sm sm:btn-md shadow-sm"
              >
                <Plus size={18} />
                <span class="hidden sm:inline">
                  Create {domain.config.ui.entityLabel}
                </span>
              </A>
            </header>
          }
        >
          <header class="flex items-center justify-between gap-4 px-4 py-3 sm:px-5 bg-accent/10 border-b border-accent/20 animate-in fade-in slide-in-from-top-2">
            <div class="flex items-center gap-3">
              <button
                class="btn btn-circle btn-sm btn-ghost text-base-content/70 hover:bg-base-200"
                onClick={domain.clearSelection}
                title="Clear Selection"
              >
                <X size={16} />
              </button>
              <div>
                <h1 class="text-lg font-bold text-accent tracking-tight">
                  {domain.selectedRecords().length} Selected
                </h1>
                <p class="text-xs text-base-content/70">
                  Rows persisted across pagination
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <button
                class="btn btn-sm btn-error shadow-sm"
                onClick={() => toast.info("Bulk Delete not wired yet")}
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
          config={domain.config}
          select={domain.appliedQuery().select}
          data={domain.listQuery.data?.data}
          isLoading={domain.listQuery.isLoading}
          error={domain.listQuery.error?.message}
          entityLabelPlural={domain.config.ui.entityLabelPlural}
          baseRoute="/users"
          onDelete={handleDelete}
          isSelected={domain.isSelected}
          onRowClick={domain.toggleSelection}
        />
      </section>

      <Pagination
        page={domain.appliedQuery().page}
        limit={domain.appliedQuery().limit}
        total={domain.listQuery.data?.total}
        label={domain.config.ui.entityLabelPlural}
        onPageChange={domain.setPage}
      />
    </main>
  );
}
