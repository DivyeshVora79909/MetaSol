import { createEffect, Show, For } from "solid-js";
import { useParams, A } from "@solidjs/router";
import { createQuery } from "@tanstack/solid-query";
import { fetchQuery } from "../../lib/surreal";
import { useUI } from "../../store/ui";
import { ArrowLeft, Edit2 } from "lucide-solid";

// Reusable micro-component to keep details uniform and copy-paste friendly
const DetailRow = (props) => (
  <div class="py-3 sm:py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
    <dt class="text-sm font-medium text-base-content/60">{props.label}</dt>
    <dd class="mt-1 text-sm text-base-content sm:col-span-2 sm:mt-0">
      {props.children}
    </dd>
  </div>
);

export default function UserView() {
  const params = useParams();
  const { setPageMeta } = useUI();

  createEffect(() => setPageMeta("View Details", "users"));

  const nodeQuery = createQuery(() => ({
    queryKey: ["user", "deep", params.id],
    queryFn: async () => {
      const response = await fetchQuery(
        `
        SELECT 
          id, name, email, login_access, created_at, updated_at, total_suspensions,
          permissions, 
          array::len(dominates ?? []) AS dominate_count,
          (<-link<-groups) AS parent_groups
        FROM type::record($id);
      `,
        { id: params.id },
      );
      return response[0]?.[0] || null;
    },
  }));

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleString();
  };

  return (
    <main class="flex min-h-full flex-col gap-[var(--app-pad)] pb-[var(--app-pad)]">
      <header class="flex flex-wrap items-center justify-between gap-4 rounded-box border border-base-300 bg-base-100 p-4 shadow-sm sm:px-5">
        <div class="flex items-center gap-4">
          <A href="/users" class="btn btn-square btn-sm btn-ghost">
            <ArrowLeft size={18} />
          </A>
          <h1 class="text-xl font-bold tracking-tight">{params.id}</h1>
        </div>
        <A href={`/users/${params.id}/edit`} class="btn btn-primary btn-sm">
          <Edit2 size={16} /> Edit Record
        </A>
      </header>

      <section class="card bg-base-100 shadow-sm border border-base-300 flex-1">
        <Show
          when={!nodeQuery.isLoading}
          fallback={
            <div class="flex justify-center p-12">
              <span class="loading loading-spinner text-primary loading-lg"></span>
            </div>
          }
        >
          <Show
            when={nodeQuery.data}
            fallback={
              <div class="card-body items-center text-error">
                Record not found or access denied.
              </div>
            }
          >
            <div class="card-body p-0">
              {/* Header section of the card */}
              <div class="px-5 py-5 sm:px-6 border-b border-base-200">
                <h3 class="text-base font-semibold leading-6 text-base-content">
                  Record Information
                </h3>
                <p class="mt-1 max-w-2xl text-sm text-base-content/60">
                  System details and topological relations.
                </p>
              </div>

              {/* Data List section */}
              <div class="px-5 sm:px-6">
                <dl class="divide-y divide-base-200">
                  <DetailRow label="Name">{nodeQuery.data.name}</DetailRow>

                  <DetailRow label="Email Vector">
                    {nodeQuery.data.email}
                  </DetailRow>

                  <DetailRow label="Access Status">
                    <span
                      class={`badge badge-sm ${nodeQuery.data.login_access ? "badge-success" : "badge-error"}`}
                    >
                      {nodeQuery.data.login_access ? "Enabled" : "Disabled"}
                    </span>
                  </DetailRow>

                  <DetailRow label="Suspension Count">
                    {nodeQuery.data.total_suspensions || 0}
                  </DetailRow>

                  <DetailRow label="Parent Groups">
                    <Show
                      when={nodeQuery.data.parent_groups?.length > 0}
                      fallback={
                        <span class="text-base-content/40 italic">None</span>
                      }
                    >
                      <ul class="list-disc pl-5 m-0 space-y-1">
                        <For each={nodeQuery.data.parent_groups}>
                          {(g) => (
                            <li>
                              {g.name}{" "}
                              <span class="text-xs opacity-50 ml-1">
                                ({g.id})
                              </span>
                            </li>
                          )}
                        </For>
                      </ul>
                    </Show>
                  </DetailRow>

                  <DetailRow label="Dominated Sub-Nodes">
                    {nodeQuery.data.dominate_count || 0}
                  </DetailRow>

                  <DetailRow label="Evaluated Permissions">
                    <Show
                      when={nodeQuery.data.permissions?.length > 0}
                      fallback={
                        <span class="text-base-content/40 italic">
                          No permissions assigned
                        </span>
                      }
                    >
                      <div class="flex flex-wrap gap-1">
                        <For each={nodeQuery.data.permissions}>
                          {(p) => (
                            <span class="badge badge-ghost badge-sm">{p}</span>
                          )}
                        </For>
                      </div>
                    </Show>
                  </DetailRow>

                  <DetailRow label="Created At">
                    <span class="font-mono">
                      {formatDate(nodeQuery.data.created_at)}
                    </span>
                  </DetailRow>

                  <DetailRow label="Last Updated">
                    <span class="font-mono">
                      {formatDate(nodeQuery.data.updated_at)}
                    </span>
                  </DetailRow>
                </dl>
              </div>
            </div>
          </Show>
        </Show>
      </section>
    </main>
  );
}
