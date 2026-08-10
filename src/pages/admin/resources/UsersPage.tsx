/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AdminResourceTable } from "../../../components/admin/AdminResourceTable.tsx";
import type { AdminFieldSchema } from "../../../components/admin/AdminResourceForm.tsx";
import { makeAdminCrud } from "../../../lib/adminApi.ts";

interface UserRow {
  id: number;
  username: string;
  email: string;
  display_name: string;
  is_artist: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  is_active: boolean;
  date_joined: string;
}

const crud = makeAdminCrud<UserRow>("/auth/admin/users");

const formFields: AdminFieldSchema[] = [
  { name: "username", label: "Username", type: "text", readOnly: true },
  { name: "email", label: "Email", type: "text", readOnly: true },
  { name: "is_active", label: "Active Account", type: "boolean" },
  { name: "is_artist", label: "Artist", type: "boolean" },
  { name: "is_staff", label: "Staff (dev tools access)", type: "boolean" },
  {
    name: "is_superuser",
    label: "Superuser (full admin panel access)",
    type: "boolean",
    helpText: "Grants access to this entire admin panel — grant carefully.",
  },
];

export function UsersPage() {
  return (
    <AdminResourceTable
      title="Users"
      crud={crud}
      searchPlaceholder="Search username/email/name…"
      columns={[
        { key: "id", label: "ID" },
        { key: "username", label: "Username" },
        { key: "email", label: "Email" },
        { key: "is_staff", label: "Staff", render: (row) => (row.is_staff ? "Yes" : "No") },
        { key: "is_superuser", label: "Superuser", render: (row) => (row.is_superuser ? "Yes" : "No") },
        { key: "is_active", label: "Active", render: (row) => (row.is_active ? "Yes" : "No") },
      ]}
      formFields={formFields}
      deletable={false}
    />
  );
}
