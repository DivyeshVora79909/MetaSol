import { createEffect, createSignal, Show } from "solid-js";
import { unwrap } from "solid-js/store";
import { FileJson, FileSpreadsheet, FileText, Download } from "lucide-solid";
import { fetchQuery } from "../lib/surreal";
import { compileQuery } from "../lib/queryEngine/index.js";
import { generateExportFile } from "../lib/export.js";
import toast from "solid-toast";

/**
 * @param {Object} props.config
 * @param {Object} props.queryState
 * @param {Array<any>} props.selectedIds
 */
export default function ExportPanel(props) {
  const [mode, setMode] = createSignal("query"); // 'query' | 'selection'
  const [format, setFormat] = createSignal("csv"); // 'csv' | 'json' | 'xlsx'
  const [limit, setLimit] = createSignal(100);
  const [isExporting, setIsExporting] = createSignal(false);

  createEffect(() => {
    if (props.selectedIds.length === 0 && mode() === "selection") {
      setMode("query");
    }
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const baseState = structuredClone(unwrap(props.queryState));
      baseState.page = 1;

      if (mode() === "selection") {
        const cleanIds = unwrap(props.selectedIds).map((id) => String(id));
        baseState.limit = cleanIds.length;
        baseState.sorts = [];
        baseState.filters = [{ field: "id", operator: "IN", value: cleanIds }];
      } else {
        baseState.limit = Math.min(Math.max(1, limit()), 5000);
      }

      const compiled = compileQuery(props.config, baseState);
      const response = await fetchQuery(compiled.sql, compiled.variables);
      const data = response[0] || [];

      if (data.length === 0) {
        toast.error("Query returned no records to export.");
        return;
      }

      await generateExportFile(data, format(), props.config);
      toast.success(`Exported ${data.length} records successfully.`);
    } catch (error) {
      toast.error(`Export failed: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div class="p-5 sm:p-6 border-t border-base-200 bg-base-100/30">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div class="space-y-4">
          <h3 class="text-sm font-semibold text-base-content/80 uppercase tracking-wider">
            Export Scope
          </h3>
          <div class="flex flex-col gap-3">
            <label
              class={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                mode() === "query"
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-base-200 hover:border-base-300 hover:bg-base-200/50"
              }`}
            >
              <input
                type="radio"
                class="radio radio-primary radio-sm"
                checked={mode() === "query"}
                onChange={() => setMode("query")}
              />
              <div class="flex-1">
                <span class="text-sm font-semibold text-base-content block">
                  Filtered Query
                </span>
                <span class="text-xs text-base-content/60 block mt-0.5">
                  Current view parameters
                </span>
              </div>
            </label>

            <label
              class={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                props.selectedIds.length === 0
                  ? "opacity-50 grayscale cursor-not-allowed border-base-200 bg-base-200/20"
                  : mode() === "selection"
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20 cursor-pointer"
                    : "border-base-200 hover:border-base-300 hover:bg-base-200/50 cursor-pointer"
              }`}
            >
              <input
                type="radio"
                class="radio radio-primary radio-sm"
                checked={mode() === "selection"}
                onChange={() => setMode("selection")}
                disabled={props.selectedIds.length === 0}
              />
              <div class="flex-1">
                <span class="text-sm font-semibold text-base-content block">
                  Selected Records
                </span>
                <span class="text-xs text-base-content/60 block mt-0.5">
                  {props.selectedIds.length > 0
                    ? `${props.selectedIds.length} rows selected`
                    : "No selection"}
                </span>
              </div>
            </label>
          </div>
        </div>

        <div class="space-y-4">
          <h3 class="text-sm font-semibold text-base-content/80 uppercase tracking-wider">
            File Format
          </h3>
          <div class="grid grid-cols-3 gap-3">
            <button
              type="button"
              class={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg border transition-all h-24 ${
                format() === "csv"
                  ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/20"
                  : "border-base-200 hover:border-base-300 hover:bg-base-200/50 text-base-content/70"
              }`}
              onClick={() => setFormat("csv")}
            >
              <FileText size={24} />
              <span class="text-xs font-semibold">CSV</span>
            </button>
            <button
              type="button"
              class={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg border transition-all h-24 ${
                format() === "xlsx"
                  ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/20"
                  : "border-base-200 hover:border-base-300 hover:bg-base-200/50 text-base-content/70"
              }`}
              onClick={() => setFormat("xlsx")}
            >
              <FileSpreadsheet size={24} />
              <span class="text-xs font-semibold">Excel</span>
            </button>
            <button
              type="button"
              class={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg border transition-all h-24 ${
                format() === "json"
                  ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/20"
                  : "border-base-200 hover:border-base-300 hover:bg-base-200/50 text-base-content/70"
              }`}
              onClick={() => setFormat("json")}
            >
              <FileJson size={24} />
              <span class="text-xs font-semibold">JSON</span>
            </button>
          </div>
        </div>

        <div class="space-y-4 lg:border-l lg:border-base-200 lg:pl-8">
          <h3 class="text-sm font-semibold text-base-content/80 uppercase tracking-wider">
            Options
          </h3>
          <div class="form-control w-full">
            <label class="label px-0 pt-0 pb-1.5">
              <span class="label-text text-sm font-semibold text-base-content">
                Maximum Rows
              </span>
              <span class="label-text-alt text-xs font-medium text-base-content/50">
                Max: 5000
              </span>
            </label>
            <input
              type="number"
              min="1"
              max="5000"
              class="input input-bordered w-full text-sm font-mono"
              value={
                mode() === "selection" ? props.selectedIds.length : limit()
              }
              onInput={(e) => setLimit(Number(e.target.value))}
              disabled={mode() === "selection"}
            />
            <Show when={mode() === "selection"}>
              <span class="text-xs text-primary mt-2 block">
                Locked to selection count
              </span>
            </Show>
          </div>
        </div>
      </div>

      <div class="flex justify-end pt-6 mt-6 border-t border-base-200">
        <button
          class="btn btn-primary min-w-[160px] shadow-sm"
          onClick={handleExport}
          disabled={isExporting()}
        >
          <Show
            when={isExporting()}
            fallback={
              <>
                <Download size={18} /> Export Data
              </>
            }
          >
            <span class="loading loading-spinner loading-sm"></span>
            Processing...
          </Show>
        </button>
      </div>
    </div>
  );
}
