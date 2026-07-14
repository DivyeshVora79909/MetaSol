import { createEffect } from "solid-js";
import { A } from "@solidjs/router";
import { Plus } from "lucide-solid";
import { useUI } from "../../store/ui";
import QueryBuilder from "../../components/QueryBuilder";
import DataTable from "../../components/DataTable";
import Pagination from "../../components/Pagination";
import { useUserDomain } from "./UserContext";
export default function UserList() {
  const {
    setPageMeta
  } = useUI();
  const domain = useUserDomain();
  createEffect(() => setPageMeta("Node Analytics", "users"));
  return <main class="flex h-full flex-col gap-[var(--app-pad)] pb-8">
    <header class="flex flex-wrap items-center justify-between gap-4 rounded-box border border-base-300 bg-base-100 p-4 shadow-sm"><div><h1 class="text-lg font-bold">{domain.config.ui.title}</h1><p class="text-sm text-base-content/60">{domain.config.ui.description}</p></div><A href="/users/new" class="btn btn-primary btn-sm"><Plus size={16} />Create {domain.config.ui.entityLabel}</A></header>
    <QueryBuilder config={domain.config} draft={domain.draftQuery} setDraft={domain.setDraftQuery} hasPendingChanges={domain.hasPendingChanges} error={domain.compileError()} onApply={domain.commitQuery} onReset={domain.resetDraft} />
    <section class="min-h-[24rem] flex-1"><DataTable config={domain.config} select={domain.appliedQuery().select} data={domain.listQuery.data?.data} isLoading={domain.listQuery.isLoading} error={domain.listQuery.error?.message} entityLabelPlural={domain.config.ui.entityLabelPlural} baseRoute="/users" /></section>
    <Pagination page={domain.appliedQuery().page} limit={domain.appliedQuery().limit} total={domain.listQuery.data?.total} label={domain.config.ui.entityLabelPlural} onPageChange={domain.setPage} />
  </main>;
}
