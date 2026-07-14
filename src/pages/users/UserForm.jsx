import { createSignal, createEffect, Show } from "solid-js";
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
    setPageMeta(isEdit() ? "Edit Node" : "Deploy Node", "users"),
  );

  // Native Form State
  const [name, setName] = createSignal("");
  const [email, setEmail] = createSignal("");
  const [group, setGroup] = createSignal("groups:standard");
  const [loginAccess, setLoginAccess] = createSignal(true);
  const [submitting, setSubmitting] = createSignal(false);

  // Fetch Existing Node (If Editing)
  const userQuery = createQuery(() => ({
    queryKey: ["user", "single", params.id],
    enabled: isEdit(),
    queryFn: async () => {
      const response = await fetchQuery(
        `
        SELECT name, email, login_access, (<-link<-groups)[0].id AS group_id 
        FROM type::record($id);
      `,
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
          `UPDATE type::record($id) SET name = $name, email = $email, login_access = $login_access;`,
          {
            id: params.id,
            name: name(),
            email: email(),
            login_access: loginAccess(),
          },
        );
        toast.success("Node properties mutated successfully.");
      } else {
        await fetchQuery(
          `
          LET $new_user = (CREATE user SET name = $name, email = $email, login_access = $login_access)[0];
          RELATE type::record($group)->link->$new_user;
        `,
          {
            name: name(),
            email: email(),
            group: group(),
            login_access: loginAccess(),
          },
        );
        toast.success("Node injected securely.");
      }

      // Keep list and detail consumers coherent after a mutation.
      await invalidateDomain();
      navigate("/users");
    } catch (err) {
      toast.error(`Matrix rejection: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div class="flex flex-col gap-[var(--app-pad)] max-w-2xl mx-auto w-full pb-8">
      <div class="flex items-center gap-4 bg-base-100 p-4 rounded-box border border-base-300 shadow-sm shrink-0">
        <A href="/users" class="btn btn-square btn-sm btn-ghost">
          <ArrowLeft size={18} />
        </A>
        <div>
          <h2 class="text-lg font-bold">
            {isEdit() ? `Edit Node: ${params.id}` : "Initialize New Node"}
          </h2>
          <p class="text-xs text-base-content/60">
            Configure structural parameters for this identity.
          </p>
        </div>
      </div>

      <div class="bg-base-100 border border-base-300 rounded-box shadow-sm p-6">
        <Show
          when={!isEdit() || !userQuery.isLoading}
          fallback={
            <div class="flex justify-center p-8">
              <span class="loading loading-spinner text-primary loading-lg"></span>
            </div>
          }
        >
          <form onSubmit={handleSubmit} class="flex flex-col gap-4">
            <div class="form-control w-full">
              <label class="label">
                <span class="label-text text-xs font-bold uppercase tracking-wide">
                  Identity Name
                </span>
              </label>
              <input
                type="text"
                class="input input-sm input-bordered bg-base-200"
                value={name()}
                onInput={(e) => setName(e.target.value)}
                required
                minlength="2"
              />
            </div>

            <div class="form-control w-full">
              <label class="label">
                <span class="label-text text-xs font-bold uppercase tracking-wide">
                  Contact Vector (Email)
                </span>
              </label>
              <input
                type="email"
                class="input input-sm input-bordered bg-base-200"
                value={email()}
                onInput={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div class="form-control w-full">
              <label class="label">
                <span class="label-text text-xs font-bold uppercase tracking-wide">
                  Topological Parent (Group)
                </span>
              </label>
              <select
                class="select select-sm select-bordered bg-base-200"
                value={group()}
                onChange={(e) => setGroup(e.target.value)}
                disabled={isEdit()}
              >
                <option value="groups:standard">Standard Operators</option>
                <option value="groups:managers">Domain Managers</option>
                <option value="groups:root">System Admins</option>
              </select>
            </div>

            <div class="form-control bg-base-200 p-4 rounded-box border border-base-300 mt-2">
              <label class="cursor-pointer label">
                <div>
                  <span class="label-text font-bold block">
                    Network Edge Status (Login Access)
                  </span>
                  <span class="label-text-alt opacity-70">
                    If disabled, the user is mathematically suspended.
                  </span>
                </div>
                <input
                  type="checkbox"
                  class="toggle toggle-primary toggle-sm"
                  checked={loginAccess()}
                  onChange={(e) => setLoginAccess(e.target.checked)}
                />
              </label>
            </div>

            <div class="mt-4 flex justify-end gap-2 pt-4 border-t border-base-300">
              <A href="/users" class="btn btn-sm btn-ghost">
                Cancel
              </A>
              <button
                type="submit"
                class="btn btn-sm btn-primary px-8"
                disabled={submitting()}
              >
                <Show
                  when={submitting()}
                  fallback={
                    <>
                      <Save size={16} /> Execute Mutation
                    </>
                  }
                >
                  <span class="loading loading-spinner" /> Processing
                </Show>
              </button>
            </div>
          </form>
        </Show>
      </div>
    </div>
  );
}
