import { Show, createEffect } from "solid-js";
import { useParams, useNavigate, A } from "@solidjs/router";
import { createQuery, useQueryClient } from "@tanstack/solid-query";
import { createForm } from "@tanstack/solid-form";
import { ArrowLeft } from "lucide-solid";
import toast from "solid-toast";

import { fetchQuery } from "../../lib/surreal";
import { UserSchema } from "./user.schema";
import { userKeys } from "./user.keys";
import { USER_CONFIG } from "./config";
import { PRIMITIVE_CONFIG } from "../primitives/config";
import RelationField from "../../components/RelationField";
import MultiRelationField from "../../components/MultiRelationField";
import PageShell from "../../components/PageShell";

export default function UserForm() {
  const params = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = () => Boolean(params.id);

  const recordQuery = createQuery(() => ({
    queryKey: [...userKeys.detail(params.id), "form"],
    enabled: isEdit(),
    queryFn: async () => {
      const res = await fetchQuery(
        `SELECT name, email, login_access, a_favorite_primitive, a_friends, a_watched_items FROM type::record($id);`,
        { id: params.id },
      );
      if (!res[0]?.[0]) throw new Error("Record not found.");
      return res[0][0];
    },
    retry: false,
  }));

  const sanitizeRecord = (record) => {
    const safeStr = (v) => (v ? String(v) : null);
    const safeArr = (arr) => (Array.isArray(arr) ? arr.map(String) : []);
    return {
      name: record?.name || "",
      email: record?.email || "",
      login_access: record?.login_access ?? true,
      a_favorite_primitive: safeStr(record?.a_favorite_primitive),
      a_friends: safeArr(record?.a_friends),
      a_watched_items: safeArr(record?.a_watched_items),
    };
  };

  const form = createForm(() => ({
    validators: { onChange: UserSchema },
    defaultValues: sanitizeRecord({}),
    onSubmit: async ({ value }) => {
      try {
        const vars = {
          id: params.id,
          table: USER_CONFIG.table,
          name: value.name.trim(),
          email: value.email.trim(),
          login_access: value.login_access,
          a_fav: value.a_favorite_primitive || "",
          a_friends: value.a_friends || [],
          a_watched: value.a_watched_items || [],
        };
        const payloadSQL = `{
          name: $name, email: $email, login_access: $login_access,
          a_favorite_primitive: IF $a_fav != "" { type::record($a_fav) } ELSE { NONE },
          a_friends: $a_friends.map(|$id| type::record($id)),
          a_watched_items: $a_watched.map(|$id| type::record($id))
        }`;

        if (isEdit()) {
          const res = await fetchQuery(
            `UPDATE type::record($id) MERGE ${payloadSQL} RETURN AFTER;`,
            vars,
          );
          if (res[0]?.[0]) {
            queryClient.setQueryData(
              [...userKeys.detail(params.id), "form"],
              res[0][0],
            );
            queryClient.invalidateQueries({
              queryKey: [...userKeys.detail(params.id), "view"],
            });
          }
        } else {
          await fetchQuery(
            `CREATE type::table($table) CONTENT ${payloadSQL}; UPDATE $auth SET refreshed_at = time::now();`,
            vars,
          );
        }

        toast.success(`User saved successfully.`);
        queryClient.invalidateQueries({ queryKey: userKeys.lists() });
        navigate("/users");
      } catch (err) {
        toast.error(err.message || "Save failed.");
      }
    },
  }));

  let hydrated = false;
  createEffect(() => {
    if (isEdit() && recordQuery.data && !hydrated) {
      form.reset(sanitizeRecord(recordQuery.data));
      hydrated = true;
    }
  });

  const Toolbar = () => (
    <A href="/users" class="btn btn-ghost btn-sm gap-2">
      <ArrowLeft size={16} /> <span class="hidden sm:inline">Back to list</span>
    </A>
  );

  return (
    <PageShell
      title={isEdit() ? "Edit User" : "New User"}
      toolbar={<Toolbar />}
    >
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
            form.handleSubmit();
          }}
          class="max-w-3xl mx-auto w-full space-y-6"
        >
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <form.Field
              name="name"
              children={(field) => (
                <label class="form-control">
                  <div class="label">
                    <span class="label-text font-bold">Name</span>
                  </div>
                  <input
                    class={`input input-bordered ${field().state.meta.errors.length ? "input-error" : ""}`}
                    value={field().state.value}
                    onInput={(e) => field().handleChange(e.target.value)}
                  />
                </label>
              )}
            />
            <form.Field
              name="email"
              children={(field) => (
                <label class="form-control">
                  <div class="label">
                    <span class="label-text font-bold">Email</span>
                  </div>
                  <input
                    type="email"
                    class={`input input-bordered ${field().state.meta.errors.length ? "input-error" : ""}`}
                    value={field().state.value}
                    onInput={(e) => field().handleChange(e.target.value)}
                  />
                </label>
              )}
            />
          </div>

          <form.Field
            name="login_access"
            children={(field) => (
              <label class="cursor-pointer flex items-center gap-3">
                <input
                  type="checkbox"
                  class="toggle toggle-primary"
                  checked={field().state.value}
                  onChange={(e) => field().handleChange(e.target.checked)}
                />
                <span class="label-text font-bold">Login Access</span>
              </label>
            )}
          />

          <div class="divider">Relations</div>

          <form.Field
            name="a_favorite_primitive"
            children={(field) => (
              <label class="form-control">
                <div class="label">
                  <span class="label-text font-bold">Favorite Primitive</span>
                </div>
                <RelationField
                  config={PRIMITIVE_CONFIG}
                  value={field().state.value}
                  onChange={(id) => field().handleChange(id)}
                />
              </label>
            )}
          />

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <form.Field
              name="a_friends"
              children={(field) => (
                <label class="form-control">
                  <div class="label">
                    <span class="label-text font-bold">Friends</span>
                  </div>
                  <MultiRelationField
                    config={{
                      table: "user",
                      searchFields: ["id", "name", "email"],
                      columns: [
                        { key: "id", label: "ID" },
                        { key: "name", label: "Name" },
                      ],
                    }}
                    value={field().state.value}
                    onChange={(ids) => field().handleChange(ids)}
                  />
                </label>
              )}
            />
            <form.Field
              name="a_watched_items"
              children={(field) => (
                <label class="form-control">
                  <div class="label">
                    <span class="label-text font-bold">Watched Items</span>
                  </div>
                  <MultiRelationField
                    config={{
                      table: "test_primitive",
                      searchFields: ["id", "a_string", "a_enum"],
                      columns: [
                        { key: "id", label: "ID" },
                        { key: "a_string", label: "Name" },
                        { key: "a_enum", label: "Status" },
                      ],
                    }}
                    value={field().state.value}
                    onChange={(ids) => field().handleChange(ids)}
                  />
                </label>
              )}
            />
          </div>

          <div class="flex justify-end gap-2 pt-4">
            <A href="/users" class="btn btn-ghost">
              Cancel
            </A>
            <button
              type="submit"
              class="btn btn-primary"
              disabled={!form.state.canSubmit || form.state.isSubmitting}
            >
              {form.state.isSubmitting ? "Saving..." : "Save User"}
            </button>
          </div>
        </form>
      </Show>
    </PageShell>
  );
}
