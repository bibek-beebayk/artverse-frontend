/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";
import { AdminResourceTable } from "../../../components/admin/AdminResourceTable.tsx";
import type { AdminFieldSchema, AdminSelectOption } from "../../../components/admin/AdminResourceForm.tsx";
import { makeAdminCrud } from "../../../lib/adminApi.ts";

interface PricingRuleRow {
  id: number;
  name: string;
  rule_type: string;
  markup_type: string;
  amount: string;
  category: number | null;
  product: number | null;
  currency: string;
  priority: number;
  is_active: boolean;
}

const crud = makeAdminCrud<PricingRuleRow>("/cart/admin/pricing-rules");
const categoryCrud = makeAdminCrud<{ id: number; name: string }>("/shop/admin/categories");
const productCrud = makeAdminCrud<{ id: number; name: string }>("/shop/admin/products");

export function PricingRulesPage() {
  const [categoryOptions, setCategoryOptions] = useState<AdminSelectOption[]>([]);
  const [productOptions, setProductOptions] = useState<AdminSelectOption[]>([]);

  useEffect(() => {
    void categoryCrud.list().then((result) => {
      setCategoryOptions(result.results.map((item) => ({ value: item.id, label: item.name })));
    });
    void productCrud.list({ page_size: 200 }).then((result) => {
      setProductOptions(result.results.map((item) => ({ value: item.id, label: item.name })));
    });
  }, []);

  const formFields: AdminFieldSchema[] = [
    { name: "name", label: "Name", type: "text", required: true },
    {
      name: "rule_type",
      label: "Rule Type",
      type: "select",
      required: true,
      options: [
        { value: "global", label: "Global (all products)" },
        { value: "category", label: "Category" },
        { value: "product", label: "Product-specific" },
      ],
    },
    {
      name: "markup_type",
      label: "Markup Type",
      type: "select",
      required: true,
      options: [
        { value: "fixed", label: "Fixed amount" },
        { value: "percentage", label: "Percentage" },
      ],
    },
    {
      name: "amount",
      label: "Amount",
      type: "decimal",
      required: true,
      helpText: "Flat currency amount if markup_type=fixed, or percentage points (15 = 15%) if markup_type=percentage.",
    },
    { name: "category", label: "Category (if rule type = category)", type: "select", options: categoryOptions },
    { name: "product", label: "Product (if rule type = product)", type: "select", options: productOptions },
    { name: "currency", label: "Currency", type: "text", required: true },
    { name: "priority", label: "Priority", type: "number", helpText: "Tie-breaker among same-type rules; higher wins." },
    { name: "is_active", label: "Active", type: "boolean" },
  ];

  return (
    <AdminResourceTable
      title="Pricing Rules"
      crud={crud}
      searchable={false}
      columns={[
        { key: "name", label: "Name" },
        { key: "rule_type", label: "Type" },
        { key: "markup_type", label: "Markup" },
        { key: "amount", label: "Amount" },
        { key: "priority", label: "Priority" },
        { key: "is_active", label: "Active", render: (row) => (row.is_active ? "Yes" : "No") },
      ]}
      formFields={formFields}
    />
  );
}
