import { createEffect, Show, For } from "solid-js";
import { useParams, A } from "@solidjs/router";
import { createQuery } from "@tanstack/solid-query";
import { fetchQuery } from "../../lib/surreal";
import { useUI } from "../../store/ui";
import { ArrowLeft, Key, Network, Edit2 } from "lucide-solid";

export default function UserView() {
  const params = useParams();
  const { setPageMeta } = useUI();

  createEffect(() => setPageMeta("Node Matrix Inspection", "users"));

  // Deep Isolated Query (Does not pollute the List AST)
  const nodeQuery = createQuery(() => ({
    queryKey: ["user", "deep", params.id],
    queryFn: async () => {
      const response = await fetchQuery(
        `
        SELECT 
          id, name, email, login_access, created_at, total_suspensions,
          permissions, 
          array::len(dominates ?? []) AS dominate_count,
          (<-link<-groups.name) AS parent_groups
        FROM type::record($id);
      `,
        { id: params.id },
      );
      return response[0]?.[0] || null;
    },
  }));

  return (
    <div class="mx-auto flex w-full max-w-5xl flex-col gap-[var(--app-pad)] pb-[var(--app-pad)]">
      <div class="flex flex-wrap items-center justify-between gap-3 rounded-box border border-base-300 bg-base-100 p-4 shadow-sm sm:p-5">
        <div class="flex items-center gap-4">
          <A href="/users" class="btn btn-square btn-sm btn-ghost">
            <ArrowLeft size={18} />
          </A>
          <h2 class="text-lg font-bold font-mono text-base-content/80">
            {params.id}
          </h2>
        </div>
        <A href={`/users/${params.id}/edit`} class="btn btn-primary btn-sm">
          <Edit2 size={16} /> Mutate Node
        </A>
      </div>

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
            <div class="alert alert-error">
              Node collapsed or does not exist in the graph.
            </div>
          }
        >
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-[var(--app-pad)]">
            {/* Identity Column */}
            <div class="flex flex-col gap-[var(--app-pad)]">
              <div class="card border border-base-300 bg-base-100 shadow-sm">
                <div class="card-body p-6">
                  <div class="avatar placeholder mb-2">
                    <div
                      class={`w-20 rounded-full border-4 ${nodeQuery.data.login_access ? "border-success" : "border-error"} bg-base-200`}
                    >
                      <span class="text-3xl font-black">
                        {nodeQuery.data.name?.charAt(0) || "?"}
                      </span>
                    </div>
                  </div>
                  <h2 class="text-2xl font-bold">{nodeQuery.data.name}</h2>
                  <p class="font-mono text-xs text-base-content/50">
                    {nodeQuery.data.email}
                  </p>

                  <div class="mt-6 pt-4 border-t border-base-200 flex flex-col gap-2">
                    <div class="flex justify-between text-sm">
                      <span class="text-base-content/60">Edge Status</span>
                      <span
                        class={`font-bold ${nodeQuery.data.login_access ? "text-success" : "text-error"}`}
                      >
                        {nodeQuery.data.login_access ? "Active" : "Suspended"}
                      </span>
                    </div>
                    <div class="flex justify-between text-sm">
                      <span class="text-base-content/60">Genesis Date</span>
                      <span class="font-mono text-xs">
                        {new Date(
                          nodeQuery.data.created_at,
                        ).toLocaleDateString()}
                      </span>
                    </div>
                    <div class="flex justify-between text-sm">
                      <span class="text-base-content/60">Suspension Count</span>
                      <span class="font-mono text-error font-bold">
                        {nodeQuery.data.total_suspensions || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Topology Column */}
            <div class="lg:col-span-2 flex flex-col gap-[var(--app-pad)]">
              <div class="card border border-base-300 bg-base-100 shadow-sm">
                <div class="card-body p-6">
                  <h3 class="text-xs font-bold text-base-content/50 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Network size={16} class="text-primary" /> Structural
                    Topology
                  </h3>
                  <div class="grid grid-cols-2 gap-4 bg-base-200/50 p-4 rounded-box border border-base-200">
                    <div>
                      <p class="text-xs text-base-content/60 mb-2 font-bold uppercase">
                        Parent Groups
                      </p>
                      <div class="flex flex-wrap gap-1">
                        <Show
                          when={nodeQuery.data.parent_groups?.length > 0}
                          fallback={
                            <span class="text-sm font-bold opacity-50">
                              Leaf Node (No Parents)
                            </span>
                          }
                        >
                          <For each={nodeQuery.data.parent_groups}>
                            {(g) => (
                              <span class="badge badge-primary badge-outline">
                                {g}
                              </span>
                            )}
                          </For>
                        </Show>
                      </div>
                    </div>
                    <div>
                      <p class="text-xs text-base-content/60 mb-1 font-bold uppercase">
                        Dominated Sub-Nodes
                      </p>
                      <p class="text-2xl font-black text-secondary">
                        {nodeQuery.data.dominate_count || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div class="card border border-base-300 bg-base-100 shadow-sm">
                <div class="card-body p-6">
                  <h3 class="text-xs font-bold text-base-content/50 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Key size={16} class="text-secondary" /> Evaluated
                    Permissions Vector
                  </h3>
                  <div class="flex flex-wrap gap-1.5 p-4 bg-base-200/50 rounded-box border border-base-200 shadow-inner min-h-[100px]">
                    <Show
                      when={nodeQuery.data.permissions?.length > 0}
                      fallback={
                        <span class="text-sm font-mono opacity-50 flex items-center">
                          [] Null Permissions Vector
                        </span>
                      }
                    >
                      <For each={nodeQuery.data.permissions}>
                        {(p) => (
                          <span class="badge badge-sm badge-ghost font-mono text-[10px] bg-base-100 border border-base-300">
                            {p}
                          </span>
                        )}
                      </For>
                    </Show>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Show>
      </Show>
    </div>
  );
}
