import { Show, createEffect } from "solid-js";
import { createQuery } from "@tanstack/solid-query";
import { useUI } from "../store/ui";
import { fetchQuery } from "../lib/surreal";
import {
  Activity,
  Users,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-solid";

export default function Dashboard() {
  const { setPageMeta } = useUI();

  // Child takes control: Claims its identity in the Global UI Matrix
  createEffect(() => setPageMeta("Dashboard Matrix", "dashboard"));

  const metricsQuery = createQuery(() => ({
    queryKey: ["dashboard_metrics"],
    queryFn: async () => {
      // Mocked payload representing a true O(1) CRM backend view
      return {
        total_orgs: 142,
        monthly_revenue: 145000,
        active_pipelines: 24,
        growth: 12.5,
      };
    },
  }));

  // Reusable Micro-Component for Stat Cards
  const StatCard = (props) => (
    <div class="card bg-base-100 shadow-sm border border-base-300">
      <div class="card-body p-5">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-base-content/50 uppercase tracking-wider">
            {props.title}
          </h3>
          <div class="p-2 bg-base-200 rounded-box text-primary">
            {props.icon}
          </div>
        </div>
        <div class="mt-2 flex items-end gap-2">
          <span class="text-3xl font-black">{props.value}</span>
          <Show when={props.trend}>
            <span
              class={`flex items-center text-sm font-bold mb-1 ${props.trend > 0 ? "text-success" : "text-error"}`}
            >
              {props.trend > 0 ? (
                <ArrowUpRight size={16} />
              ) : (
                <ArrowDownRight size={16} />
              )}
              {Math.abs(props.trend)}%
            </span>
          </Show>
        </div>
      </div>
    </div>
  );

  return (
    <div class="flex flex-col h-full gap-[var(--app-pad)]">
      {/* 1. TOP METRICS ROW (Network Fueled) */}
      <Show
        when={!metricsQuery.isLoading}
        fallback={
          <div class="skeleton h-32 w-full rounded-box bg-base-300"></div>
        }
      >
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[var(--app-pad)]">
          <StatCard
            title="Total Organizations"
            value={metricsQuery.data?.total_orgs}
            icon={<Users size={20} />}
            trend={4.2}
          />
          <StatCard
            title="Monthly Revenue"
            value={`$${metricsQuery.data?.monthly_revenue?.toLocaleString()}`}
            icon={<Activity size={20} />}
            trend={12.5}
          />
          <StatCard
            title="Active Contracts"
            value={metricsQuery.data?.active_pipelines}
            icon={<FileText size={20} />}
            trend={-2.1}
          />
          <StatCard
            title="System Nodes"
            value="8"
            icon={<Activity size={20} />}
          />
        </div>
      </Show>

      {/* 2. MAIN WORKSPACE GRID */}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-[var(--app-pad)] flex-1">
        {/* Main Chart / Activity Area */}
        <div class="card bg-base-100 shadow-sm border border-base-300 lg:col-span-2">
          <div class="card-body p-6">
            <h2 class="card-title text-lg border-b border-base-200 pb-2">
              Revenue Topology
            </h2>
            <div class="flex-1 flex items-center justify-center min-h-[300px] border-2 border-dashed border-base-300 rounded-box mt-4 bg-base-200/30">
              <span class="text-base-content/50 font-mono text-sm">
                Chart projection node pending...
              </span>
            </div>
          </div>
        </div>

        {/* Secondary Feed Area */}
        <div class="card bg-base-100 shadow-sm border border-base-300">
          <div class="card-body p-6">
            <h2 class="card-title text-lg border-b border-base-200 pb-2">
              Recent Mutations
            </h2>

            <ul class="mt-4 flex flex-col gap-4">
              {[1, 2, 3, 4].map((i) => (
                <li class="flex items-start gap-3">
                  <div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
                    <span class="text-primary text-xs font-bold">U{i}</span>
                  </div>
                  <div>
                    <p class="text-sm font-bold">System Node Authenticated</p>
                    <p class="text-xs text-base-content/60">
                      Updated the lifecycle status of Org: Tesla to 'Active'.
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <div class="mt-auto pt-4">
              <button class="btn btn-outline btn-sm w-full">
                View Full Ledger
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
