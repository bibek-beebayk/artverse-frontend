/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AdminSingletonForm } from "../../../components/admin/AdminSingletonForm.tsx";
import type { AdminFieldSchema } from "../../../components/admin/AdminResourceForm.tsx";

const fields: AdminFieldSchema[] = [
  { name: "maintenance_mode", label: "Maintenance Mode", type: "boolean" },
  {
    name: "maintenance_access_key",
    label: "Maintenance Access Key",
    type: "text",
    helpText: "Shared secret that lets a visitor bypass maintenance mode.",
  },
  { name: "maintenance_message", label: "Maintenance Message", type: "textarea" },
];

export function SiteConfigurationPage() {
  return <AdminSingletonForm title="Site Configuration" path="/auth/admin/site-configuration/" fields={fields} />;
}
