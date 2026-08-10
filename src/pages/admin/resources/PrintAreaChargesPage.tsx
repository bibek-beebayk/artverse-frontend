/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AdminResourceTable } from "../../../components/admin/AdminResourceTable.tsx";
import { makeAdminCrud } from "../../../lib/adminApi.ts";

interface PrintAreaChargeRow {
  id: number;
  part_name: string;
  amount: string;
  currency: string;
  is_active: boolean;
}

const crud = makeAdminCrud<PrintAreaChargeRow>("/cart/admin/print-area-charges");

export function PrintAreaChargesPage() {
  return (
    <AdminResourceTable
      title="Print Area Charges"
      crud={crud}
      searchable={false}
      columns={[
        { key: "part_name", label: "Part" },
        { key: "amount", label: "Amount" },
        { key: "currency", label: "Currency" },
        { key: "is_active", label: "Active", render: (row) => (row.is_active ? "Yes" : "No") },
      ]}
      formFields={[
        {
          name: "part_name",
          label: "Part Name",
          type: "text",
          required: true,
          helpText: "e.g. front, back, left_sleeve, right_sleeve.",
        },
        { name: "amount", label: "Amount", type: "decimal", required: true },
        { name: "currency", label: "Currency", type: "text", required: true },
        { name: "is_active", label: "Active", type: "boolean" },
      ]}
    />
  );
}
