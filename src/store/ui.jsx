import {
  createContext,
  useContext,
  createEffect,
  onCleanup,
  createMemo,
} from "solid-js";
import { createStore, unwrap } from "solid-js/store";

const UIContext = createContext();

// 1. PREDEFINED THEMES
const SYSTEM_THEMES = {
  "sys-corporate": {
    name: "Office",
    bgBase: "#f1f5f9",
    bgSurface: "#ffffff",
    textBase: "#1e293b",
    primary: "#2563eb",
    secondary: "#475569",
    radius: "0.5rem",
    borderWidth: "1px",
    borderColor: "#e2e8f0",
    padding: "1.25rem",
  },
  "sys-dark": {
    name: "Dark",
    bgBase: "#0f172a",
    bgSurface: "#1e293b",
    textBase: "#f8fafc",
    primary: "#3b82f6",
    secondary: "#64748b",
    radius: "0.5rem",
    borderWidth: "1px",
    borderColor: "#334155",
    padding: "1.25rem",
  },
  "sys-business": {
    name: "Business",
    bgBase: "#1c212b",
    bgSurface: "#242b38",
    textBase: "#b1b8c0",
    primary: "#1c4ed8",
    secondary: "#4b5563",
    radius: "0rem",
    borderWidth: "1px",
    borderColor: "#374151",
    padding: "0.75rem",
  },
  "sys-wireframe": {
    name: "Wireframe",
    bgBase: "#ffffff",
    bgSurface: "#ffffff",
    textBase: "#000000",
    primary: "#000000",
    secondary: "#cccccc",
    radius: "0rem",
    borderWidth: "2px",
    borderColor: "#000000",
    padding: "2rem",
  },
  "sys-dracula": {
    name: "Dracula",
    bgBase: "#282a36",
    bgSurface: "#44475a",
    textBase: "#f8f8f2",
    primary: "#ff79c6",
    secondary: "#bd93f9",
    radius: "1rem",
    borderWidth: "0px",
    borderColor: "transparent",
    padding: "1.25rem",
  },
  "sys-light": {
    name: "Light",
    bgBase: "#f8fafc",
    bgSurface: "#f1f5f9",
    textBase: "#0f172a",
    primary: "#000000",
    secondary: "#64748b",
    radius: "0.5rem",
    borderWidth: "0px",
    borderColor: "transparent",
    padding: "1.25rem",
  },
  "sys-emerald": {
    name: "Emerald",
    bgBase: "#f9fafb",
    bgSurface: "#ffffff",
    textBase: "#334155",
    primary: "#10b981",
    secondary: "#3b82f6",
    radius: "2rem",
    borderWidth: "1px",
    borderColor: "#e2e8f0",
    padding: "1.25rem",
  },
  "sys-sunset": {
    name: "Sunset",
    bgBase: "#121c22",
    bgSurface: "#1b2a32",
    textBase: "#cbd5e1",
    primary: "#ff865b",
    secondary: "#fbbf24",
    radius: "0.75rem",
    borderWidth: "1px",
    borderColor: "#273e4b",
    padding: "1.5rem",
  },
};

export function UIProvider(props) {
  const savedRegistry = JSON.parse(
    localStorage.getItem("rebase_theme_registry") || "null",
  );

  const defaultRegistry = {
    activeId: "sys-dark",
    customThemes: {},
  };

  const [ui, setUi] = createStore({
    registry: savedRegistry || defaultRegistry,
    viewport: window.innerWidth,
    get isMobile() {
      return this.viewport < 768;
    },
    sidebarOpen: true,
    themeBuilderOpen: false,
  });

  const activeTheme = createMemo(() => {
    const id = ui.registry.activeId;
    return (
      ui.registry.customThemes[id] ||
      SYSTEM_THEMES[id] ||
      SYSTEM_THEMES["sys-dark"]
    );
  });

  const toggleSidebar = () => setUi("sidebarOpen", !ui.sidebarOpen);
  const toggleThemeBuilder = () =>
    setUi("themeBuilderOpen", !ui.themeBuilderOpen);

  const setActiveTheme = (id) => setUi("registry", "activeId", id);

  const deleteCustomTheme = (id) => {
    setUi("registry", "customThemes", id, undefined);
    if (ui.registry.activeId === id) setActiveTheme("sys-dark");
  };

  const updateThemePref = (key, value) => {
    const currentId = ui.registry.activeId;
    if (SYSTEM_THEMES[currentId]) {
      const newId = `cus-${Date.now()}`;
      const clonedTheme = {
        ...SYSTEM_THEMES[currentId],
        name: `Custom (${new Date().toLocaleTimeString()})`,
      };
      clonedTheme[key] = value;

      setUi("registry", "customThemes", newId, clonedTheme);
      setActiveTheme(newId);
    } else {
      setUi("registry", "customThemes", currentId, key, value);
    }
  };

  createEffect(() => {
    localStorage.setItem(
      "rebase_theme_registry",
      JSON.stringify(unwrap(ui.registry)),
    );
  });

  createEffect(() => {
    const root = document.documentElement;
    const p = activeTheme();

    root.setAttribute("data-theme", "dark");

    root.style.setProperty("--color-base-100", p.bgSurface);
    root.style.setProperty("--color-base-200", p.bgBase);
    root.style.setProperty("--color-base-300", p.borderColor);
    root.style.setProperty("--color-base-content", p.textBase);
    root.style.setProperty("--color-primary", p.primary);
    root.style.setProperty("--color-primary-content", "#ffffff");
    root.style.setProperty("--color-secondary", p.secondary);
    root.style.setProperty("--color-secondary-content", "#ffffff");

    root.style.setProperty("--fallback-b1", p.bgSurface);
    root.style.setProperty("--fallback-b2", p.bgBase);
    root.style.setProperty("--fallback-b3", p.borderColor);
    root.style.setProperty("--fallback-bc", p.textBase);
    root.style.setProperty("--fallback-p", p.primary);
    root.style.setProperty("--fallback-pc", "#ffffff");
    root.style.setProperty("--fallback-s", p.secondary);
    root.style.setProperty("--fallback-sc", "#ffffff");

    root.style.setProperty("--app-pad", p.padding);
    root.style.setProperty("--app-border-width", p.borderWidth);
    root.style.setProperty("--app-border-color", p.borderColor);
    root.style.setProperty("--rounded-box", p.radius);
    root.style.setProperty("--rounded-btn", `calc(${p.radius} * 0.75)`);
    root.style.setProperty("--rounded-badge", `calc(${p.radius} * 2)`);
  });

  createEffect(() => {
    const onResize = () => setUi("viewport", window.innerWidth);
    window.addEventListener("resize", onResize);
    onCleanup(() => window.removeEventListener("resize", onResize));
  });

  return (
    <UIContext.Provider
      value={{
        ui,
        activeTheme,
        SYSTEM_THEMES,
        setActiveTheme,
        updateThemePref,
        deleteCustomTheme,
        toggleSidebar,
        toggleThemeBuilder,
      }}
    >
      {props.children}
    </UIContext.Provider>
  );
}

export const useUI = () => useContext(UIContext);
