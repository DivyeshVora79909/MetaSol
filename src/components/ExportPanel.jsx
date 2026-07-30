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

  const maxExportLimit = () => props.config?.capabilities?.maxLimit ?? 1000;

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
        baseState.limit = Math.min(Math.max(1, limit()), maxExportLimit());
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
    <div class="p-4 sm:p-6 border-t border-base-200 bg-base-100/30">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-0">
        <div class="space-y-4 lg:pr-8">
          <h3 class="text-xs sm:text-sm font-bold text-base-content/80 uppercase tracking-wider">
            Export Scope
          </h3>
          <div class="flex flex-col gap-2.5">
            <label
              class={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                mode() === "query"
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-base-200 hover:border-base-300 hover:bg-base-200/50"
              }`}
            >
              <input
                type="radio"
                class="radio radio-primary radio-sm shrink-0"
                checked={mode() === "query"}
                onChange={() => setMode("query")}
              />
              <div class="min-w-0 flex-1">
                <span class="text-sm font-semibold text-base-content block truncate">
                  Filtered Query
                </span>
                <span class="text-xs text-base-content/60 block mt-0.5 truncate">
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
                class="radio radio-primary radio-sm shrink-0"
                checked={mode() === "selection"}
                onChange={() => setMode("selection")}
                disabled={props.selectedIds.length === 0}
              />
              <div class="min-w-0 flex-1">
                <span class="text-sm font-semibold text-base-content block truncate">
                  Selected Records
                </span>
                <span class="text-xs text-base-content/60 block mt-0.5 truncate">
                  {props.selectedIds.length > 0
                    ? `${props.selectedIds.length} rows selected`
                    : "No selection"}
                </span>
              </div>
            </label>
          </div>
        </div>

        <div class="space-y-4 pt-6 border-t border-base-200 lg:pt-0 lg:border-t-0 lg:border-l lg:px-8">
          <h3 class="text-xs sm:text-sm font-bold text-base-content/80 uppercase tracking-wider">
            File Format
          </h3>
          <div class="grid grid-cols-3 gap-2 sm:gap-3">
            <button
              type="button"
              class={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg border transition-all h-20 sm:h-24 ${
                format() === "csv"
                  ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/20"
                  : "border-base-200 hover:border-base-300 hover:bg-base-200/50 text-base-content/70"
              }`}
              onClick={() => setFormat("csv")}
            >
              <FileText size={20} class="sm:w-6 sm:h-6" />
              <span class="text-xs font-semibold">CSV</span>
            </button>
            <button
              type="button"
              class={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg border transition-all h-20 sm:h-24 ${
                format() === "xlsx"
                  ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/20"
                  : "border-base-200 hover:border-base-300 hover:bg-base-200/50 text-base-content/70"
              }`}
              onClick={() => setFormat("xlsx")}
            >
              <FileSpreadsheet size={20} class="sm:w-6 sm:h-6" />
              <span class="text-xs font-semibold">Excel</span>
            </button>
            <button
              type="button"
              class={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg border transition-all h-20 sm:h-24 ${
                format() === "json"
                  ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/20"
                  : "border-base-200 hover:border-base-300 hover:bg-base-200/50 text-base-content/70"
              }`}
              onClick={() => setFormat("json")}
            >
              <FileJson size={20} class="sm:w-6 sm:h-6" />
              <span class="text-xs font-semibold">JSON</span>
            </button>
          </div>
        </div>

        <div class="space-y-4 pt-6 border-t border-base-200 lg:pt-0 lg:border-t-0 lg:border-l lg:pl-8">
          <h3 class="text-xs sm:text-sm font-bold text-base-content/80 uppercase tracking-wider">
            Options
          </h3>
          <div class="form-control w-full">
            <label class="label px-0 pt-0 pb-1.5">
              <span class="label-text text-sm font-semibold text-base-content">
                Maximum Rows
              </span>
              <span class="label-text-alt text-xs font-medium text-base-content/50">
                Max: {maxExportLimit()}
              </span>
            </label>
            <input
              type="number"
              min="1"
              max={maxExportLimit()}
              class="input input-bordered w-full text-sm font-mono"
              value={
                mode() === "selection" ? props.selectedIds.length : limit()
              }
              disabled={mode() === "selection"}
              onInput={(e) => setLimit(e.target.value)}
              onBlur={(e) => {
                let val = parseInt(e.target.value, 10);
                if (isNaN(val) || val < 1) val = 1;
                if (val > maxExportLimit()) val = maxExportLimit();
                setLimit(val);
                e.target.value = val;
              }}
            />
            <Show when={mode() === "selection"}>
              <span class="text-xs text-primary mt-2 block font-medium">
                Locked to selection count
              </span>
            </Show>
          </div>
        </div>
      </div>

      <div class="flex sm:justify-end pt-6 mt-6 border-t border-base-200">
        <button
          class="btn btn-primary w-full sm:w-auto sm:min-w-[160px] shadow-sm"
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
            <span class="loading loading-spinner loading-sm"></span>{" "}
            Processing...
          </Show>
        </button>
      </div>
    </div>
  );
}
