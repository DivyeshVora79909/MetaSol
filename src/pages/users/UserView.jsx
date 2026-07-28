import { createEffect, Show, For } from "solid-js";
import { useParams, A, useNavigate } from "@solidjs/router";
import { createQuery } from "@tanstack/solid-query";
import { ArrowLeft, Edit2, Trash2 } from "lucide-solid";

import { fetchQuery } from "../../lib/surreal";
import { useUI } from "../../store/ui";
import { userKeys } from "./user.keys";
import { useUserTableState } from "./UserTableState";

const DetailBlock = (props) => (
  <div class="flex flex-col gap-1.5 rounded-box bg-base-200/30 p-4 border border-base-200/50 transition-colors hover:bg-base-200/50">
    <dt class="text-xs font-bold uppercase tracking-wider text-base-content/50">
      {props.label}
    </dt>
    <dd class="text-sm font-medium text-base-content break-words">
      {props.children}
    </dd>
  </div>
);

export default function UserView() {
  const params = useParams();
  const navigate = useNavigate();
  const { setPageMeta } = useUI();

  const state = useUserTableState();

  createEffect(() => setPageMeta("View Details", "users"));

  const nodeQuery = createQuery(() => ({
    queryKey: [...userKeys.detail(params.id), "view"],
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
          <div>
            <h1 class="text-xl font-bold tracking-tight">{params.id}</h1>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            class="btn btn-ghost btn-sm text-error"
            onClick={() =>
              state.promptDelete([params.id], () => navigate("/users"))
            }
          >
            <Trash2 size={16} /> <span class="hidden sm:inline">Delete</span>
          </button>
          <A href={`/users/${params.id}/edit`} class="btn btn-primary btn-sm">
            <Edit2 size={16} /> <span class="hidden sm:inline">Edit</span>
          </A>
        </div>
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
              <div class="card-body items-center justify-center text-center py-12">
                <div class="text-error font-bold text-lg mb-2">
                  Record unavailable
                </div>
                <p class="text-base-content/60 text-sm">
                  This record may have been deleted or you lack access
                  permissions.
                </p>
                <A href="/users" class="btn btn-outline btn-sm mt-4">
                  Return to List
                </A>
              </div>
            }
          >
            <div class="card-body p-5 sm:p-6">
              <div class="mb-4">
                <h3 class="text-lg font-bold text-base-content">
                  System Properties
                </h3>
                <p class="text-sm text-base-content/60">
                  Core identity vectors and access metadata.
                </p>
              </div>

              <dl class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <DetailBlock label="Name">{nodeQuery.data.name}</DetailBlock>
                <DetailBlock label="Email Vector">
                  {nodeQuery.data.email}
                </DetailBlock>
                <DetailBlock label="Access Status">
                  <span
                    class={`badge badge-sm ${nodeQuery.data.login_access ? "badge-success" : "badge-error"}`}
                  >
                    {nodeQuery.data.login_access ? "Enabled" : "Disabled"}
                  </span>
                </DetailBlock>
                <DetailBlock label="Suspension Count">
                  {nodeQuery.data.total_suspensions || 0}
                </DetailBlock>
                <DetailBlock label="Parent Groups">
                  <Show
                    when={nodeQuery.data.parent_groups?.length > 0}
                    fallback={
                      <span class="text-base-content/40 italic">None</span>
                    }
                  >
                    <ul class="list-disc pl-4 m-0 space-y-0.5">
                      <For each={nodeQuery.data.parent_groups}>
                        {(g) => (
                          <li>
                            {g.name}{" "}
                            <span class="text-xs opacity-50 font-normal">
                              ({g.id})
                            </span>
                          </li>
                        )}
                      </For>
                    </ul>
                  </Show>
                </DetailBlock>
                <DetailBlock label="Dominated Sub-Nodes">
                  {nodeQuery.data.dominate_count || 0}
                </DetailBlock>
                <DetailBlock label="Evaluated Permissions">
                  <Show
                    when={nodeQuery.data.permissions?.length > 0}
                    fallback={
                      <span class="text-base-content/40 italic">
                        No permissions
                      </span>
                    }
                  >
                    <div class="flex flex-wrap gap-1 mt-0.5">
                      <For each={nodeQuery.data.permissions}>
                        {(p) => (
                          <span class="badge badge-ghost badge-sm">{p}</span>
                        )}
                      </For>
                    </div>
                  </Show>
                </DetailBlock>
                <DetailBlock label="Created At">
                  <span class="font-mono text-xs">
                    {formatDate(nodeQuery.data.created_at)}
                  </span>
                </DetailBlock>
                <DetailBlock label="Last Updated">
                  <span class="font-mono text-xs">
                    {formatDate(nodeQuery.data.updated_at)}
                  </span>
                </DetailBlock>
              </dl>
            </div>
          </Show>
        </Show>
      </section>
    </main>
  );
}
