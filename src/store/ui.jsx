import { createContext, useContext, createEffect, onCleanup } from "solid-js";
import { createStore } from "solid-js/store";

const UIContext = createContext();

export function UIProvider(props) {
  const [ui, setUi] = createStore({
    // QUADRANT 1: AESTHETIC MATH
    theme: localStorage.getItem("rebase_theme") || "dark",
    density: localStorage.getItem("rebase_density") || "comfortable", // compact | comfortable | spacious
    radius: localStorage.getItem("rebase_radius") || "smooth", // sharp | smooth | pill
    border: localStorage.getItem("rebase_border") || "thin", // none | thin | thick

    // QUADRANT 2: DEVICE TOPOLOGY
    viewport: window.innerWidth,
    get device() {
      if (this.viewport < 768) return "mobile";
      if (this.viewport < 1024) return "tablet";
      return "desktop";
    },
    get isMobile() {
      return this.device === "mobile";
    },

    // QUADRANT 3: CONTEXTUAL META (Propagated to Layout Headers)
    sidebarOpen: true,
    pageTitle: "Dashboard",
    activeModule: "core", // e.g., 'users', 'crm', 'finance'

    // QUADRANT 4: THE OVERLAY MATRIX (O(1) Global Modals & Drawers)
    drawer: { isOpen: false, title: "", content: null, size: "md" },
    modal: {
      isOpen: false,
      type: "info",
      title: "",
      message: "",
      onConfirm: null,
    },
  });

  // MUTATORS
  const setAesthetic = (key, value) => {
    setUi(key, value);
    localStorage.setItem(`rebase_${key}`, value);
  };

  const setPageMeta = (title, module = ui.activeModule) => {
    setUi("pageTitle", title);
    setUi("activeModule", module);
  };

  const toggleSidebar = () => setUi("sidebarOpen", !ui.sidebarOpen);

  // Overlay Mutators (Pass a function returning JSX for the content)
  const openDrawer = (title, content, size = "md") =>
    setUi("drawer", { isOpen: true, title, content, size });
  const closeDrawer = () => setUi("drawer", "isOpen", false);

  const openModal = (title, message, type = "info", onConfirm = null) =>
    setUi("modal", { isOpen: true, title, message, type, onConfirm });
  const closeModal = () => setUi("modal", "isOpen", false);

  // ============================================================================
  // REACTIVE GRAPH EFFECTS
  // ============================================================================

  // 1. Sync Viewport
  createEffect(() => {
    const onResize = () => setUi("viewport", window.innerWidth);
    window.addEventListener("resize", onResize);
    onCleanup(() => window.removeEventListener("resize", onResize));
  });

  // 2. Sync DOM Attributes (This triggers the CSS Math below)
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
