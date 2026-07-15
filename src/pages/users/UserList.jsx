import { createEffect } from "solid-js";
import { A } from "@solidjs/router";
import { Plus } from "lucide-solid";
import { useUI } from "../../store/ui";
import QueryBuilder from "../../components/QueryBuilder";
import DataTable from "../../components/DataTable";
import Pagination from "../../components/Pagination";
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

  return (
    <main class="flex min-h-full flex-col gap-[var(--app-pad)] pb-[var(--app-pad)]">
      <section class="overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-sm">
        <header class="flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-5">
          <div>
            <h1 class="text-xl font-bold tracking-tight">
              {domain.config.ui.title}
            </h1>
            <p class="mt-1 text-sm text-base-content/60">
              {domain.config.ui.description}
            </p>
          </div>
          <A href="/users/new" class="btn btn-primary w-full sm:w-auto">
            <Plus size={18} />
            Create {domain.config.ui.entityLabel}
          </A>
        </header>
        <QueryBuilder
          config={domain.config}
          draft={domain.draftQuery}
          setDraft={domain.setDraftQuery}
          hasPendingChanges={domain.hasPendingChanges}
          error={domain.compileError()}
          onApply={domain.commitQuery}
          onReset={domain.resetDraft}
        />
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
