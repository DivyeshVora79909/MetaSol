import { For, Show, createMemo } from "solid-js";
import { Edit2, Eye, Trash2 } from "lucide-solid";
import { A } from "@solidjs/router";

const displayValue = (value, field) => {
  if (value === null || value === undefined)
    return <span class="opacity-35">—</span>;
  if (field.type === "boolean")
    return (
      <span class={`badge badge-xs ${value ? "badge-success" : "badge-error"}`}>
        {value ? "True" : "False"}
      </span>
    );
  if (field.type === "datetime") {
    const d = new Date(value);
    return (
      <span class="font-mono tracking-tight">
        {isNaN(d.getTime()) ? String(value) : d.toLocaleDateString()}
      </span>
    );
  }
  if (Array.isArray(value))
    return <span class="badge badge-ghost badge-sm">{value.length} items</span>;
  return <span class="truncate block">{String(value)}</span>;
};

export default function DataCards(props) {
  const fieldById = createMemo(
    () => new Map(props.config.fields.map((f) => [f.id, f])),
  );
  const fields = createMemo(() =>
    props.select.map((id) => fieldById().get(id)).filter(Boolean),
  );
  const primaryField = createMemo(() => fields()[0]);
  const metaFields = createMemo(() => fields().slice(1));
  const rows = () => props.data || [];

  return (
    <div class="w-full h-full overflow-auto p-1">
      <Show
        when={!props.isLoading}
        fallback={
          <div class="py-12 text-center">
            <span class="loading loading-spinner text-primary loading-lg" />
          </div>
        }
      >
        <Show
          when={!props.error}
          fallback={
            <div class="py-12 text-center text-error">{props.error}</div>
          }
        >
          <Show
            when={rows().length > 0}
            fallback={
              <div class="py-12 text-center text-base-content/50">
                No records found.
              </div>
            }
          >
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              <For each={rows()}>
                {(row) => {
                  const isSelected = () => props.isSelected?.(row.id);
                  return (
                    <div
                      class={`card shadow-sm border transition-all cursor-pointer relative overflow-hidden group hover:shadow-md ${
                        isSelected()
                          ? "bg-primary/10 border-primary ring-1 ring-primary"
                          : "bg-base-100 border-base-300 hover:border-primary/40"
                      }`}
                      onClick={() => props.onRowClick?.(row.id)}
                    >
                      <div class="card-body p-5 flex flex-col h-full gap-0">
                        <div class="mb-4">
                          <Show when={primaryField()}>
                            <div class="text-[10px] font-bold uppercase tracking-wider text-base-content/50 mb-1">
                              {primaryField().label}
                            </div>
                            <div class="text-lg font-bold text-base-content leading-tight truncate">
                              {displayValue(
                                row[primaryField().id],
                                primaryField(),
                              )}
                            </div>
                          </Show>
                        </div>
                        <dl class="grid grid-cols-2 gap-x-4 gap-y-3 flex-1 mb-4 content-start">
                          <For each={metaFields()}>
                            {(field) => (
                              <div class="flex flex-col min-w-0">
                                <dt class="text-[10px] font-bold uppercase tracking-wider text-base-content/50 truncate">
                                  {field.label}
                                </dt>
                                <dd class="text-sm font-medium text-base-content truncate mt-0.5">
                                  {displayValue(row[field.id], field)}
                                </dd>
                              </div>
                            )}
                          </For>
                        </dl>
                        <div class="mt-auto pt-3 border-t border-base-200/60 flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <A
                            href={`${props.baseRoute}/${row.id}`}
                            class="btn btn-ghost btn-sm btn-square"
                            onClick={(e) => e.stopPropagation()}
                            title="View"
                          >
                            <Eye size={16} class="text-base-content/70" />
                          </A>
                          <A
                            href={`${props.baseRoute}/${row.id}/edit`}
                            class="btn btn-ghost btn-sm btn-square"
                            onClick={(e) => e.stopPropagation()}
                            title="Edit"
                          >
                            <Edit2 size={16} class="text-primary" />
                          </A>
                          <Show when={props.onDelete}>
                            <button
                              class="btn btn-ghost btn-sm btn-square"
                              onClick={(e) => {
                                e.stopPropagation();
                                props.onDelete(row.id);
                              }}
                              title="Delete"
                            >
                              <Trash2 size={16} class="text-error" />
                            </button>
                          </Show>
                        </div>
                      </div>
                    </div>
                  );
                }}
              </For>
            </div>
          </Show>
        </Show>
      </Show>
    </div>
  );
}
