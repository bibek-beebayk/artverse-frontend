/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AdminResourceTable } from "../../../components/admin/AdminResourceTable.tsx";
import { makeAdminCrud } from "../../../lib/adminApi.ts";

interface GalleryCategoryRow {
  id: number;
  name: string;
  slug: string;
}

const crud = makeAdminCrud<GalleryCategoryRow>("/gallery/admin/categories");

export function GalleryCategoriesPage() {
  return (
    <AdminResourceTable
      title="Gallery Categories"
      crud={crud}
      searchable={false}
      columns={[
        { key: "id", label: "ID" },
        { key: "name", label: "Name" },
        { key: "slug", label: "Slug" },
      ]}
      formFields={[
        { name: "name", label: "Name", type: "text", required: true },
        { name: "slug", label: "Slug", type: "text", required: true },
      ]}
    />
  );
}
