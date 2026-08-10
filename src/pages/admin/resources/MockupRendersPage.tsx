/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AdminResourceTable } from "../../../components/admin/AdminResourceTable.tsx";
import { makeAdminCrud } from "../../../lib/adminApi.ts";

interface MockupRenderRow {
  id: number;
  user: { id: number; username: string } | null;
  template: number;
  part_name: string;
  variant_color: string;
  variant_size: string;
  status: string;
  error_message: string;
  created_at: string;
}

const crud = makeAdminCrud<MockupRenderRow>("/generator/admin/mockup-renders");

export function MockupRendersPage() {
  return (
    <AdminResourceTable
      title="Mockup Renders"
      crud={crud}
      searchable={false}
      columns={[
        { key: "id", label: "ID" },
        { key: "user", label: "User", render: (row) => row.user?.username ?? "—" },
        { key: "part_name", label: "Part" },
        { key: "variant_color", label: "Color" },
        { key: "variant_size", label: "Size" },
        { key: "status", label: "Status" },
        { key: "created_at", label: "Created", render: (row) => new Date(row.created_at).toLocaleString() },
      ]}
    />
  );
}
