/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AdminResourceTable } from "../../../components/admin/AdminResourceTable.tsx";
import { makeAdminCrud } from "../../../lib/adminApi.ts";

interface CollectionRow {
  id: number;
  name: string;
  slug: string;
  description: string;
}

const crud = makeAdminCrud<CollectionRow>("/gallery/admin/collections");

export function CollectionsPage() {
  return (
    <AdminResourceTable
      title="Collections"
      crud={crud}
      searchable={false}
      columns={[
        { key: "id", label: "ID" },
        { key: "name", label: "Name" },
        { key: "slug", label: "Slug" },
      ]}
      formFields={[
        { name: "name", label: "Name", type: "text", required: true },
        { name: "slug", label: "Slug", type: "text", helpText: "Optional — leave blank to auto-generate a unique slug from the name." },
        { name: "description", label: "Description", type: "textarea" },
      ]}
    />
  );
}
