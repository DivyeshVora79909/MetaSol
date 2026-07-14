import { ChevronLeft, ChevronRight } from "lucide-solid";
export default function Pagination(props) {
  const limit = () => Math.max(1, Number(props.limit) || 1);
  const total = () => Math.max(0, Number(props.total) || 0);
  const totalPages = () => Math.max(1, Math.ceil(total() / limit()));
  const page = () => Math.min(Math.max(1, Number(props.page) || 1), totalPages());
  const first = () => total() === 0 ? 0 : (page() - 1) * limit() + 1;
  const last = () => Math.min(page() * limit(), total());
  return <nav aria-label="Pagination" class="flex flex-wrap items-center justify-between gap-3 rounded-box border border-base-300 bg-base-100 p-3 shadow-sm">
    <p class="px-2 text-sm text-base-content/65">Showing <strong class="text-base-content">{first()}–{last()}</strong> of <strong class="text-base-content">{total()}</strong> {props.label || "records"}</p>
    <div class="join"><button class="btn btn-sm join-item" aria-label="Previous page" disabled={page() <= 1} onClick={() => props.onPageChange(page() - 1)}><ChevronLeft size={16} /></button><span class="btn btn-sm join-item pointer-events-none font-mono">Page {page()} of {totalPages()}</span><button class="btn btn-sm join-item" aria-label="Next page" disabled={page() >= totalPages()} onClick={() => props.onPageChange(page() + 1)}><ChevronRight size={16} /></button></div>
  </nav>;
}
