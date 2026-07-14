import { For, Show, createMemo } from "solid-js";
import { Edit2, Eye } from "lucide-solid";
import { A } from "@solidjs/router";
const displayValue = (value, field) => {
  if (value === null || value === undefined) return <span class="font-mono opacity-35">—</span>;
  if (field.type === "boolean") return <span class={`badge badge-sm ${value ? "badge-success" : "badge-error"}`}>{value ? "True" : "False"}</span>;
  if (field.type === "datetime") {
    const date = new Date(value);
    return <span class="font-mono text-xs">{Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString()}</span>;
  }
  if (Array.isArray(value)) return <span class="badge badge-ghost badge-sm">{value.length} items</span>;
  if (field.type === "object") return <span class="font-mono text-xs opacity-75">Object</span>;
  return <span class={field.type === "number" ? "font-mono text-sm" : "block max-w-xs truncate text-sm"}>{String(value)}</span>;
};
export default function DataTable(props) {
  const fieldById = createMemo(() => new Map(props.config.fields.map(field => [field.id, field])));
  const columns = createMemo(() => props.select.map(id => fieldById().get(id)).filter(Boolean));
  const columnCount = () => columns().length + 1;
  const rows = () => props.data || [];
  return <div class="flex h-full w-full flex-col overflow-auto rounded-box border border-base-300 bg-base-100 shadow-sm">
    <table class="table table-sm w-full md:table-md"><thead class="sticky top-0 z-10 bg-base-200/95 shadow-sm backdrop-blur"><tr><For each={columns()}>{field => <th scope="col" class="whitespace-nowrap">{field.label}</th>}</For><th scope="col" class="w-24 text-right">Actions</th></tr></thead>
      <tbody><Show when={!props.isLoading} fallback={<tr><td colSpan={columnCount()} class="py-12 text-center"><span class="loading loading-spinner loading-lg text-primary" /><span class="sr-only">Loading records</span></td></tr>}>
        <Show when={!props.error} fallback={<tr><td colSpan={columnCount()} class="py-12 text-center text-error">{props.error}</td></tr>}>
          <Show when={rows().length > 0} fallback={<tr><td colSpan={columnCount()} class="py-12 text-center text-base-content/55">No {props.entityLabelPlural || "records"} match this query.</td></tr>}>
            <For each={rows()}>{row => <tr class="group transition-colors hover:bg-base-200/50"><For each={columns()}>{field => <td>{displayValue(row[field.id], field)}</td>}</For><td class="text-right"><div class="flex justify-end gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"><Show when={row.id}><A href={`${props.baseRoute}/${row.id}`} class="btn btn-ghost btn-sm btn-square" aria-label={`View ${row.id}`}><Eye size={15} /></A><A href={`${props.baseRoute}/${row.id}/edit`} class="btn btn-ghost btn-sm btn-square text-primary" aria-label={`Edit ${row.id}`}><Edit2 size={15} /></A></Show></div></td></tr>}</For>
          </Show>
        </Show>
      </Show></tbody>
    </table>
  </div>;
}
