/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AdminResourceTable } from "../../../components/admin/AdminResourceTable.tsx";
import { makeAdminCrud } from "../../../lib/adminApi.ts";

interface DesignProjectRow {
  id: number;
  user: { id: number; username: string } | null;
  name: string;
  status: string;
  product_name: string | null;
  mockup_template_name: string;
  selected_color: string;
  selected_size: string;
  created_at: string;
  updated_at: string;
}

const crud = makeAdminCrud<DesignProjectRow>("/generator/admin/design-projects");

export function DesignProjectsPage() {
  return (
    <AdminResourceTable
      title="Design Projects"
      crud={crud}
      searchable={false}
      columns={[
        { key: "id", label: "ID" },
        { key: "name", label: "Name" },
        { key: "user", label: "Owner", render: (row) => row.user?.username ?? "—" },
        { key: "product_name", label: "Product", render: (row) => row.product_name ?? "—" },
        { key: "status", label: "Status" },
        { key: "updated_at", label: "Updated", render: (row) => new Date(row.updated_at).toLocaleString() },
      ]}
    />
  );
}
