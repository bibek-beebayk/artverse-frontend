/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AdminSingletonForm } from "../../../components/admin/AdminSingletonForm.tsx";
import type { AdminFieldSchema } from "../../../components/admin/AdminResourceForm.tsx";

const fields: AdminFieldSchema[] = [
  { name: "currency", label: "Currency", type: "text", required: true },
  { name: "tax_percentage", label: "Tax Percentage", type: "decimal" },
  { name: "flat_shipping_amount", label: "Flat Shipping Amount", type: "decimal" },
  {
    name: "free_shipping_threshold",
    label: "Free Shipping Threshold",
    type: "decimal",
    helpText: "Post-discount subtotal at/above which shipping is waived. Leave blank for no free-shipping offer.",
  },
];

export function PricingConfigurationPage() {
  return <AdminSingletonForm title="Pricing Configuration" path="/cart/admin/pricing-configuration/" fields={fields} />;
}
