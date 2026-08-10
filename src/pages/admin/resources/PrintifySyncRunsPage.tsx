/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AdminResourceTable } from "../../../components/admin/AdminResourceTable.tsx";
import { makeAdminCrud } from "../../../lib/adminApi.ts";

interface SyncRunRow {
  id: number;
  kind: string;
  status: string;
  blueprint: number | null;
  blueprints_synced: number;
  providers_synced: number;
  variants_synced: number;
  error_message: string;
  started_at: string;
  finished_at: string | null;
}

const crud = makeAdminCrud<SyncRunRow>("/printify/sync-runs");

export function PrintifySyncRunsPage() {
  return (
    <AdminResourceTable
      title="Printify Sync Runs"
      crud={crud}
      searchable={false}
      columns={[
        { key: "id", label: "ID" },
        { key: "kind", label: "Kind" },
        { key: "status", label: "Status" },
        { key: "blueprints_synced", label: "Blueprints" },
        { key: "providers_synced", label: "Providers" },
        { key: "variants_synced", label: "Variants" },
        { key: "started_at", label: "Started", render: (row) => new Date(row.started_at).toLocaleString() },
      ]}
    />
  );
}
