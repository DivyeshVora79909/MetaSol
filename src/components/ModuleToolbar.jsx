import { createSignal, For, Show } from "solid-js";
import { X } from "lucide-solid";

export default function ModuleToolbar(props) {
  const [activeTab, setActiveTab] = createSignal(null);

  const toggleTab = (id) => {
    setActiveTab((current) => (current === id ? null : id));
  };

  return (
    <div class="border-t border-base-200">
      <div class="flex flex-wrap items-center gap-2 px-4 py-2 sm:px-5 bg-base-200/30">
        <For each={props.tools}>
          {(tool) => {
            const isActive = () => activeTab() === tool.id;
            const Icon = tool.icon;
            return (
              <button
                type="button"
                onClick={() => toggleTab(tool.id)}
                class={`btn btn-sm transition-colors ${
                  isActive()
                    ? "btn-secondary"
                    : "btn-ghost text-base-content/70 hover:bg-base-200 hover:text-base-content"
                }`}
                aria-expanded={isActive()}
                aria-controls={`toolbar-panel-${tool.id}`}
              >
                <Icon size={16} />
                <span class="font-medium">{tool.label}</span>
                <Show when={tool.badge}>{tool.badge()}</Show>
              </button>
            );
          }}
        </For>
      </div>

      <Show when={activeTab()}>
        <div
          id={`toolbar-panel-${activeTab()}`}
          class="border-t border-base-200 bg-base-100 shadow-inner animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div class="flex items-center justify-between border-b border-base-200/50 bg-base-200/10 px-4 py-2 sm:px-5">
            <span class="text-xs font-bold uppercase tracking-wider text-base-content/50">
              Configuration Stage
            </span>
            <button
              type="button"
              class="btn btn-ghost btn-xs btn-square text-base-content/60 hover:text-error"
              onClick={() => setActiveTab(null)}
              aria-label="Close panel"
            >
              <X size={14} />
            </button>
          </div>

          <For each={props.tools}>
            {(tool) => (
              <Show when={activeTab() === tool.id}>{tool.content()}</Show>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
