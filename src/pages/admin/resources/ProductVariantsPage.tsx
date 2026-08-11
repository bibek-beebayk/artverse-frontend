/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle } from "lucide-react";
import { AdminResourceTable } from "../../../components/admin/AdminResourceTable.tsx";
import type { AdminFieldSchema, AdminSelectOption } from "../../../components/admin/AdminResourceForm.tsx";
import { useAdminDialog } from "../../../components/admin/AdminDialogProvider.tsx";
import { useToast } from "../../../components/admin/ToastProvider.tsx";
import { adminAction, makeAdminCrud } from "../../../lib/adminApi.ts";
import { ApiError } from "../../../lib/api.ts";
import { cn } from "../../../lib/utils.ts";

type ReadinessStatus = "sellable" | "missing_cost" | "unavailable" | "invalid_mapping";

interface ProductVariantRow {
  id: number;
  product: number;
  product_name: string;
  template: number;
  sku: string;
  name: string;
  color_name: string;
  size: string;
  base_cost: string | null;
  retail_price: string | null;
  inventory: number | null;
  is_available: boolean;
  is_sellable: boolean;
  readiness_status: ReadinessStatus;
  provider_title: string | null;
  external_provider: string;
  external_variant_id: string;
  supported_print_areas: string[];
}

interface BlueprintRow {
  id: number;
  title: string;
  print_providers?: { id: number; title: string }[];
}

const crud = makeAdminCrud<ProductVariantRow>("/generator/admin/product-variants");
const productCrud = makeAdminCrud<{ id: number; name: string }>("/shop/admin/products");
const templateCrud = makeAdminCrud<{ id: number; name: string }>("/generator/admin/mockup-templates");
const blueprintCrud = makeAdminCrud<BlueprintRow>("/printify/blueprints");

const READINESS_LABEL: Record<ReadinessStatus, string> = {
  sellable: "SELLABLE",
  missing_cost: "MISSING COST",
  unavailable: "UNAVAILABLE",
  invalid_mapping: "INVALID MAPPING",
};

const READINESS_CLASS: Record<ReadinessStatus, string> = {
  sellable: "border-neon-blue/30 bg-neon-blue/10 text-neon-blue",
  missing_cost: "border-yellow-400/30 bg-yellow-400/10 text-yellow-400",
  unavailable: "border-white/10 bg-white/5 text-gray-400",
  invalid_mapping: "border-neon-pink/30 bg-neon-pink/10 text-neon-pink",
};

function ReadinessPill({ status }: { status: ReadinessStatus }) {
  return (
    <span className={cn("rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-widest", READINESS_CLASS[status])}>
      {READINESS_LABEL[status]}
    </span>
  );
}

export function ProductVariantsPage() {
  const dialog = useAdminDialog();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [productOptions, setProductOptions] = useState<AdminSelectOption[]>([]);
  const [templateOptions, setTemplateOptions] = useState<AdminSelectOption[]>([]);
  const [providerOptions, setProviderOptions] = useState<AdminSelectOption[]>([]);
  const [pendingBulk, setPendingBulk] = useState(false);

  const product = searchParams.get("product") ?? "";
  const provider = searchParams.get("provider") ?? "";
  const color = searchParams.get("color") ?? "";
  const size = searchParams.get("size") ?? "";
  const isAvailable = searchParams.get("is_available") ?? "";
  const isSellable = searchParams.get("is_sellable") ?? "";
  const missingCost = searchParams.get("missing_cost") ?? "";
  const externalProvider = searchParams.get("external_provider") ?? "";
  const ordering = searchParams.get("ordering") ?? "";

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    void productCrud.list({ page_size: 200 }).then((result) => {
      setProductOptions(result.results.map((item) => ({ value: item.id, label: item.name })));
    });
    void templateCrud.list({ page_size: 200 }).then((result) => {
      setTemplateOptions(result.results.map((item) => ({ value: item.id, label: item.name })));
    });
    // Providers have no flat list endpoint (only nested under a blueprint's detail) — fetch each
    // synced blueprint's detail once on mount to build the filter dropdown from already-synced
    // local data, never a live Printify request.
    void blueprintCrud.list({ page_size: 200 }).then(async (result) => {
      const details = await Promise.all(result.results.map((row) => blueprintCrud.get(row.id)));
      const options: AdminSelectOption[] = [];
      for (const blueprint of details) {
        for (const p of blueprint.print_providers ?? []) {
          options.push({ value: p.id, label: `${blueprint.title} — ${p.title}` });
        }
      }
      setProviderOptions(options);
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

  const selectClass =
    "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:border-neon-purple/50 focus:outline-none";
  const optionStyle = { backgroundColor: "#121212", color: "#ffffff" };

  const runBulk = async (action: "mark_available" | "mark_unavailable" | "set_base_cost", ids: (number | string)[], helpers: { clearSelection: () => void; refresh: () => void }) => {
    let base_cost: string | undefined;
    if (action === "set_base_cost") {
      const input = await dialog.prompt(`Set base cost for all ${ids.length} selected variant(s):`, {
        title: "Set base cost",
        placeholder: "e.g. 12.50",
      });
      if (input === null) return;
      base_cost = input.trim();
      if (!base_cost) return;
    }
    setPendingBulk(true);
    try {
      const result = await adminAction<{ updated: number }>("/generator/admin/product-variants/bulk-action/", {
        action,
        variant_ids: ids,
        ...(base_cost ? { base_cost } : {}),
      });
      toast.success(`Updated ${result.updated} variant(s).`, { title: "Bulk action complete" });
      helpers.clearSelection();
      helpers.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Bulk action failed.", { title: "Bulk action failed" });
    } finally {
      setPendingBulk(false);
    }
  };

  return (
    <AdminResourceTable
      title="Product Variants"
      crud={crud}
      searchable
      searchPlaceholder="SKU, product, color, size, external ID…"
      selectable
      extraListParams={{
        product: product || undefined,
        provider: provider || undefined,
        color: color || undefined,
        size: size || undefined,
        is_available: isAvailable || undefined,
        is_sellable: isSellable || undefined,
        missing_cost: missingCost || undefined,
        external_provider: externalProvider || undefined,
        ordering: ordering || undefined,
      }}
      filtersNode={
        <div className="flex flex-wrap gap-2">
          <select value={product} onChange={(e) => setFilter("product", e.target.value)} className={selectClass}>
            <option value="" style={optionStyle}>All Products</option>
            {productOptions.map((opt) => (
              <option key={opt.value} value={opt.value} style={optionStyle}>{opt.label}</option>
            ))}
          </select>
          <select value={provider} onChange={(e) => setFilter("provider", e.target.value)} className={selectClass}>
            <option value="" style={optionStyle}>All Print Providers</option>
            {providerOptions.map((opt) => (
              <option key={opt.value} value={opt.value} style={optionStyle}>{opt.label}</option>
            ))}
          </select>
          <input
            type="text"
            value={color}
            onChange={(e) => setFilter("color", e.target.value)}
            placeholder="Colour"
            className={cn(selectClass, "w-28 placeholder:text-gray-600")}
          />
          <input
            type="text"
            value={size}
            onChange={(e) => setFilter("size", e.target.value)}
            placeholder="Size"
            className={cn(selectClass, "w-24 placeholder:text-gray-600")}
          />
          <select value={isAvailable} onChange={(e) => setFilter("is_available", e.target.value)} className={selectClass}>
            <option value="" style={optionStyle}>Available?</option>
            <option value="true" style={optionStyle}>Available</option>
            <option value="false" style={optionStyle}>Unavailable</option>
          </select>
          <select value={isSellable} onChange={(e) => setFilter("is_sellable", e.target.value)} className={selectClass}>
            <option value="" style={optionStyle}>Sellable?</option>
            <option value="true" style={optionStyle}>Sellable</option>
            <option value="false" style={optionStyle}>Not Sellable</option>
          </select>
          <select value={missingCost} onChange={(e) => setFilter("missing_cost", e.target.value)} className={selectClass}>
            <option value="" style={optionStyle}>Production Cost</option>
            <option value="true" style={optionStyle}>Missing Cost</option>
            <option value="false" style={optionStyle}>Cost Set</option>
          </select>
          <input
            type="text"
            value={externalProvider}
            onChange={(e) => setFilter("external_provider", e.target.value)}
            placeholder="External Provider"
            className={cn(selectClass, "w-40 placeholder:text-gray-600")}
          />
          <select value={ordering} onChange={(e) => setFilter("ordering", e.target.value)} className={selectClass}>
            <option value="" style={optionStyle}>Default Order</option>
            <option value="product" style={optionStyle}>Product (A–Z)</option>
            <option value="-product" style={optionStyle}>Product (Z–A)</option>
            <option value="color" style={optionStyle}>Colour</option>
            <option value="size" style={optionStyle}>Size</option>
            <option value="base_cost" style={optionStyle}>Base Cost (Low–High)</option>
            <option value="-base_cost" style={optionStyle}>Base Cost (High–Low)</option>
            <option value="retail_price" style={optionStyle}>Retail Override</option>
            <option value="-is_available" style={optionStyle}>Availability</option>
          </select>
        </div>
      }
      renderBulkActions={(ids, helpers) => (
        <>
          <button
            type="button"
            disabled={pendingBulk}
            onClick={() => void runBulk("mark_available", ids, helpers)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-200 hover:text-neon-blue disabled:opacity-50"
          >
            Mark Available
          </button>
          <button
            type="button"
            disabled={pendingBulk}
            onClick={() => void runBulk("mark_unavailable", ids, helpers)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-200 hover:text-neon-pink disabled:opacity-50"
          >
            Mark Unavailable
          </button>
          <button
            type="button"
            disabled={pendingBulk}
            onClick={() => void runBulk("set_base_cost", ids, helpers)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-200 hover:text-white disabled:opacity-50"
          >
            Set Base Cost For All Selected
          </button>
        </>
      )}
      columns={[
        { key: "product_name", label: "Product" },
        { key: "name", label: "Variant" },
        { key: "color_name", label: "Colour" },
        { key: "size", label: "Size" },
        { key: "provider_title", label: "Provider", render: (row) => row.provider_title ?? "—" },
        { key: "base_cost", label: "Base Cost", render: (row) => row.base_cost ?? "—" },
        { key: "retail_price", label: "Retail Override", render: (row) => row.retail_price ?? "—" },
        {
          key: "is_available",
          label: "Available",
          render: (row) =>
            row.is_available ? (
              <CheckCircle2 size={14} className="text-neon-blue" />
            ) : (
              <XCircle size={14} className="text-gray-600" />
            ),
        },
        {
          key: "supported_print_areas",
          label: "Print Areas",
          render: (row) => (row.supported_print_areas.length ? row.supported_print_areas.join(", ") : "All"),
        },
        {
          key: "readiness_status",
          label: "Sellable",
          render: (row) => <ReadinessPill status={row.readiness_status} />,
        },
      ]}
      formFields={formFields}
    />
  );
}
