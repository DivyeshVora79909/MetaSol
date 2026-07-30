import { Show, For } from "solid-js";
import { useParams, A, useNavigate } from "@solidjs/router";
import { createQuery, useQueryClient } from "@tanstack/solid-query";
import { ArrowLeft, Edit2, Trash2 } from "lucide-solid";
import toast from "solid-toast";

import { fetchQuery } from "../../lib/surreal";
import { userKeys } from "./user.keys";
import { USER_CONFIG } from "./config";
import PageShell from "../../components/PageShell";

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
  const queryClient = useQueryClient();

  const nodeQuery = createQuery(() => ({
    queryKey: [...userKeys.detail(params.id), "view"],
    queryFn: async () => {
      const response = await fetchQuery(
        `
        SELECT id, name, email, login_access, created_at, updated_at, permissions, 
               array::len(dominates ?? []) AS dominate_count, (<-link<-groups) AS parent_groups
        FROM type::record($id);
      `,
        { id: params.id },
      );
      return response[0]?.[0] || null;
    },
  }));

  const handleDelete = async () => {
    if (
      !window.confirm(
        `Permanently delete record ${params.id}? This cannot be undone.`,
      )
    )
      return;
    try {
      const res = await fetchQuery(`DELETE type::record($id) RETURN BEFORE;`, {
        id: params.id,
      });
      if (!res[0]?.length)
        throw new Error("Permission denied or record missing.");

      toast.success("Record deleted successfully.");
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      navigate("/users");
    } catch (err) {
      toast.error(`Deletion failed: ${err.message}`);
    }
  };

  const formatDate = (dStr) => (dStr ? new Date(dStr).toLocaleString() : "—");

  const Toolbar = () => (
    <div class="flex gap-2">
      <A
        href="/users"
        class="btn btn-ghost btn-sm btn-square"
        title="Back to list"
      >
        <ArrowLeft size={16} />
      </A>
      <button class="btn btn-ghost btn-sm text-error" onClick={handleDelete}>
        <Trash2 size={16} /> <span class="hidden sm:inline">Delete</span>
      </button>
      <A href={`/users/${params.id}/edit`} class="btn btn-primary btn-sm">
        <Edit2 size={16} /> <span class="hidden sm:inline">Edit</span>
      </A>
    </div>
  );

  return (
    <PageShell title={params.id} toolbar={<Toolbar />}>
      <section class="card bg-base-100 shadow-sm border border-base-300 max-w-5xl mx-auto w-full">
        <Show
          when={!nodeQuery.isLoading}
          fallback={
            <div class="p-12 text-center">
              <span class="loading loading-spinner text-primary loading-lg" />
            </div>
          }
        >
          <Show
            when={nodeQuery.data}
            fallback={
              <div class="p-12 text-center text-error font-bold">
                Record unavailable or deleted.
              </div>
            }
          >
            <div class="card-body p-5 sm:p-6">
              <div class="mb-4">
                <h3 class="text-lg font-bold text-base-content">
                  System Properties
                </h3>
              </div>
              <dl class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <DetailBlock label="Name">{nodeQuery.data.name}</DetailBlock>
                <DetailBlock label="Email">{nodeQuery.data.email}</DetailBlock>
                <DetailBlock label="Access Status">
                  <span
                    class={`badge badge-sm ${nodeQuery.data.login_access ? "badge-success" : "badge-error"}`}
                  >
                    {nodeQuery.data.login_access ? "Enabled" : "Disabled"}
                  </span>
                </DetailBlock>
                <DetailBlock label="Parent Groups">
                  <Show
                    when={nodeQuery.data.parent_groups?.length > 0}
                    fallback={<span class="opacity-40 italic">None</span>}
                  >
                    <ul class="list-disc pl-4 m-0 space-y-0.5">
                      <For each={nodeQuery.data.parent_groups}>
                        {(g) => <li>{g.name}</li>}
                      </For>
                    </ul>
                  </Show>
                </DetailBlock>
                <DetailBlock label="Sub-Nodes">
                  {nodeQuery.data.dominate_count || 0}
                </DetailBlock>
                <DetailBlock label="Created At">
                  <span class="font-mono text-xs">
                    {formatDate(nodeQuery.data.created_at)}
                  </span>
                </DetailBlock>
              </dl>
            </div>
          </Show>
        </Show>
      </section>
    </PageShell>
  );
}
