import { createContext, useContext, createEffect, onCleanup } from "solid-js";
import { createStore } from "solid-js/store";

const UIContext = createContext();

const THEME_PRESETS = {
  corporate: { radius: "smooth", border: "thin", density: "comfortable" },
  dark: { radius: "smooth", border: "thin", density: "comfortable" },
  business: { radius: "sharp", border: "thin", density: "compact" },
  wireframe: { radius: "sharp", border: "thick", density: "spacious" },
  dracula: { radius: "pill", border: "none", density: "comfortable" },
  light: { radius: "smooth", border: "none", density: "comfortable" },
  night: { radius: "sharp", border: "thin", density: "compact" },
  emerald: { radius: "pill", border: "thin", density: "comfortable" },
  sunset: { radius: "smooth", border: "thick", density: "spacious" },
};

export function UIProvider(props) {
  const initialTheme = localStorage.getItem("rebase_theme") || "dark";
  const defaultPreset = THEME_PRESETS[initialTheme] || THEME_PRESETS.dark;

  const [ui, setUi] = createStore({
    theme: initialTheme,
    density: localStorage.getItem("rebase_density") || defaultPreset.density,
    radius: localStorage.getItem("rebase_radius") || defaultPreset.radius,
    border: localStorage.getItem("rebase_border") || defaultPreset.border,

    viewport: window.innerWidth,
    get device() {
      if (this.viewport < 768) return "mobile";
      if (this.viewport < 1024) return "tablet";
      return "desktop";
    },
    get isMobile() {
      return this.device === "mobile";
    },

    sidebarOpen: true,
    pageTitle: "Dashboard",
    activeModule: "core",

    drawer: { isOpen: false, title: "", content: null, size: "md" },
    modal: {
      isOpen: false,
      type: "info",
      title: "",
      message: "",
      onConfirm: null,
    },
  });

  const setAesthetic = (key, value) => {
    setUi(key, value);
    localStorage.setItem(`rebase_${key}`, value);

    if (key === "theme" && THEME_PRESETS[value]) {
      const preset = THEME_PRESETS[value];
      setUi("radius", preset.radius);
      setUi("border", preset.border);
      setUi("density", preset.density);
      localStorage.setItem("rebase_radius", preset.radius);
      localStorage.setItem("rebase_border", preset.border);
      localStorage.setItem("rebase_density", preset.density);
    }
  };

  const setPageMeta = (title, module = ui.activeModule) => {
    setUi("pageTitle", title);
    setUi("activeModule", module);
  };

  const toggleSidebar = () => setUi("sidebarOpen", !ui.sidebarOpen);
  const openDrawer = (title, content, size = "md") =>
    setUi("drawer", { isOpen: true, title, content, size });
  const closeDrawer = () => setUi("drawer", "isOpen", false);
  const openModal = (title, message, type = "info", onConfirm = null) =>
    setUi("modal", { isOpen: true, title, message, type, onConfirm });
  const closeModal = () => setUi("modal", "isOpen", false);

  createEffect(() => {
    const onResize = () => setUi("viewport", window.innerWidth);
    window.addEventListener("resize", onResize);
    onCleanup(() => window.removeEventListener("resize", onResize));
  });

  createEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", ui.theme);
    root.setAttribute("data-density", ui.density);
    root.setAttribute("data-radius", ui.radius);
    root.setAttribute("data-border", ui.border);
  });

  return (
    <UIContext.Provider
      value={{
        ui,
        setAesthetic,
        setPageMeta,
        toggleSidebar,
        openDrawer,
        closeDrawer,
        openModal,
        closeModal,
      }}
    >
      {props.children}
    </UIContext.Provider>
  );
}

export const useUI = () => useContext(UIContext);
