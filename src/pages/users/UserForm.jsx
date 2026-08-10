import { Show, createEffect, createMemo, createSignal } from "solid-js";
import { createStore, unwrap } from "solid-js/store";
import { useParams, useNavigate, A } from "@solidjs/router";
import { createQuery, useQueryClient } from "@tanstack/solid-query";
import { ArrowLeft, AlertCircle } from "lucide-solid";
import toast from "solid-toast";
import * as v from "valibot";

import { fetchQuery } from "../../lib/surreal";
import { UserSchema } from "./user.schema";
import { userKeys } from "./user.keys";
import { USER_CONFIG } from "./config";
import RecordSelect from "../../components/RecordSelect";
import PageShell from "../../components/PageShell";
import { PRIMITIVE_TARGET, USER_TARGET, TREE_TARGET } from "./user.targets";

export default function UserForm() {
  const params = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = () => Boolean(params.id);

  const [form, setForm] = createStore({
    name: "",
    email: "",
    login_access: true,
    a_favorite_primitive: null,
    a_friends: [],
    a_watched_items: [],
  });

  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [showErrors, setShowErrors] = createSignal(false);

  const validation = createMemo(() => {
    const res = v.safeParse(UserSchema, form);

    if (res.success) {
      return { isValid: true, fields: {}, form: null };
    }

    // Flatten creates a perfect split between field errors and cross-field errors
    const flat = v.flatten(res.issues);

    const fields = {};
    if (flat.nested) {
      for (const key in flat.nested) {
        fields[key] = flat.nested[key][0];
      }
    }

    return {
      isValid: false,
      fields: fields,
      form: flat.root ? flat.root[0] : null,
    };
  });

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

  let hydrated = false;
  createEffect(() => {
    if (isEdit() && recordQuery.data && !hydrated) {
      const r = recordQuery.data;
      setForm({
        name: r.name || "",
        email: r.email || "",
        login_access: r.login_access ?? true,
        a_favorite_primitive: r.a_favorite_primitive
          ? String(r.a_favorite_primitive)
          : null,
        a_friends: Array.isArray(r.a_friends) ? r.a_friends.map(String) : [],
        a_watched_items: Array.isArray(r.a_watched_items)
          ? r.a_watched_items.map(String)
          : [],
      });
      hydrated = true;
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setShowErrors(true);

    if (!validation().isValid) {
      toast.error("Please fix the errors in the form.");
      return;
    }

    setIsSubmitting(true);
    try {
      const value = unwrap(form);
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
    } finally {
      setIsSubmitting(false);
    }
  };

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
          onSubmit={handleSubmit}
          class="max-w-3xl mx-auto w-full space-y-6 flex flex-col min-h-full pb-8"
        >
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label class="form-control">
              <div class="label">
                <span class="label-text font-bold">Name</span>
              </div>
              <input
                class={`input input-bordered ${showErrors() && validation().fields.name ? "input-error" : ""}`}
                value={form.name}
                onInput={(e) => {
                  setForm("name", e.target.value);
                  setShowErrors(true);
                }}
              />
              <Show when={showErrors() && validation().fields.name}>
                <div class="label pb-0">
                  <span class="label-text-alt text-error font-medium">
                    {validation().fields.name}
                  </span>
                </div>
              </Show>
            </label>

            <label class="form-control">
              <div class="label">
                <span class="label-text font-bold">Email</span>
              </div>
              <input
                type="email"
                class={`input input-bordered ${showErrors() && validation().fields.email ? "input-error" : ""}`}
                value={form.email}
                onInput={(e) => {
                  setForm("email", e.target.value);
                  setShowErrors(true);
                }}
              />
              <Show when={showErrors() && validation().fields.email}>
                <div class="label pb-0">
                  <span class="label-text-alt text-error font-medium">
                    {validation().fields.email}
                  </span>
                </div>
              </Show>
            </label>
          </div>

          <div class="flex flex-col gap-1">
            <label class="cursor-pointer flex items-center gap-3 w-fit">
              <input
                type="checkbox"
                class={`toggle ${showErrors() && validation().form ? "toggle-error" : "toggle-primary"}`}
                checked={form.login_access}
                onChange={(e) => {
                  setForm("login_access", e.target.checked);
                  setShowErrors(true);
                }}
              />
              <span class="label-text font-bold">Login Access</span>
            </label>
          </div>

          <div class="divider">Relations</div>

          <label class="form-control">
            <div class="label">
              <span class="label-text font-bold">Favorite Primitive</span>
            </div>
            <RecordSelect
              mode="single"
              targets={[PRIMITIVE_TARGET]}
              value={form.a_favorite_primitive}
              onChange={(id) => {
                setForm("a_favorite_primitive", id);
                setShowErrors(true);
              }}
              placeholder="Select a primitive..."
            />
          </label>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label class="form-control">
              <div class="label">
                <span class="label-text font-bold">Friends</span>
              </div>
              <RecordSelect
                mode="multiple"
                targets={[USER_TARGET]}
                value={form.a_friends}
                onChange={(ids) => {
                  setForm("a_friends", ids);
                  setShowErrors(true);
                }}
                placeholder="Search users..."
              />
            </label>

            <label class="form-control">
              <div class="label">
                <span class="label-text font-bold">Watched Items</span>
              </div>
              <RecordSelect
                mode="multiple"
                targets={[PRIMITIVE_TARGET, TREE_TARGET]}
                value={form.a_watched_items}
                onChange={(ids) => {
                  setForm("a_watched_items", ids);
                  setShowErrors(true);
                }}
                placeholder="Search primitives or trees..."
              />
            </label>
          </div>

          {/* Form-Level / Table-Level Errors (Cross-field logic) */}
          <Show when={showErrors() && validation().form}>
            <div class="alert alert-error shadow-sm mt-4 text-sm font-medium animate-in fade-in zoom-in-95 duration-200">
              <AlertCircle size={20} class="shrink-0" />
              <span>{validation().form}</span>
            </div>
          </Show>

          <div class="flex justify-end gap-2 pt-4 border-t border-base-200 mt-auto">
            <A href="/users" class="btn btn-ghost">
              Cancel
            </A>
            <button
              type="submit"
              class="btn btn-primary"
              disabled={!validation().isValid || isSubmitting()}
            >
              <Show when={isSubmitting()} fallback="Save User">
                <span class="loading loading-spinner loading-sm"></span>{" "}
                Saving...
              </Show>
            </button>
          </div>
        </form>
      </Show>
    </PageShell>
  );
}
