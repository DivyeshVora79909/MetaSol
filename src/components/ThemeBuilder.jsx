import { Show, For } from "solid-js";
import { X, Trash2, Edit3 } from "lucide-solid";
import { useUI } from "../store/ui";

export default function ThemeBuilder() {
  const {
    ui,
    activeTheme,
    SYSTEM_THEMES,
    setActiveTheme,
    updateThemePref,
    deleteCustomTheme,
    toggleThemeBuilder,
  } = useUI();

  const renameTheme = () => {
    const newName = prompt("Enter new theme name:", activeTheme().name);
    if (newName && newName.trim()) {
      updateThemePref("name", newName.trim());
    }
  };

  const isCustom = () => ui.registry.activeId.startsWith("cus-");

  const ColorInput = (props) => (
    <div class="flex items-center justify-between p-2 rounded-lg bg-base-200/50 border border-base-300">
      <span class="text-sm font-medium">{props.label}</span>
      <div class="flex items-center gap-2">
        <span class="font-mono text-xs opacity-50 uppercase">
          {activeTheme()[props.prefKey]}
        </span>
        <input
          type="color"
          class="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
          value={activeTheme()[props.prefKey]}
          onInput={(e) => updateThemePref(props.prefKey, e.target.value)}
        />
      </div>
    </div>
  );

  return (
    <>
      <Show when={ui.themeBuilderOpen}>
        <div
          class="absolute inset-0 bg-base-300/60 backdrop-blur-sm z-40"
          onClick={toggleThemeBuilder}
        />
      </Show>

      <div
        class={`absolute top-0 right-0 h-full w-full sm:w-96 bg-base-100 shadow-2xl border-l border-base-300 z-50 flex flex-col transition-transform duration-300 ease-in-out ${ui.themeBuilderOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div class="p-4 border-b border-base-300 flex flex-col gap-3 shrink-0 bg-base-200/50">
          <div class="flex items-center justify-between">
            <h2 class="font-bold text-lg leading-tight">Theme Registry</h2>
            <button
              class="btn btn-sm btn-circle btn-ghost"
              onClick={toggleThemeBuilder}
            >
              <X size={16} />
            </button>
          </div>

          <div class="flex items-center gap-2 w-full">
            <select
              class="select select-sm select-bordered flex-1 font-semibold"
              value={ui.registry.activeId}
              onChange={(e) => setActiveTheme(e.target.value)}
            >
              <optgroup label="System Themes">
                <For each={Object.entries(SYSTEM_THEMES)}>
                  {([id, theme]) => <option value={id}>{theme.name}</option>}
                </For>
              </optgroup>

              <Show when={Object.keys(ui.registry.customThemes).length > 0}>
                <optgroup label="Your Custom Themes">
                  <For each={Object.entries(ui.registry.customThemes)}>
                    {([id, theme]) => <option value={id}>{theme.name}</option>}
                  </For>
                </optgroup>
              </Show>
            </select>

            <Show when={isCustom()}>
              <button
                class="btn btn-sm btn-ghost btn-square"
                title="Rename Theme"
                onClick={renameTheme}
              >
                <Edit3 size={14} />
              </button>
            </Show>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto p-4 space-y-6">
          <section>
            <h3 class="text-xs font-bold uppercase tracking-wider text-base-content/50 mb-3">
              Color Palette
            </h3>
            <div class="space-y-2">
              <ColorInput label="Primary Accent" prefKey="primary" />
              <ColorInput label="Secondary Accent" prefKey="secondary" />{" "}
              <ColorInput label="App Background" prefKey="bgBase" />
              <ColorInput label="Surface (Cards)" prefKey="bgSurface" />
              <ColorInput label="Borders & Lines" prefKey="borderColor" />
              <ColorInput label="Text Content" prefKey="textBase" />
            </div>
          </section>

          <section>
            <h3 class="text-xs font-bold uppercase tracking-wider text-base-content/50 mb-3">
              Geometry & Spacing
            </h3>
            <div class="space-y-4 p-4 rounded-lg bg-base-200/50 border border-base-300">
              <div class="form-control w-full">
                <label class="label pt-0">
                  <span class="text-sm font-medium">Border Radius</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  class="range range-primary range-xs"
                  value={parseFloat(activeTheme().radius)}
                  onInput={(e) =>
                    updateThemePref("radius", `${e.target.value}rem`)
                  }
                />
              </div>

              <div class="form-control w-full">
                <label class="label">
                  <span class="text-sm font-medium">Border Width</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="4"
                  step="1"
                  class="range range-primary range-xs"
                  value={parseInt(activeTheme().borderWidth)}
                  onInput={(e) =>
                    updateThemePref("borderWidth", `${e.target.value}px`)
                  }
                />
              </div>

              <div class="form-control w-full">
                <label class="label">
                  <span class="text-sm font-medium">Layout Padding</span>
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.25"
                  class="range range-primary range-xs"
                  value={parseFloat(activeTheme().padding)}
                  onInput={(e) =>
                    updateThemePref("padding", `${e.target.value}rem`)
                  }
                />
              </div>
            </div>
          </section>
        </div>

        <Show when={isCustom()}>
          <div class="p-4 border-t border-base-300 bg-base-200/50 shrink-0">
            <button
              class="btn btn-outline btn-error btn-sm w-full"
              onClick={() => deleteCustomTheme(ui.registry.activeId)}
            >
              <Trash2 size={14} /> Delete Custom Theme
            </button>
          </div>
        </Show>
      </div>
    </>
  );
}
