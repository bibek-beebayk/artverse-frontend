/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AdminResourceTable } from "../../../components/admin/AdminResourceTable.tsx";
import { makeAdminCrud } from "../../../lib/adminApi.ts";

interface GenerationRequestRow {
  id: number;
  user: { id: number; username: string } | null;
  prompt: string;
  style: string;
  provider: string;
  status: string;
  error_message: string;
  created_at: string;
}

const crud = makeAdminCrud<GenerationRequestRow>("/generator/admin/generation-requests");

export function GenerationRequestsPage() {
  return (
    <AdminResourceTable
      title="Generation Requests"
      crud={crud}
      searchable={false}
      columns={[
        { key: "id", label: "ID" },
        { key: "user", label: "User", render: (row) => row.user?.username ?? "—" },
        { key: "prompt", label: "Prompt", render: (row) => (row.prompt.length > 60 ? `${row.prompt.slice(0, 60)}…` : row.prompt) },
        { key: "provider", label: "Provider" },
        { key: "status", label: "Status" },
        { key: "created_at", label: "Created", render: (row) => new Date(row.created_at).toLocaleString() },
      ]}
    />
  );
}
