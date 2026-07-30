import { Show } from "solid-js";
import { A } from "@solidjs/router";
import { useAuth } from "../store/auth";
import { useUI } from "../store/ui";
import {
  LayoutDashboard,
  Users,
  Shield,
  Box,
  Palette,
  LogOut,
} from "lucide-solid";
import ThemeBuilder from "../components/ThemeBuilder";

export default function MainLayout(props) {
  const { setToken } = useAuth();
  const { ui, toggleSidebar, toggleThemeBuilder } = useUI();

  const NAV_ITEMS = [
    { path: "/", icon: <LayoutDashboard size={20} />, label: "Dashboard" },
    { path: "/users", icon: <Users size={20} />, label: "Users" },
    { path: "/groups", icon: <Shield size={20} />, label: "Groups" },
    { path: "/primitives", icon: <Box size={20} />, label: "Primitives" },
  ];

  return (
    <div class="relative flex h-dvh w-full overflow-hidden bg-base-200 text-base-content">
      <Show when={ui.isMobile && ui.sidebarOpen}>
        <div
          class="fixed inset-0 bg-base-300/80 backdrop-blur-sm z-40"
          onClick={toggleSidebar}
        />
      </Show>

      {/* SIDEBAR */}
      <aside
        class={`fixed md:relative z-50 h-full bg-base-100 shadow-xl border-r border-base-300 flex flex-col transition-all duration-300 ease-in-out
          ${ui.sidebarOpen ? "w-72 translate-x-0" : "-translate-x-full md:translate-x-0 md:w-20"}
        `}
      >
        <div class="flex items-center h-16 px-4 border-b border-base-300 gap-3 shrink-0">
          <div class="w-10 h-10 min-w-[40px] bg-primary rounded-box flex items-center justify-center text-primary-content font-black shadow-sm">
            R
          </div>
          <Show when={ui.sidebarOpen}>
            <span class="text-xl font-black tracking-widest uppercase">
              ReBase
            </span>
          </Show>
        </div>

        <nav class="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-2">
          {NAV_ITEMS.map((item) => (
            <A
              href={item.path}
              end={true}
              activeClass="bg-primary/10 text-primary font-semibold shadow-sm border-l-4 border-primary"
              inactiveClass="text-base-content/70 hover:bg-base-200 border-l-4 border-transparent"
              class={`flex items-center gap-4 px-3 py-3 rounded-box transition-all duration-200 ${!ui.sidebarOpen && !ui.isMobile ? "justify-center px-0 border-l-0" : ""}`}
              title={!ui.sidebarOpen ? item.label : ""}
            >
              {item.icon}
              <Show when={ui.sidebarOpen}>
                <span class="truncate">{item.label}</span>
              </Show>
            </A>
          ))}
        </nav>

        {/* BOTTOM ACTIONS */}
        <div class="border-t border-base-300 p-3 flex flex-col gap-2 shrink-0">
          <button
            class="btn btn-ghost w-full flex justify-start gap-4 px-3 text-base-content/70 hover:bg-base-200 hover:text-base-content"
            onClick={toggleThemeBuilder}
            title="Theme Builder"
          >
            <Palette size={20} class="shrink-0" />
            <Show when={ui.sidebarOpen}>
              <span class="font-bold">Theme</span>
            </Show>
          </button>

          <button
            class="btn btn-ghost w-full flex justify-start gap-4 px-3 text-error/80 hover:bg-error/20 hover:text-error"
            onClick={() => setToken(null)}
            title="Logout"
          >
            <LogOut size={20} class="shrink-0" />
            <Show when={ui.sidebarOpen}>
              <span class="font-bold">Logout</span>
            </Show>
          </button>
        </div>
      </aside>

      {/* THE APP OUTLET */}
      <div class="flex-1 min-w-0 relative">
        {props.children}
        <ThemeBuilder />
      </div>
    </div>
  );
}
