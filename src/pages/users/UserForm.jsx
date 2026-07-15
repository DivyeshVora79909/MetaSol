import { createSignal, createEffect, Show, For } from "solid-js";
import { useParams, useNavigate, A } from "@solidjs/router";
import { createQuery } from "@tanstack/solid-query";
import { fetchQuery } from "../../lib/surreal";
import { useUserDomain } from "./UserContext";
import { useUI } from "../../store/ui";
import toast from "solid-toast";
import { ArrowLeft, Save } from "lucide-solid";

export default function UserForm() {
  const params = useParams();
  const navigate = useNavigate();
  const { setPageMeta } = useUI();
  const { invalidateDomain } = useUserDomain();

  const isEdit = () => !!params.id;
  createEffect(() =>
    setPageMeta(isEdit() ? "Edit Node" : "Create Node", "users"),
  );

  const [name, setName] = createSignal("");
  const [email, setEmail] = createSignal("");
  const [group, setGroup] = createSignal("");
  const [loginAccess, setLoginAccess] = createSignal(true);
  const [submitting, setSubmitting] = createSignal(false);

  // Dynamic Lookup: Fetch available groups for assignment
  const groupsQuery = createQuery(() => ({
    queryKey: ["groups", "lookup"],
    queryFn: async () => {
      const res = await fetchQuery(
        `SELECT id, name FROM groups ORDER BY name ASC;`,
      );
      const data = res[0] || [];
      if (!isEdit() && data.length > 0 && !group()) {
        setGroup(data[0].id);
      }
      return data;
    },
  }));

  // Fetch existing state if editing
  const userQuery = createQuery(() => ({
    queryKey: ["user", "single", params.id],
    enabled: isEdit(),
    queryFn: async () => {
      const response = await fetchQuery(
        `SELECT name, email, login_access, (<-link<-groups)[0].id AS group_id FROM type::record($id);`,
        { id: params.id },
      );
      const user = response[0]?.[0];
      if (user) {
        setName(user.name || "");
        setEmail(user.email || "");
        setLoginAccess(user.login_access ?? true);
        if (user.group_id) setGroup(user.group_id);
      }
      return user || null;
    },
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isEdit()) {
        await fetchQuery(
          `
          BEGIN TRANSACTION;
          UPDATE type::record($id) SET name = $name, email = $email, login_access = $login_access;
          COMMIT TRANSACTION;
        `,
          {
            id: params.id,
            name: name(),
            email: email(),
            login_access: loginAccess(),
            group: group(),
          },
        );
        toast.success("Record updated successfully.");
      } else {
        await fetchQuery(
          `
          BEGIN TRANSACTION;
          LET $new_user = (CREATE user SET name = $name, email = $email, login_access = $login_access)[0];
          COMMIT TRANSACTION;
        `,
          {
            name: name(),
            email: email(),
            login_access: loginAccess(),
            group: group(),
          },
        );
        toast.success("Record created successfully.");
      }

      await invalidateDomain();
      navigate("/users");
    } catch (err) {
      toast.error(`Database error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main class="flex min-h-full flex-col gap-[var(--app-pad)] pb-[var(--app-pad)]">
      <header class="flex flex-wrap items-center gap-4 rounded-box border border-base-300 bg-base-100 p-4 shadow-sm sm:px-5">
        <A href="/users" class="btn btn-square btn-sm btn-ghost">
          <ArrowLeft size={18} />
        </A>
        <div>
          <h1 class="text-xl font-bold tracking-tight">
            {isEdit() ? `Edit User: ${params.id}` : "Create New User"}
          </h1>
        </div>
      </header>

      <section class="card bg-base-100 shadow-sm border border-base-300 flex-1">
        <Show
          when={!isEdit() || !userQuery.isLoading}
          fallback={
            <div class="flex justify-center p-12">
              <span class="loading loading-spinner text-primary loading-lg"></span>
            </div>
          }
        >
          <form onSubmit={handleSubmit} class="card-body">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="form-control w-full">
                <label class="label">
                  <span class="label-text font-semibold">Name</span>
                </label>
                <input
                  type="text"
                  class="input input-bordered w-full"
                  value={name()}
                  onInput={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div class="form-control w-full">
                <label class="label">
                  <span class="label-text font-semibold">Email</span>
                </label>
                <input
                  type="email"
                  class="input input-bordered w-full"
                  value={email()}
                  onInput={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div class="form-control w-full">
                <label class="label">
                  <span class="label-text font-semibold">Primary Group</span>
                </label>
                <select
                  class="select select-bordered w-full"
                  value={group()}
                  onChange={(e) => setGroup(e.target.value)}
                  disabled={groupsQuery.isLoading}
                >
                  <option value="" disabled>
                    Select group...
                  </option>
                  <For each={groupsQuery.data}>
                    {(g) => <option value={g.id}>{g.name}</option>}
                  </For>
                </select>
              </div>

              <div class="form-control w-full">
                <label class="label cursor-pointer justify-start gap-4 h-full items-end pb-3">
                  <input
                    type="checkbox"
                    class="toggle toggle-primary"
                    checked={loginAccess()}
                    onChange={(e) => setLoginAccess(e.target.checked)}
                  />
                  <span class="label-text font-semibold">
                    Allow Login Access
                  </span>
                </label>
              </div>
            </div>

            <div class="card-actions justify-end mt-8 border-t border-base-200 pt-6">
              <A href="/users" class="btn btn-ghost">
                Cancel
              </A>
              <button
                type="submit"
                class="btn btn-primary"
                disabled={submitting()}
              >
                <Show
                  when={submitting()}
                  fallback={
                    <>
                      <Save size={16} /> Save Record
                    </>
                  }
                >
                  <span class="loading loading-spinner" /> Saving...
                </Show>
              </button>
            </div>
          </form>
        </Show>
      </section>
    </main>
  );
}
