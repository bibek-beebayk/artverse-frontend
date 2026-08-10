/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";
import { AdminResourceTable } from "../../../components/admin/AdminResourceTable.tsx";
import type { AdminFieldSchema, AdminSelectOption } from "../../../components/admin/AdminResourceForm.tsx";
import { makeAdminCrud } from "../../../lib/adminApi.ts";

interface ProductVariantRow {
  id: number;
  product: number;
  template: number;
  sku: string;
  name: string;
  color_name: string;
  size: string;
  base_cost: string | null;
  inventory: number | null;
  is_available: boolean;
}

const crud = makeAdminCrud<ProductVariantRow>("/generator/admin/product-variants");
const productCrud = makeAdminCrud<{ id: number; name: string }>("/shop/admin/products");
const templateCrud = makeAdminCrud<{ id: number; name: string }>("/generator/admin/mockup-templates");

export function ProductVariantsPage() {
  const [productOptions, setProductOptions] = useState<AdminSelectOption[]>([]);
  const [templateOptions, setTemplateOptions] = useState<AdminSelectOption[]>([]);

  useEffect(() => {
    void productCrud.list({ page_size: 200 }).then((result) => {
      setProductOptions(result.results.map((item) => ({ value: item.id, label: item.name })));
    });
    void templateCrud.list({ page_size: 200 }).then((result) => {
      setTemplateOptions(result.results.map((item) => ({ value: item.id, label: item.name })));
    });
  }, []);

  const formFields: AdminFieldSchema[] = [
    { name: "product", label: "Product", type: "select", required: true, options: productOptions },
    { name: "template", label: "Mockup Template", type: "select", required: true, options: templateOptions },
    { name: "sku", label: "SKU", type: "text" },
    { name: "name", label: "Display Name", type: "text", helpText: "e.g. Midnight Black / M." },
    { name: "color_name", label: "Color Name", type: "text" },
    { name: "color_hex", label: "Color Hex", type: "text", placeholder: "#1a1a1a" },
    { name: "size", label: "Size", type: "text" },
    { name: "base_cost", label: "Base Cost", type: "decimal" },
    { name: "retail_price", label: "Retail Price (display only)", type: "decimal" },
    { name: "inventory", label: "Inventory", type: "number" },
    { name: "is_available", label: "Available", type: "boolean" },
    { name: "external_provider", label: "External Provider", type: "text" },
    { name: "external_variant_id", label: "External Variant ID", type: "text" },
    { name: "image", label: "Image", type: "image" },
  ];

  return (
    <AdminResourceTable
      title="Product Variants"
      crud={crud}
      searchable={false}
      columns={[
        { key: "id", label: "ID" },
        { key: "name", label: "Name" },
        { key: "color_name", label: "Color" },
        { key: "size", label: "Size" },
        { key: "base_cost", label: "Base Cost" },
        { key: "is_available", label: "Available", render: (row) => (row.is_available ? "Yes" : "No") },
      ]}
      formFields={formFields}
    />
  );
}
