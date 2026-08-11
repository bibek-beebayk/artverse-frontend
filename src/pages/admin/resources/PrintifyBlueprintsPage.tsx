/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Link2, Loader2, RefreshCw, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { AdminResourceTable } from "../../../components/admin/AdminResourceTable.tsx";
import { AdminModal } from "../../../components/admin/AdminModal.tsx";
import { useAdminDialog } from "../../../components/admin/AdminDialogProvider.tsx";
import { adminAction, makeAdminCrud } from "../../../lib/adminApi.ts";
import { ApiError, requestJson } from "../../../lib/api.ts";
import { cn } from "../../../lib/utils.ts";

interface BlueprintRow {
  id: number;
  blueprint_id: number;
  title: string;
  brand: string;
  model: string;
  mockup_template: number | null;
  is_mapped: boolean;
  provider_count: number;
  synced_at: string;
}

interface PrintProvider {
  id: number;
  provider_id: number;
  title: string;
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
  onSelected,
}: {
  provider: PrintProvider;
  blueprintTemplateId: number | null;
  onSelected: () => void;
}) {
  const dialog = useAdminDialog();
  const [selecting, setSelecting] = useState(false);

  const selectProvider = async () => {
    if (!blueprintTemplateId) return;
    setSelecting(true);
    try {
      await templateCrud.update(blueprintTemplateId, { selected_print_provider: provider.id } as never);
      onSelected();
    } catch (err) {
      await dialog.alert(err instanceof ApiError ? err.message : "Could not select this provider.", {
        title: "Selection failed",
      });
    } finally {
      setSelecting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-3 border-b border-white/5 px-4 py-3 last:border-0 sm:grid-cols-[1.5fr_1fr_1fr_1fr_1.5fr_auto] sm:items-center">
      <div>
        <div className="text-xs font-bold text-white">{provider.title}</div>
        <div className="text-[10px] text-gray-500">Provider #{provider.provider_id}</div>
      </div>
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
        disabled={selecting || !blueprintTemplateId}
        title={blueprintTemplateId ? "Select this provider for the mapped template" : "Map a mockup template to this blueprint first"}
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-gray-200 hover:text-neon-blue disabled:opacity-40"
      >
        {selecting ? <Loader2 size={12} className="animate-spin" /> : "Select Provider"}
      </button>
    </div>
  );
}

function BlueprintExpansion({ blueprintId, onProviderSelected }: { blueprintId: number; onProviderSelected: () => void }) {
  const [detail, setDetail] = useState<BlueprintDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    void crud
      .get(blueprintId)
      .then((row) => setDetail(row as unknown as BlueprintDetail))
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

  return (
    <div className="border-t border-white/10 bg-white/2">
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
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Mapping failed.");
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
  const dialog = useAdminDialog();
  const [mappingBlueprint, setMappingBlueprint] = useState<BlueprintRow | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [pendingProviderSync, setPendingProviderSync] = useState<number | null>(null);
  const [expandedRow, setExpandedRow] = useState<BlueprintRow | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const syncBlueprints = async () => {
    setSyncing(true);
    try {
      await adminAction("/printify/sync-blueprints/");
      setRefreshKey((key) => key + 1);
    } catch (err) {
      await dialog.alert(err instanceof ApiError ? err.message : "Sync failed.", { title: "Sync failed" });
    } finally {
      setSyncing(false);
    }
  };

  const syncProviders = async (blueprintId: number, refresh: () => void) => {
    setPendingProviderSync(blueprintId);
    try {
      await adminAction(`/printify/blueprints/${blueprintId}/sync-providers/`);
      refresh();
    } catch (err) {
      await dialog.alert(err instanceof ApiError ? err.message : "Provider sync failed.", {
        title: "Provider sync failed",
      });
    } finally {
      setPendingProviderSync(null);
    }
  };

  return (
    <>
      <ConnectionStatusCard />

      <AdminResourceTable
        key={refreshKey}
        title="Printify Blueprints"
        crud={crud}
        searchable={false}
        columns={[
          {
            key: "expand",
            label: "",
            render: (row) => (
              <button
                type="button"
                onClick={() => setExpandedRow(expandedRow?.id === row.id ? null : row)}
                aria-label="Inspect providers"
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-300 hover:text-white"
              >
                {expandedRow?.id === row.id ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              </button>
            ),
          },
          { key: "id", label: "ID" },
          { key: "title", label: "Title" },
          { key: "brand", label: "Brand" },
          { key: "provider_count", label: "Providers" },
          { key: "is_mapped", label: "Mapped", render: (row) => (row.is_mapped ? "Yes" : "No") },
        ]}
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

      {expandedRow !== null && (
        <div className="glass-card -mt-4 border-white/10 p-0">
          <div className="border-b border-white/10 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
            Providers for &ldquo;{expandedRow.title}&rdquo;
          </div>
          <BlueprintExpansion blueprintId={expandedRow.id} onProviderSelected={() => setRefreshKey((key) => key + 1)} />
        </div>
      )}

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
