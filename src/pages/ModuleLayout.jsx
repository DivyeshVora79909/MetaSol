import { Show } from "solid-js";

/**
 * Generic sub-layout for Domain Modules (e.g., User Management, Organizations)
 * @param {Object} props.children - The actual view (Graph, Table, List)
 * @param {JSX} props.toolbar - Buttons for actions (Create, Filter, Export)
 * @param {Array} props.tabs - Sub-navigation [{ label: "Graph", href: "/users", active: true }]
 */
export default function ModuleLayout(props) {
  return (
    <div class="flex flex-col h-full min-h-[calc(100vh-100px)]">
      {/* Module Sub-Header (Action Bar & Tabs) */}
      <div class="bg-base-100 border border-base-300 rounded-t-box flex flex-col md:flex-row justify-between items-start md:items-center gap-4 z-10 layout-pad">
        {/* Tabs for different views within the module */}
        <Show when={props.tabs}>
          <div class="tabs tabs-boxed bg-base-200/50 p-1">
            {props.tabs.map((tab) => (
              <a
                class={`tab tab-sm md:tab-md ${tab.active ? "tab-active font-bold text-primary" : ""}`}
                href={tab.href}
              >
                {tab.label}
              </a>
            ))}
          </div>
        </Show>

        {/* Contextual Toolbar (e.g., 'Add User' button passed from child router) */}
        <Show when={props.toolbar}>
          <div class="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            {props.toolbar()}
          </div>
        </Show>
      </div>

      {/* Module Content Body */}
      <div class="flex-1 bg-base-100/50 border-x border-b border-base-300 rounded-b-box relative overflow-hidden flex flex-col">
        {props.children}
      </div>
    </div>
  );
}
