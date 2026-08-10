/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AdminResourceTable } from "../../../components/admin/AdminResourceTable.tsx";
import { makeAdminCrud } from "../../../lib/adminApi.ts";

interface GeneratedImageRow {
  id: number;
  user: { id: number; username: string } | null;
  prompt: string;
  created_at: string;
}

const crud = makeAdminCrud<GeneratedImageRow>("/generator/admin/generated-images");

export function GeneratedImagesPage() {
  return (
    <AdminResourceTable
      title="Generated Images"
      crud={crud}
      searchable={false}
      columns={[
        { key: "id", label: "ID" },
        { key: "user", label: "User", render: (row) => row.user?.username ?? "—" },
        { key: "prompt", label: "Prompt", render: (row) => (row.prompt.length > 60 ? `${row.prompt.slice(0, 60)}…` : row.prompt) },
        { key: "created_at", label: "Created", render: (row) => new Date(row.created_at).toLocaleString() },
      ]}
    />
  );
}
