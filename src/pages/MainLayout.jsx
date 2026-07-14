import { Show } from "solid-js";
import { A } from "@solidjs/router";
import { useAuth } from "../store/auth";
import { useUI } from "../store/ui";
import { SYSTEM_THEMES } from "../lib/constants";
import {
  LayoutDashboard,
  Users,
  LogOut,
  Palette,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-solid";

export default function MainLayout(props) {
  const { setToken } = useAuth();
  const { ui, setAesthetic, toggleSidebar, closeDrawer, closeModal } = useUI();

  // Navigation Dictionary (Pragmatic mapping for the sidebar)
  const NAV_ITEMS = [
    {
      path: "/",
      icon: <LayoutDashboard size={20} />,
      label: "Dashboard",
      module: "dashboard",
    },
    {
      path: "/users",
      icon: <Users size={20} />,
      label: "Access & Nodes",
      module: "users",
    },
  ];

  return (
    <div class="flex h-screen w-full bg-base-200 overflow-hidden relative">
      {/* =========================================================
          THE UNIFIED SIDEBAR (Desktop Mini-mode OR Mobile Drawer)
          ========================================================= */}

      {/* Mobile Backdrop (Only exists when mobile & open) */}
      <Show when={ui.isMobile && ui.sidebarOpen}>
        <div
          class="fixed inset-0 bg-base-300/80 backdrop-blur-sm z-40"
          onClick={toggleSidebar}
        />
      </Show>

      {/* The Sidebar Element */}
      <aside
        class={`
          fixed md:relative z-50 h-full bg-base-100 shadow-xl border-r border-base-300 
          flex flex-col transition-all duration-300 ease-in-out
          ${ui.sidebarOpen ? "w-64 translate-x-0" : "-translate-x-full md:translate-x-0 md:w-20"}
        `}
      >
        {/* Brand Header */}
        <div class="flex items-center justify-between h-16 px-4 border-b border-base-300">
          <div class="flex items-center gap-3 overflow-hidden">
            <div class="w-10 h-10 min-w-[40px] bg-primary rounded-box flex items-center justify-center text-primary-content font-black">
              R
            </div>
            <Show when={ui.sidebarOpen}>
              <span class="text-xl font-black text-primary tracking-widest uppercase truncate">
                ReBase
              </span>
            </Show>
          </div>
        </div>

        {/* Navigation Matrix */}
        <nav class="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-2">
          {NAV_ITEMS.map((item) => (
            <A
              href={item.path}
              class={`
                flex items-center gap-4 px-3 py-3 rounded-box transition-colors
                ${ui.activeModule === item.module ? "bg-primary text-primary-content shadow-sm" : "text-base-content/70 hover:bg-base-200"}
                ${!ui.sidebarOpen && !ui.isMobile ? "justify-center px-0" : ""}
              `}
              title={!ui.sidebarOpen ? item.label : ""}
            >
              {item.icon}
              <Show when={ui.sidebarOpen}>
                <span class="font-bold truncate">{item.label}</span>
              </Show>
            </A>
          ))}
        </nav>

        {/* Bottom Action Row */}
        <div class="border-t border-base-300 p-3 flex flex-col gap-2">
          {/* Theme Selector (Dropdown logic adapts to sidebar width) */}
          <div
            class={`dropdown dropdown-top ${!ui.sidebarOpen && !ui.isMobile ? "dropdown-end" : ""}`}
          >
            <div
              tabindex="0"
              role="button"
              class="btn btn-ghost w-full flex justify-start gap-4 px-3"
            >
              <Palette size={20} class="shrink-0 text-base-content/70" />
              <Show when={ui.sidebarOpen}>
                <span class="font-bold text-base-content/70">Theme</span>
              </Show>
            </div>
            <ul
              tabindex="0"
              class="dropdown-content z-[1] menu p-2 shadow-xl bg-base-100 rounded-box w-48 mb-2 border border-base-300"
            >
              {SYSTEM_THEMES.map((t) => (
                <li>
                  <a
                    onClick={() => setAesthetic("theme", t.id)}
                    class={ui.theme === t.id ? "active" : ""}
                  >
                    {t.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Session Termination */}
          <button
            class="btn btn-ghost w-full flex justify-start gap-4 px-3 hover:bg-error/20 hover:text-error text-error/80"
            onClick={() => setToken(null)}
            title="Terminate Session"
          >
            <LogOut size={20} class="shrink-0" />
            <Show when={ui.sidebarOpen}>
              <span class="font-bold">Logout</span>
            </Show>
          </button>
        </div>
      </aside>

      {/* =========================================================
          MAIN WORKSPACE (Header + Content)
          ========================================================= */}
      <main class="flex-1 flex flex-col min-w-0 bg-base-200 h-screen relative">
        {/* Workspace Header */}
        <header class="h-16 bg-base-100 border-b border-base-300 flex items-center justify-between px-4 shadow-sm shrink-0 z-10">
          <div class="flex items-center gap-3">
            {/* Contextual Hamburger / Collapse Button */}
            <button
              class="btn btn-sm btn-ghost btn-circle"
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
            <h1 class="text-xl font-bold truncate">{ui.pageTitle}</h1>
          </div>
        </header>

        {/* Content Injection Area */}
        <div class="flex-1 overflow-y-auto layout-pad w-full">
          <div class="max-w-7xl mx-auto w-full">{props.children}</div>
        </div>
      </main>

      {/* =========================================================
          THE GLOBAL OVERLAY MATRIX (Unchanged)
          ========================================================= */}
      <div
        class={`fixed inset-0 z-[100] transition-opacity duration-300 ${ui.drawer.isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      >
        <div
          class="absolute inset-0 bg-base-300/60 backdrop-blur-sm"
          onClick={closeDrawer}
        />
        <div
          class={`absolute right-0 top-0 bottom-0 bg-base-100 shadow-2xl flex flex-col transition-transform duration-300 transform ${ui.drawer.isOpen ? "translate-x-0" : "translate-x-full"}`}
          style={{
            width:
              ui.drawer.size === "lg"
                ? "800px"
                : ui.drawer.size === "sm"
                  ? "320px"
                  : "450px",
            "max-width": "100vw",
          }}
        >
          <div class="border-b border-base-300 flex justify-between items-center layout-pad">
            <h2 class="text-lg font-bold">{ui.drawer.title}</h2>
            <button
              class="btn btn-sm btn-circle btn-ghost"
              onClick={closeDrawer}
            >
              ✕
            </button>
          </div>
          <div class="flex-1 overflow-y-auto layout-pad">
            <Show when={ui.drawer.content}>{ui.drawer.content()}</Show>
          </div>
        </div>
      </div>
      <div
        class={`modal modal-bottom sm:modal-middle ${ui.modal.isOpen ? "modal-open" : ""} z-[110]`}
      >
        <div class="modal-box bg-base-100 layout-pad">
          <h3
            class={`font-bold text-lg ${ui.modal.type === "error" ? "text-error" : "text-primary"}`}
          >
            {ui.modal.title}
          </h3>
          <p class="py-4 text-base-content/80">{ui.modal.message}</p>
          <div class="modal-action">
            <button class="btn btn-ghost" onClick={closeModal}>
              Cancel
            </button>
            <Show when={ui.modal.onConfirm}>
              <button
                class="btn btn-primary"
                onClick={() => {
                  ui.modal.onConfirm();
                  closeModal();
                }}
              >
                Confirm
              </button>
            </Show>
          </div>
        </div>
      </div>
    </div>
  );
}
