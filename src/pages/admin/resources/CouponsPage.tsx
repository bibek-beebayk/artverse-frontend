/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AdminResourceTable } from "../../../components/admin/AdminResourceTable.tsx";
import { makeAdminCrud } from "../../../lib/adminApi.ts";

interface CouponRow {
  id: number;
  code: string;
  discount_type: string;
  amount: string;
  currency: string;
  is_active: boolean;
  times_redeemed: number;
  max_redemptions: number | null;
}

const crud = makeAdminCrud<CouponRow>("/cart/admin/coupons");

export function CouponsPage() {
  return (
    <AdminResourceTable
      title="Coupons"
      crud={crud}
      searchable={false}
      columns={[
        { key: "code", label: "Code" },
        { key: "discount_type", label: "Type" },
        { key: "amount", label: "Amount" },
        { key: "times_redeemed", label: "Redeemed" },
        { key: "is_active", label: "Active", render: (row) => (row.is_active ? "Yes" : "No") },
      ]}
      formFields={[
        { name: "code", label: "Code", type: "text", required: true },
        {
          name: "discount_type",
          label: "Discount Type",
          type: "select",
          required: true,
          options: [
            { value: "fixed", label: "Fixed amount off" },
            { value: "percentage", label: "Percentage off" },
          ],
        },
        { name: "amount", label: "Amount", type: "decimal", required: true },
        { name: "currency", label: "Currency", type: "text", required: true },
        { name: "starts_at", label: "Starts At", type: "datetime" },
        { name: "ends_at", label: "Ends At", type: "datetime" },
        { name: "min_subtotal", label: "Minimum Subtotal", type: "decimal" },
        { name: "max_redemptions", label: "Max Redemptions (total)", type: "number", helpText: "Blank means unlimited." },
        { name: "max_redemptions_per_user", label: "Max Redemptions Per User", type: "number" },
        { name: "is_active", label: "Active", type: "boolean" },
      ]}
    />
  );
}
