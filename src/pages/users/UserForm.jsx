import { Show, createEffect } from "solid-js";
import { useParams, useNavigate, A } from "@solidjs/router";
import { createQuery, useQueryClient } from "@tanstack/solid-query";
import { createForm } from "@tanstack/solid-form";
import { ArrowLeft, Save } from "lucide-solid";
import toast from "solid-toast";

import { fetchQuery } from "../../lib/surreal";
import { useUI } from "../../store/ui";
import { UserSchema } from "./user.schema";
import { userKeys } from "./user.keys";
import { USER_CONFIG as CONFIG } from "./config";

export default function UserForm() {
  const params = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setPageMeta } = useUI();

  const isEdit = () => Boolean(params.id);

  createEffect(() =>
    setPageMeta(isEdit() ? "Edit User" : "Create User", "users"),
  );

  const recordQuery = createQuery(() => ({
    queryKey: [...userKeys.detail(params.id), "form"],
    enabled: isEdit(),
    queryFn: async () => {
      const res = await fetchQuery(
        `SELECT name, email, login_access FROM type::record($id);`,
        { id: params.id },
      );
      return res[0]?.[0] || null;
    },
  }));

  const emptyValues = { name: "", email: "", login_access: true };

  const toFormValues = (record) => ({
    name: record?.name || "",
    email: record?.email || "",
    login_access: record?.login_access ?? true,
  });

  const form = createForm(() => ({
    validators: { onChange: UserSchema },
    defaultValues: emptyValues,
    onSubmit: async ({ value }) => {
      try {
        const payload = {
          name: value.name,
          email: value.email,
          login_access: value.login_access,
        };

        if (isEdit()) {
          const res = await fetchQuery(
            `UPDATE type::record($id) MERGE $data RETURN AFTER;`,
            {
              id: params.id,
              data: payload,
            },
          );

          const updatedRecord = res[0]?.[0];

          if (updatedRecord) {
            queryClient.setQueryData(
              [...userKeys.detail(params.id), "form"],
              updatedRecord,
            );
            queryClient.invalidateQueries({
              queryKey: [...userKeys.detail(params.id), "view"],
            });
          }

          toast.success("Record updated successfully.");
        } else {
          await fetchQuery(
            `
            CREATE type::table($table) CONTENT $data;
            UPDATE $auth SET refreshed_at = time::now();
          `,
            {
              table: CONFIG.table,
              data: payload,
            },
          );

          toast.success("Record created successfully.");
        }

        queryClient.invalidateQueries({ queryKey: userKeys.lists() });
        navigate("/users");
      } catch (err) {
        toast.error(`Database error: ${err.message}`);
      }
    },
  }));

  let hydratedRecordId;
  createEffect(() => {
    const record = recordQuery.data;
    if (isEdit() && record && hydratedRecordId !== params.id) {
      form.reset(toFormValues(record));
      hydratedRecordId = params.id;
    }
  });

  return (
    <main class="flex min-h-full flex-col gap-[var(--app-pad)] pb-[var(--app-pad)]">
      <header class="flex items-center gap-4 rounded-box border border-base-300 bg-base-100 p-4 shadow-sm sm:px-6">
        <A href="/users" class="btn btn-square btn-sm btn-ghost">
          <ArrowLeft size={18} />
        </A>
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            User management
          </p>
          <h1 class="text-xl font-bold tracking-tight">
            {isEdit() ? "Edit user" : "Create user"}
          </h1>
        </div>
      </header>

      <section class="card bg-base-100 shadow-sm border border-base-300 flex-1 max-w-3xl">
        <Show
          when={!isEdit() || !recordQuery.isLoading}
          fallback={
            <div class="p-12 text-center">
              <span class="loading loading-spinner text-primary loading-lg" />
            </div>
          }
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
            class="card-body space-y-4"
          >
            <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
              <form.Field
                name="name"
                children={(field) => (
                  <div class="form-control w-full">
                    <label class="label font-semibold" for="user-name">
                      Name
                    </label>
                    <input
                      type="text"
                      id="user-name"
                      autocomplete="name"
                      placeholder="Jane Doe"
                      class={`input input-bordered w-full ${field().state.meta.errors.length ? "input-error" : ""}`}
                      value={field().state.value}
                      onBlur={field().handleBlur}
                      onInput={(e) => field().handleChange(e.target.value)}
                    />
                    <Show when={field().state.meta.errors.length}>
                      <span class="text-error text-xs mt-1">
                        {field()
                          .state.meta.errors.map((err) => err.message || err)
                          .join(", ")}
                      </span>
                    </Show>
                  </div>
                )}
              />

              <form.Field
                name="email"
                children={(field) => (
                  <div class="form-control w-full">
                    <label class="label font-semibold" for="user-email">
                      Email
                    </label>
                    <input
                      type="email"
                      id="user-email"
                      autocomplete="email"
                      placeholder="jane@example.com"
                      class={`input input-bordered w-full ${field().state.meta.errors.length ? "input-error" : ""}`}
                      value={field().state.value}
                      onBlur={field().handleBlur}
                      onInput={(e) => field().handleChange(e.target.value)}
                    />
                    <Show when={field().state.meta.errors.length}>
                      <span class="text-error text-xs mt-1">
                        {field()
                          .state.meta.errors.map((err) => err.message || err)
                          .join(", ")}
                      </span>
                    </Show>
                  </div>
                )}
              />
            </div>

            <form.Field
              name="login_access"
              children={(field) => (
                <div class="form-control w-full">
                  <label class="label cursor-pointer justify-start gap-3 w-fit">
                    <input
                      type="checkbox"
                      class="checkbox checkbox-primary"
                      checked={field().state.value}
                      onChange={(e) => field().handleChange(e.target.checked)}
                    />
                    <span class="label-text font-semibold">
                      Allow login access
                    </span>
                  </label>
                </div>
              )}
            />

            <div class="card-actions justify-end mt-8 border-t border-base-200 pt-6">
              <A href="/users" class="btn btn-ghost">
                Cancel
              </A>
              <button
                type="submit"
                class="btn btn-primary"
                disabled={!form.state.canSubmit || form.state.isSubmitting}
              >
                <Show
                  when={form.state.isSubmitting}
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
