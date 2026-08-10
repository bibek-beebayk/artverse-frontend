/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AdminResourceTable } from "../../../components/admin/AdminResourceTable.tsx";
import { makeAdminCrud } from "../../../lib/adminApi.ts";

interface NotificationSubscriptionRow {
  id: number;
  product: number;
  email: string;
  created_at: string;
}

const crud = makeAdminCrud<NotificationSubscriptionRow>("/shop/admin/notification-subscriptions");

export function NotificationSubscriptionsPage() {
  return (
    <AdminResourceTable
      title="Notification Subscriptions"
      crud={crud}
      searchable={false}
      deletable
      columns={[
        { key: "id", label: "ID" },
        { key: "email", label: "Email" },
        { key: "product", label: "Product ID" },
        { key: "created_at", label: "Requested", render: (row) => new Date(row.created_at).toLocaleString() },
      ]}
    />
  );
}
