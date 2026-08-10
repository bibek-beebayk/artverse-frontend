/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AdminResourceTable } from "../../../components/admin/AdminResourceTable.tsx";
import { makeAdminCrud } from "../../../lib/adminApi.ts";

interface CartRow {
  id: number;
  user: { id: number; username: string } | null;
  currency: string;
  coupon_code: string | null;
  item_count: number;
  updated_at: string;
}

const crud = makeAdminCrud<CartRow>("/cart/admin/carts");

export function CartsPage() {
  return (
    <AdminResourceTable
      title="Carts"
      crud={crud}
      searchable={false}
      columns={[
        { key: "id", label: "ID" },
        { key: "user", label: "User", render: (row) => row.user?.username ?? "—" },
        { key: "item_count", label: "Items" },
        { key: "coupon_code", label: "Coupon", render: (row) => row.coupon_code ?? "—" },
        { key: "updated_at", label: "Updated", render: (row) => new Date(row.updated_at).toLocaleString() },
      ]}
    />
  );
}
