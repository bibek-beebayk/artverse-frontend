/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  FileImage,
  Loader2,
  PackageSearch,
  RefreshCw,
  ShoppingCart,
  Sparkles,
  Upload,
  UserCog,
  Wand2,
  XCircle,
} from "lucide-react";
import { requestJson, ApiError } from "../../../lib/api.ts";
import { cn } from "../../../lib/utils.ts";

interface DashboardData {
  products: { active: number; inactive: number; needs_attention: number };
  variants: { sellable: number; missing_cost: number; unavailable: number };
  printify: { failed_sync_runs: number };
  generator: { failed_mockup_renders: number; failed_generation_requests: number; print_files: number };
  commerce: { current_carts: number };
  users: { total: number };
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: number;
  tone?: "neutral" | "good" | "warning" | "bad";
}) {
  const toneClass =
    tone === "good"
      ? "text-neon-blue"
      : tone === "warning"
        ? "text-yellow-400"
        : tone === "bad"
          ? "text-neon-pink"
          : "text-white";

  return (
    <div className="glass-card flex items-center gap-4 border-white/10 p-5">
      <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5", toneClass)}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <div className={cn("font-display text-2xl font-black tracking-tight", toneClass)}>{value}</div>
        <div className="truncate text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</div>
      </div>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  label,
  to,
}: {
  icon: typeof Sparkles;
  label: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="glass-card flex items-center justify-between gap-3 border-white/10 p-4 text-gray-300 transition-colors hover:border-neon-purple/40 hover:text-white"
    >
      <span className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5">
          <Icon size={15} />
        </span>
        <span className="text-xs font-bold uppercase tracking-widest">{label}</span>
      </span>
      <ArrowUpRight size={14} className="text-gray-500" />
    </Link>
  );
}

function SectionHeading({ children }: { children: string }) {
  return (
    <h2 className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-gray-500">{children}</h2>
  );
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    setError(null);
    requestJson<DashboardData>("/auth/admin/dashboard/")
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load dashboard."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-xl font-black uppercase tracking-widest text-white">Dashboard</h1>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-300 hover:text-white disabled:opacity-60"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          Refresh
        </button>
      </div>

      {loading && !data ? (
        <div className="glass-card flex items-center justify-center border-white/10 p-16 text-gray-500">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : error ? (
        <div className="glass-card border-neon-pink/30 bg-neon-pink/10 p-6 text-sm text-neon-pink">{error}</div>
      ) : data ? (
        <div className="flex flex-col gap-8">
          <Link
            to="/admin/product-wizard"
            className="glass-card flex flex-wrap items-center justify-between gap-4 border-neon-purple/30 bg-neon-purple/10 p-6 transition-colors hover:bg-neon-purple/20"
          >
            <span className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-neon-purple/30 bg-neon-purple/10 text-white">
                <Wand2 size={20} />
              </span>
              <span>
                <span className="block font-display text-base font-black uppercase tracking-widest text-white">
                  Guided Product Creation
                </span>
                <span className="mt-1 block text-xs text-gray-400">
                  One continuous, step-by-step flow — category through activation — instead of jumping between
                  admin sections.
                </span>
              </span>
            </span>
            <span className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-cyber-black">
              Start
              <ArrowRight size={13} />
            </span>
          </Link>

          <div>
            <SectionHeading>Products</SectionHeading>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <SummaryCard icon={CheckCircle2} label="Active Products" value={data.products.active} tone="good" />
              <SummaryCard icon={XCircle} label="Inactive Products" value={data.products.inactive} />
              <SummaryCard
                icon={AlertTriangle}
                label="Needs Attention"
                value={data.products.needs_attention}
                tone={data.products.needs_attention > 0 ? "warning" : "neutral"}
              />
            </div>
          </div>

          <div>
            <SectionHeading>Variants</SectionHeading>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <SummaryCard icon={CheckCircle2} label="Sellable Variants" value={data.variants.sellable} tone="good" />
              <SummaryCard
                icon={AlertTriangle}
                label="Missing Production Cost"
                value={data.variants.missing_cost}
                tone={data.variants.missing_cost > 0 ? "warning" : "neutral"}
              />
              <SummaryCard icon={XCircle} label="Unavailable Variants" value={data.variants.unavailable} />
            </div>
          </div>

          <div>
            <SectionHeading>Printify &amp; Generator</SectionHeading>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard
                icon={AlertTriangle}
                label="Failed Sync Runs"
                value={data.printify.failed_sync_runs}
                tone={data.printify.failed_sync_runs > 0 ? "bad" : "neutral"}
              />
              <SummaryCard
                icon={AlertTriangle}
                label="Failed Mockup Renders"
                value={data.generator.failed_mockup_renders}
                tone={data.generator.failed_mockup_renders > 0 ? "bad" : "neutral"}
              />
              <SummaryCard
                icon={AlertTriangle}
                label="Failed AI Generations"
                value={data.generator.failed_generation_requests}
                tone={data.generator.failed_generation_requests > 0 ? "bad" : "neutral"}
              />
              <SummaryCard icon={FileImage} label="Generated Print Files" value={data.generator.print_files} />
            </div>
          </div>

          <div>
            <SectionHeading>Commerce &amp; Users</SectionHeading>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SummaryCard icon={ShoppingCart} label="Current Carts (with items)" value={data.commerce.current_carts} />
              <SummaryCard icon={UserCog} label="Total Users" value={data.users.total} />
            </div>
          </div>

          <div>
            <SectionHeading>Quick Actions</SectionHeading>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <QuickAction icon={Sparkles} label="Add Product" to="/admin/catalog/products" />
              <QuickAction icon={Boxes} label="Add Mockup Template" to="/admin/catalog/mockup-templates" />
              <QuickAction icon={Upload} label="Upload Artworks" to="/admin/gallery/artworks" />
              <QuickAction icon={RefreshCw} label="Sync Printify Catalogue" to="/admin/printify/blueprints" />
              <QuickAction icon={PackageSearch} label="Review Product Issues" to="/admin/catalog/products?ready_status=needs_attention" />
              <QuickAction icon={Wand2} label="Review Failed Renders" to="/admin/support/mockup-renders" />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
