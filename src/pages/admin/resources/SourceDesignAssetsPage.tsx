/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AdminResourceTable } from "../../../components/admin/AdminResourceTable.tsx";
import { makeAdminCrud } from "../../../lib/adminApi.ts";

interface SourceDesignAssetRow {
  id: number;
  owner: { id: number; username: string } | null;
  source_type: string;
  title: string;
  width: number | null;
  height: number | null;
  created_at: string;
}

const crud = makeAdminCrud<SourceDesignAssetRow>("/generator/admin/source-design-assets");

export function SourceDesignAssetsPage() {
  return (
    <AdminResourceTable
      title="Source Design Assets"
      crud={crud}
      searchable={false}
      columns={[
        { key: "id", label: "ID" },
        { key: "title", label: "Title", render: (row) => row.title || "—" },
        { key: "owner", label: "Owner", render: (row) => row.owner?.username ?? "Gallery" },
        { key: "source_type", label: "Source" },
        { key: "created_at", label: "Created", render: (row) => new Date(row.created_at).toLocaleString() },
      ]}
    />
  );
}
