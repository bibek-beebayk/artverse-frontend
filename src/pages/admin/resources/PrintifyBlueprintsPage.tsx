/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronDown, ChevronRight, Link2, Loader2, RefreshCw, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { AdminResourceTable } from "../../../components/admin/AdminResourceTable.tsx";
import { AdminModal } from "../../../components/admin/AdminModal.tsx";
import { useToast } from "../../../components/admin/ToastProvider.tsx";
import { adminAction, makeAdminCrud } from "../../../lib/adminApi.ts";
import { ApiError, requestJson } from "../../../lib/api.ts";
import { cn } from "../../../lib/utils.ts";

interface BlueprintRow {
  id: number;
  blueprint_id: number;
  title: string;
  brand: string;
  model: string;
  /** Printify's own catalogue/marketing photos for this blueprint (synced as-is, unvalidated
   * shape) — generic stock photos of the blank product, not necessarily a clean flat product
   * shot suitable for a MockupTemplatePart's base_image without cropping/review first. */
  images: unknown[];
  mockup_template: number | null;
  is_mapped: boolean;
  provider_count: number;
  synced_at: string;
}

interface PrintProvider {
  id: number;
  provider_id: number;
  title: string;
  location: Record<string, unknown>;
  variant_count: number;
  available_variant_count: number;
  supported_placeholders: string[];
  missing_cost_variant_count: number;
  missing_external_id_variant_count: number;
  synced_at: string;
}

interface BlueprintDetail extends BlueprintRow {
  print_providers: PrintProvider[];
}

// Printify's own location shape (city/region/country) — degrades gracefully for any other
// object shape rather than assuming exact keys, since this is passed through untouched from
// whatever Printify's API returned at sync time (apps.printify.services.fetch_print_provider_location).
function formatLocation(location: Record<string, unknown> | null | undefined): string {
  if (!location || typeof location !== "object") return "Unknown";
  const parts = [location.city, location.region, location.country].filter(
    (part): part is string => typeof part === "string" && part.length > 0,
  );
  return parts.length ? parts.join(", ") : "Unknown";
}

interface ConnectionStatus {
  configured: boolean;
  connected: boolean;
  shop: { id: number; title: string; sales_channel: string } | null;
  error: string | null;
  blueprint_count: number;
  mapped_blueprint_count: number;
  last_sync_run: { status: string; started_at: string; finished_at: string | null } | null;
}

const crud = makeAdminCrud<BlueprintRow>("/printify/blueprints");
const templateCrud = makeAdminCrud<{ id: number; name: string; selected_print_provider: number | null }>(
  "/generator/admin/mockup-templates",
);

function ConnectionStatusCard() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const check = () => {
    setChecking(true);
    setError(null);
    requestJson<ConnectionStatus>("/printify/status/")
      .then((data) => {
        setStatus(data);
        setCheckedAt(new Date());
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to check connection."))
      .finally(() => setChecking(false));
  };

  useEffect(() => {
    check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const state: "connected" | "error" | "not_configured" = !status
    ? "not_configured"
    : !status.configured
      ? "not_configured"
      : status.connected
        ? "connected"
        : "error";

  const badge = {
    connected: { label: "Connected", icon: ShieldCheck, cls: "border-neon-blue/30 bg-neon-blue/10 text-neon-blue" },
    error: { label: "Connection Error", icon: ShieldAlert, cls: "border-neon-pink/30 bg-neon-pink/10 text-neon-pink" },
    not_configured: { label: "Not Configured", icon: ShieldQuestion, cls: "border-white/10 bg-white/5 text-gray-400" },
  }[state];

  return (
    <div className="glass-card mb-6 border-white/10 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className={cn("flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest", badge.cls)}>
            <badge.icon size={13} />
            {badge.label}
          </span>
          {status?.shop && (
            <span className="text-xs text-gray-400">
              Shop: <span className="font-bold text-white">{status.shop.title}</span> (#{status.shop.id})
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={check}
          disabled={checking}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-300 hover:text-white disabled:opacity-60"
        >
          {checking ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          Check Connection
        </button>
      </div>

      {error && <div className="mt-3 text-xs text-neon-pink">{error}</div>}
      {status?.error && <div className="mt-3 text-xs text-neon-pink">{status.error}</div>}

      {status && (
        <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
          <div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-gray-500">Synced Blueprints</div>
            <div className="font-bold text-white">{status.blueprint_count}</div>
          </div>
          <div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-gray-500">Mapped Blueprints</div>
            <div className="font-bold text-white">{status.mapped_blueprint_count}</div>
          </div>
          <div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-gray-500">Catalogue Sync</div>
            <div className="font-bold text-white">{status.connected ? "Available" : "Unavailable"}</div>
          </div>
          <div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-gray-500">Status Checked</div>
            <div className="font-bold text-white">{checkedAt ? "Just now" : "—"}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProviderRow({
  provider,
  blueprintTemplateId,
  isActive,
  onSelected,
}: {
  provider: PrintProvider;
  blueprintTemplateId: number | null;
  /** True when this provider is the mapped template's *currently selected* one — i.e. the one
   * actually fulfilling orders for that template right now, not just a candidate being browsed. */
  isActive: boolean;
  onSelected: () => void;
}) {
  const toast = useToast();
  const [selecting, setSelecting] = useState(false);

  const selectProvider = async () => {
    if (!blueprintTemplateId) return;
    setSelecting(true);
    try {
      await templateCrud.update(blueprintTemplateId, { selected_print_provider: provider.id } as never);
      toast.success(`Provider "${provider.title}" selected.`);
      onSelected();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not select this provider.", {
        title: "Selection failed",
      });
    } finally {
      setSelecting(false);
    }
  };

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3 border-b border-white/5 px-4 py-3 last:border-0 sm:grid-cols-[1.3fr_1fr_0.8fr_0.8fr_0.9fr_1.2fr_auto] sm:items-center",
        isActive && "bg-neon-blue/5",
      )}
    >
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-white">{provider.title}</span>
          {isActive && (
            <span className="rounded-full border border-neon-blue/30 bg-neon-blue/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-neon-blue">
              Active
            </span>
          )}
        </div>
        <div className="text-[10px] text-gray-500">Provider #{provider.provider_id}</div>
      </div>
      <div className="text-xs text-gray-300">{formatLocation(provider.location)}</div>
      <div className="text-xs text-gray-300">{provider.variant_count} variants</div>
      <div className="text-xs text-gray-300">{provider.available_variant_count} available</div>
      <div className={cn("text-xs", provider.missing_cost_variant_count > 0 ? "text-yellow-400" : "text-gray-300")}>
        {provider.missing_cost_variant_count} missing cost
      </div>
      <div className="truncate text-[10px] text-gray-500" title={provider.supported_placeholders.join(", ")}>
        {provider.supported_placeholders.length ? provider.supported_placeholders.join(", ") : "No synced print areas"}
      </div>
      <button
        type="button"
        onClick={() => void selectProvider()}
        disabled={selecting || !blueprintTemplateId || isActive}
        title={
          isActive
            ? "Already the selected provider for this template"
            : blueprintTemplateId
              ? "Select this provider for the mapped template"
              : "Map a mockup template to this blueprint first"
        }
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-gray-200 hover:text-neon-blue disabled:opacity-40"
      >
        {selecting ? <Loader2 size={12} className="animate-spin" /> : isActive ? "Active" : "Select Provider"}
      </button>
    </div>
  );
}

function BlueprintExpansion({ blueprintId, onProviderSelected }: { blueprintId: number; onProviderSelected: () => void }) {
  const [detail, setDetail] = useState<BlueprintDetail | null>(null);
  const [activeProviderId, setActiveProviderId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    void crud
      .get(blueprintId)
      .then((row) => {
        const blueprintDetail = row as unknown as BlueprintDetail;
        setDetail(blueprintDetail);
        // A provider is only ever "active" relative to the template it's mapped through — the
        // blueprint itself doesn't know which one is selected, so this needs a second lookup
        // against the mapped template (if any).
        if (blueprintDetail.mockup_template) {
          void templateCrud
            .get(blueprintDetail.mockup_template)
            .then((template) => setActiveProviderId(template.selected_print_provider));
        } else {
          setActiveProviderId(null);
        }
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load providers."));
  };

  useEffect(load, [blueprintId]);

  if (error) return <div className="px-4 py-4 text-xs text-neon-pink">{error}</div>;
  if (!detail) {
    return (
      <div className="flex justify-center px-4 py-6 text-gray-500">
        <Loader2 size={16} className="animate-spin" />
      </div>
    );
  }

  const catalogImages = (detail.images ?? []).filter((img): img is string => typeof img === "string");

  return (
    <div>
      {catalogImages.length > 0 && (
        <div className="border-b border-white/10 px-4 py-3">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
            Catalog Images ({catalogImages.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {catalogImages.map((url, index) => (
              <a
                key={url + index}
                href={url}
                target="_blank"
                rel="noreferrer"
                title="Open full size"
                className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10 hover:border-neon-blue/50"
              >
                <img src={url} alt="" className="h-full w-full object-cover" />
              </a>
            ))}
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-gray-500">
            Printify's own catalogue photos for this blueprint — reference only, not necessarily a
            clean flat product shot. You can also pick one of these directly as a Mockup Template
            part's Base Image, on the part's Base Image field.
          </p>
        </div>
      )}

      {!detail.mockup_template && (
        <div className="px-4 py-3 text-[10px] text-gray-500">
          Map this blueprint to a mockup template (via the Map action) before you can select a provider for it.
        </div>
      )}
      {detail.print_providers.length === 0 ? (
        <div className="px-4 py-4 text-xs text-gray-500">No providers synced yet — use the sync action above.</div>
      ) : (
        detail.print_providers.map((provider) => (
          <ProviderRow
            key={provider.id}
            provider={provider}
            blueprintTemplateId={detail.mockup_template}
            isActive={provider.id === activeProviderId}
            onSelected={() => {
              load();
              onProviderSelected();
            }}
          />
        ))
      )}
    </div>
  );
}

function MapBlueprintForm({ blueprint, onDone }: { blueprint: BlueprintRow; onDone: () => void }) {
  const toast = useToast();
  const [templates, setTemplates] = useState<{ id: number; name: string }[]>([]);
  const [selected, setSelected] = useState<string>(blueprint.mockup_template ? String(blueprint.mockup_template) : "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void templateCrud.list({ page_size: 200 }).then((result) => setTemplates(result.results));
  }, []);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await adminAction(`/printify/blueprints/${blueprint.id}/map/`, {
        mockup_template_id: selected === "" ? null : Number(selected),
      });
      toast.success(selected === "" ? "Blueprint unmapped." : "Blueprint mapping saved.");
      onDone();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Mapping failed.";
      setError(message);
      toast.error(message, { title: "Mapping failed" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <select
        value={selected}
        onChange={(event) => setSelected(event.target.value)}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-neon-purple/50 focus:outline-none"
      >
        <option value="" style={{ backgroundColor: "#121212", color: "#ffffff" }}>
          — Unmapped —
        </option>
        {templates.map((template) => (
          <option key={template.id} value={template.id} style={{ backgroundColor: "#121212", color: "#ffffff" }}>
            {template.name}
          </option>
        ))}
      </select>
      {error && (
        <div className="rounded-xl border border-neon-pink/30 bg-neon-pink/10 px-3 py-2 text-xs text-neon-pink">{error}</div>
      )}
      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={submitting}
        className="flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-black uppercase tracking-widest text-cyber-black hover:bg-neon-purple hover:text-white disabled:opacity-60"
      >
        {submitting && <Loader2 size={14} className="animate-spin" />}
        Save Mapping
      </button>
    </div>
  );
}

export function PrintifyBlueprintsPage() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mappingBlueprint, setMappingBlueprint] = useState<BlueprintRow | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [pendingProviderSync, setPendingProviderSync] = useState<number | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const titleFilter = searchParams.get("title") ?? "";
  const brand = searchParams.get("brand") ?? "";
  const providerLocation = searchParams.get("provider_location") ?? "";
  const isMapped = searchParams.get("is_mapped") ?? "";
  const ordering = searchParams.get("ordering") ?? "";

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const syncBlueprints = async () => {
    setSyncing(true);
    try {
      await adminAction("/printify/sync-blueprints/");
      toast.success("Blueprints synced from Printify.");
      setRefreshKey((key) => key + 1);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Sync failed.", { title: "Sync failed" });
    } finally {
      setSyncing(false);
    }
  };

  const syncProviders = async (blueprintId: number, refresh: () => void) => {
    setPendingProviderSync(blueprintId);
    try {
      await adminAction(`/printify/blueprints/${blueprintId}/sync-providers/`);
      toast.success("Print providers synced.");
      refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Provider sync failed.", {
        title: "Provider sync failed",
      });
    } finally {
      setPendingProviderSync(null);
    }
  };

  const selectClass =
    "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:border-neon-purple/50 focus:outline-none";
  const optionStyle = { backgroundColor: "#121212", color: "#ffffff" };

  return (
    <>
      <ConnectionStatusCard />

      <AdminResourceTable
        key={refreshKey}
        title="Printify Blueprints"
        crud={crud}
        searchable
        searchPlaceholder="Search title, brand, model…"
        extraListParams={{
          title: titleFilter || undefined,
          brand: brand || undefined,
          provider_location: providerLocation || undefined,
          is_mapped: isMapped || undefined,
          ordering: ordering || undefined,
        }}
        filtersNode={
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={titleFilter}
              onChange={(event) => setFilter("title", event.target.value)}
              placeholder="Filter by title only"
              title="Narrows to this title specifically — the search box above already covers title, brand, and model together"
              className={cn(selectClass, "w-44 placeholder:text-gray-600")}
            />
            <input
              type="text"
              value={brand}
              onChange={(event) => setFilter("brand", event.target.value)}
              placeholder="Filter by brand only"
              title="Narrows to this brand specifically — the search box above already covers title, brand, and model together"
              className={cn(selectClass, "w-44 placeholder:text-gray-600")}
            />
            <input
              type="text"
              value={providerLocation}
              onChange={(event) => setFilter("provider_location", event.target.value)}
              placeholder="Provider location (city, region, country)"
              title="Matches blueprints with at least one print provider in this location"
              className={cn(selectClass, "w-64 placeholder:text-gray-600")}
            />
            <select value={isMapped} onChange={(event) => setFilter("is_mapped", event.target.value)} className={selectClass}>
              <option value="" style={optionStyle}>All Blueprints</option>
              <option value="true" style={optionStyle}>Mapped</option>
              <option value="false" style={optionStyle}>Unmapped</option>
            </select>
            <select value={ordering} onChange={(event) => setFilter("ordering", event.target.value)} className={selectClass}>
              <option value="" style={optionStyle}>Title (A–Z)</option>
              <option value="-title" style={optionStyle}>Title (Z–A)</option>
              <option value="brand" style={optionStyle}>Brand (A–Z)</option>
              <option value="-brand" style={optionStyle}>Brand (Z–A)</option>
              <option value="newest" style={optionStyle}>Newest Synced</option>
              <option value="oldest" style={optionStyle}>Oldest Synced</option>
              <option value="-provider_count" style={optionStyle}>Most Providers</option>
            </select>
          </div>
        }
        columns={[
          {
            key: "expand",
            label: "",
            render: (row) => (
              <button
                type="button"
                onClick={() => setExpandedRowId(expandedRowId === row.id ? null : row.id)}
                aria-label="Inspect providers"
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-300 hover:text-white"
              >
                {expandedRowId === row.id ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              </button>
            ),
          },
          { key: "id", label: "ID" },
          { key: "title", label: "Title" },
          { key: "brand", label: "Brand" },
          { key: "provider_count", label: "Providers" },
          { key: "is_mapped", label: "Mapped", render: (row) => (row.is_mapped ? "Yes" : "No") },
        ]}
        expandedRowId={expandedRowId}
        renderExpandedContent={(row) => (
          <div className="border-t border-white/10 bg-white/2">
            <div className="border-b border-white/10 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Providers for &ldquo;{row.title}&rdquo;
            </div>
            <BlueprintExpansion blueprintId={row.id} onProviderSelected={() => setRefreshKey((key) => key + 1)} />
          </div>
        )}
        extraHeaderActions={
          <button
            type="button"
            onClick={() => void syncBlueprints()}
            disabled={syncing}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-300 hover:text-white disabled:opacity-60"
          >
            {syncing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            Sync Blueprints
          </button>
        }
        extraRowActions={(row, refresh) => (
          <>
            <button
              type="button"
              onClick={() => void syncProviders(row.id, refresh)}
              disabled={pendingProviderSync === row.id}
              aria-label="Sync print providers"
              title="Sync print providers"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-300 hover:text-white disabled:opacity-50"
            >
              {pendingProviderSync === row.id ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            </button>
            <button
              type="button"
              onClick={() => setMappingBlueprint(row)}
              aria-label="Map to mockup template"
              title="Map to mockup template"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-300 hover:text-white"
            >
              <Link2 size={13} />
            </button>
          </>
        )}
      />

      <AdminModal
        isOpen={mappingBlueprint !== null}
        onClose={() => setMappingBlueprint(null)}
        title={mappingBlueprint ? `Map "${mappingBlueprint.title}"` : "Map Blueprint"}
      >
        {mappingBlueprint && (
          <MapBlueprintForm
            blueprint={mappingBlueprint}
            onDone={() => {
              setMappingBlueprint(null);
              setRefreshKey((key) => key + 1);
            }}
          />
        )}
      </AdminModal>
    </>
  );
}
