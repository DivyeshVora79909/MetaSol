import { createSignal, createEffect } from "solid-js";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-solid";

export default function Pagination(props) {
  const limit = () => Math.max(1, Number(props.limit) || 1);
  const total = () => Math.max(0, Number(props.total) || 0);
  const totalPages = () => Math.max(1, Math.ceil(total() / limit()));
  const page = () =>
    Math.min(Math.max(1, Number(props.page) || 1), totalPages());

  const first = () => (total() === 0 ? 0 : (page() - 1) * limit() + 1);
  const last = () => Math.min(page() * limit(), total());

  const [inputVal, setInputVal] = createSignal(page());

  createEffect(() => setInputVal(page()));

  const handleJump = () => {
    let p = parseInt(inputVal(), 10);
    if (isNaN(p)) p = page();
    p = Math.min(Math.max(1, p), totalPages());

    setInputVal(p);
    if (p !== page()) props.onPageChange(p);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleJump();
    }
  };

  const isLocked = () => props.isLoading || totalPages() <= 1;

  return (
    <nav
      aria-label="Pagination"
      class="flex flex-col gap-4 rounded-box border border-base-300 bg-base-100 p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <p class="text-center text-sm text-base-content/65 sm:text-left">
        Showing{" "}
        <strong class="text-base-content">
          {first()}–{last()}
        </strong>{" "}
        of <strong class="text-base-content">{total()}</strong>{" "}
        {props.label || "records"}
      </p>

      <div class="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
        <div class="join shadow-sm">
          <button
            class="hidden sm:inline-flex btn btn-sm join-item bg-base-200/50 hover:bg-base-200"
            aria-label="First page"
            disabled={isLocked() || page() <= 1}
            onClick={() => props.onPageChange(1)}
          >
            <ChevronsLeft size={16} />
          </button>
          <button
            class="btn btn-sm join-item bg-base-200/50 hover:bg-base-200"
            aria-label="Previous page"
            disabled={isLocked() || page() <= 1}
            onClick={() => props.onPageChange(page() - 1)}
          >
            <ChevronLeft size={16} />
          </button>
        </div>

        <div class="flex items-center gap-1.5 text-sm font-medium text-base-content/70">
          <span class="hidden sm:inline">Page</span>
          <input
            type="text"
            inputmode="numeric"
            class="input input-sm input-bordered w-12 sm:w-16 text-center font-mono focus:outline-primary transition-all p-0"
            value={inputVal()}
            disabled={isLocked()}
            onInput={(e) => setInputVal(e.target.value)}
            onBlur={handleJump}
            onKeyDown={handleKeyDown}
          />
          <span class="hidden sm:inline">of {totalPages()}</span>
          <span class="sm:hidden">/ {totalPages()}</span>
        </div>

        <div class="join shadow-sm">
          <button
            class="btn btn-sm join-item bg-base-200/50 hover:bg-base-200"
            aria-label="Next page"
            disabled={isLocked() || page() >= totalPages()}
            onClick={() => props.onPageChange(page() + 1)}
          >
            <ChevronRight size={16} />
          </button>
          <button
            class="hidden sm:inline-flex btn btn-sm join-item bg-base-200/50 hover:bg-base-200"
            aria-label="Last page"
            disabled={isLocked() || page() >= totalPages()}
            onClick={() => props.onPageChange(totalPages())}
          >
            <ChevronsRight size={16} />
          </button>
        </div>
      </div>
    </nav>
  );
}
