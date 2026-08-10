/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AdminResourceTable } from "../../../components/admin/AdminResourceTable.tsx";
import { makeAdminCrud } from "../../../lib/adminApi.ts";

interface GeneratedPrintFileRow {
  id: number;
  design_placement: number;
  template_part: number;
  width: number;
  height: number;
  dpi: number;
  status: string;
  error_message: string;
  created_at: string;
}

const crud = makeAdminCrud<GeneratedPrintFileRow>("/generator/admin/generated-print-files");

export function GeneratedPrintFilesPage() {
  return (
    <AdminResourceTable
      title="Generated Print Files"
      crud={crud}
      searchable={false}
      columns={[
        { key: "id", label: "ID" },
        { key: "design_placement", label: "Placement ID" },
        { key: "width", label: "Width" },
        { key: "height", label: "Height" },
        { key: "dpi", label: "DPI" },
        { key: "status", label: "Status" },
        { key: "created_at", label: "Created", render: (row) => new Date(row.created_at).toLocaleString() },
      ]}
    />
  );
}
