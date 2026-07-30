import { For, Show, createMemo } from "solid-js";
import { Edit2, Eye, Trash2 } from "lucide-solid";
import { A } from "@solidjs/router";

const displayValue = (value, field) => {
  if (value === null || value === undefined)
    return <span class="font-mono opacity-35">—</span>;
  if (field.type === "boolean")
    return (
      <span class={`badge badge-sm ${value ? "badge-success" : "badge-error"}`}>
        {value ? "True" : "False"}
      </span>
    );
  if (field.type === "datetime") {
    const date = new Date(value);
    return (
      <span class="font-mono text-xs">
        {Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString()}
      </span>
    );
  }
  if (Array.isArray(value)) {
    const label = field.ui?.arrayLabel || "item";
    const suffix = value.length === 1 ? label : `${label}s`;
    return (
      <span class="badge badge-ghost badge-sm tabular-nums">
        {value.length} {suffix}
      </span>
    );
  }
  return (
    <span
      class={
        field.type === "number"
          ? "font-mono text-sm"
          : "block max-w-xs truncate text-sm"
      }
    >
      {String(value)}
    </span>
  );
};

export default function DataTable(props) {
  const fieldById = createMemo(
    () => new Map(props.config.fields.map((field) => [field.id, field])),
  );
  const columns = createMemo(() =>
    props.select.map((id) => fieldById().get(id)).filter(Boolean),
  );
  const columnCount = () => columns().length + 1;
  const rows = () => props.data || [];

  return (
    <div class="flex h-full w-full flex-col overflow-auto rounded-box border border-base-300 bg-base-100 shadow-sm">
      <table class="table table-sm w-full md:table-md">
        <thead class="sticky top-0 z-10 bg-base-200/95 shadow-sm backdrop-blur">
          <tr>
            <For each={columns()}>
              {(field) => (
                <th scope="col" class="whitespace-nowrap">
                  {field.label}
                </th>
              )}
            </For>
            <th scope="col" class="w-28 text-right">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          <Show
            when={!props.isLoading}
            fallback={
              <tr>
                <td colSpan={columnCount()} class="py-12 text-center">
                  <span class="loading loading-spinner loading-lg text-primary" />
                </td>
              </tr>
            }
          >
            <Show
              when={!props.error}
              fallback={
                <tr>
                  <td
                    colSpan={columnCount()}
                    class="py-12 text-center text-error"
                  >
                    {props.error}
                  </td>
                </tr>
              }
            >
              <Show
                when={rows().length > 0}
                fallback={
                  <tr>
                    <td
                      colSpan={columnCount()}
                      class="py-12 text-center text-base-content/55"
                    >
                      No {props.entityLabelPlural || "records"} match this
                      query.
                    </td>
                  </tr>
                }
              >
                <For each={rows()}>
                  {(row) => (
                    <tr
                      class={`group transition-all cursor-pointer hover:bg-base-200/50 ${
                        props.isSelected?.(row.id)
                          ? "bg-primary/10 border-l-4 border-l-primary"
                          : "border-l-4 border-l-transparent"
                      }`}
                      onClick={() =>
                        props.onRowClick && props.onRowClick(row.id)
                      }
                    >
                      <For each={columns()}>
                        {(field) => (
                          <td>{displayValue(row[field.id], field)}</td>
                        )}
                      </For>
                      <td class="text-right">
                        <div class="flex justify-end gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                          <Show when={row.id}>
                            <A
                              href={`${props.baseRoute}/${row.id}`}
                              class="btn btn-ghost btn-sm btn-square"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Eye size={15} />
                            </A>
                            <A
                              href={`${props.baseRoute}/${row.id}/edit`}
                              class="btn btn-ghost btn-sm btn-square text-primary"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Edit2 size={15} />
                            </A>
                            <Show when={props.onDelete}>
                              <button
                                class="btn btn-ghost btn-sm btn-square text-error"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  props.onDelete(row.id);
                                }}
                              >
                                <Trash2 size={15} />
                              </button>
                            </Show>
                          </Show>
                        </div>
                      </td>
                    </tr>
                  )}
                </For>
              </Show>
            </Show>
          </Show>
        </tbody>
      </table>
    </div>
  );
}
