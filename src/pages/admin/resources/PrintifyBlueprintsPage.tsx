/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";
import { Link2, Loader2, RefreshCw } from "lucide-react";
import { AdminResourceTable } from "../../../components/admin/AdminResourceTable.tsx";
import { AdminModal } from "../../../components/admin/AdminModal.tsx";
import { adminAction, makeAdminCrud } from "../../../lib/adminApi.ts";
import { ApiError } from "../../../lib/api.ts";

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

const crud = makeAdminCrud<BlueprintRow>("/printify/blueprints");
const templateCrud = makeAdminCrud<{ id: number; name: string }>("/generator/admin/mockup-templates");

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
  const [mappingBlueprint, setMappingBlueprint] = useState<BlueprintRow | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [pendingProviderSync, setPendingProviderSync] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const syncBlueprints = async () => {
    setSyncing(true);
    try {
      await adminAction("/printify/sync-blueprints/");
      setRefreshKey((key) => key + 1);
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : "Sync failed.");
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
      window.alert(err instanceof ApiError ? err.message : "Provider sync failed.");
    } finally {
      setPendingProviderSync(null);
    }
  };

  return (
    <>
      <AdminResourceTable
        key={refreshKey}
        title="Printify Blueprints"
        crud={crud}
        searchable={false}
        columns={[
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
