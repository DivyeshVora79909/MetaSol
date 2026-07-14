import { useUI } from "../../store/ui";
import { SYSTEM_THEMES } from "../../lib/constants";

export default function AuthLayout(props) {
  const { ui, setAesthetic } = useUI();

  return (
    <div class="min-h-screen bg-base-200 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Aesthetic Background Accents */}
      <div class="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div class="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />

      {/* Public Theme Controls */}
      <div class="absolute top-4 right-4 z-50">
        <select
          class="select select-sm select-bordered bg-base-100 shadow-sm"
          value={ui.theme}
          onChange={(e) => setAesthetic("theme", e.target.value)}
        >
          {SYSTEM_THEMES.map((t) => (
            <option value={t.id}>{t.label}</option>
          ))}
        </select>
      </div>

      <div class="z-10 w-full max-w-md">{props.children}</div>
    </div>
  );
}
