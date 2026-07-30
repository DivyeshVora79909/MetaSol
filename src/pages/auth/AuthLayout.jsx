import { useUI } from "../../store/ui";

export default function AuthLayout(props) {
  const { ui, setActiveTheme, SYSTEM_THEMES } = useUI();

  return (
    <div class="relative flex min-h-dvh items-center justify-center overflow-hidden bg-base-200 p-4 text-base-content">
      {/* Aesthetic Background Accents (Uses injected CSS variables!) */}
      <div class="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div class="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-base-content/5 rounded-full blur-3xl" />

      <div class="absolute right-4 top-4 z-50">
        <select
          aria-label="Application theme"
          class="select select-sm select-bordered bg-base-100/95 shadow-sm backdrop-blur"
          value={ui.registry.activeId}
          onChange={(e) => setActiveTheme(e.target.value)}
        >
          <optgroup label="Select Theme">
            {Object.entries(SYSTEM_THEMES).map(([id, theme]) => (
              <option value={id}>{theme.name}</option>
            ))}
          </optgroup>
        </select>
      </div>

      <div class="z-10 w-full max-w-md">{props.children}</div>
    </div>
  );
}
