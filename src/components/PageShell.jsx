import { Show } from "solid-js";
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-solid";
import { useUI } from "../store/ui";

export default function PageShell(props) {
  const { ui, toggleSidebar } = useUI();

  // Evaluates truthiness of header elements
  const hasHeader = () => Boolean(props.title || props.toolbar);

  return (
    <main class="relative flex h-dvh min-w-0 flex-1 flex-col bg-base-200/40">
      {/* DYNAMIC HEADER - Only exists if truthy data is passed */}
      <Show when={hasHeader()}>
        <header class="z-10 flex min-h-16 shrink-0 items-center justify-between border-b border-base-300 bg-base-100/95 px-3 shadow-sm backdrop-blur sm:px-4">
          <div class="flex items-center gap-3 min-w-0">
            {/* Sidebar Toggle (Always present on header) */}
            <button
              class="btn btn-sm btn-ghost btn-circle shrink-0"
              onClick={toggleSidebar}
            >
              <Show when={!ui.isMobile} fallback={<Menu size={20} />}>
                {ui.sidebarOpen ? (
                  <PanelLeftClose size={20} />
                ) : (
                  <PanelLeftOpen size={20} />
                )}
              </Show>
            </button>

            {/* Dynamic Title */}
            <Show when={props.title}>
              <h1 class="text-xl font-bold truncate">{props.title}</h1>
            </Show>
          </div>

          {/* Dynamic Toolbar */}
          <Show when={props.toolbar}>
            <div class="flex items-center gap-2 shrink-0">{props.toolbar}</div>
          </Show>
        </header>
      </Show>

      {/* DYNAMIC CONTENT AREA */}
      <div class="flex-1 overflow-y-auto w-full">
        {/* If flush is true, remove padding (e.g. for full-screen maps). Otherwise standard padding. */}
        <div
          class={`mx-auto w-full max-w-[var(--app-content-width)] ${props.flush ? "" : "layout-pad"}`}
        >
          {props.children}
        </div>
      </div>
    </main>
  );
}
