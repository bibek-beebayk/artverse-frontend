/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  ExternalLink,
  Layers,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { AdminResourceTable } from "../../../components/admin/AdminResourceTable.tsx";
import { AdminResourceForm, type AdminFieldSchema, type AdminSelectOption } from "../../../components/admin/AdminResourceForm.tsx";
import { adminAction, makeAdminCrud } from "../../../lib/adminApi.ts";
import { ApiError, resolveAssetUrl } from "../../../lib/api.ts";
import { cn } from "../../../lib/utils.ts";

type ReadyStatus = "ready" | "needs_attention" | "inactive_draft";

interface ProductReadiness {
  is_ready: boolean;
  status: ReadyStatus;
  issues: string[];
}

interface ProductRow {
  id: number;
  name: string;
  slug: string;
  category: number;
  description: string;
  image: string | null;
  thumbnail: string | null;
  image_url: string;
  is_active: boolean;
  mockup_template: number | null;
  starting_price: string | null;
  available_variant_count: number;
  total_variant_count: number;
  readiness: ProductReadiness;
}

interface VariantRow {
  id: number;
  readiness_status: "sellable" | "missing_cost" | "unavailable" | "invalid_mapping";
}

interface MockupTemplateDetail {
  id: number;
  name: string;
  selected_print_provider: number | null;
}

interface BlueprintRow {
  id: number;
  title: string;
  mockup_template: number | null;
}

const crud = makeAdminCrud<ProductRow>("/shop/admin/products");
const categoryCrud = makeAdminCrud<{ id: number; name: string }>("/shop/admin/categories");
const templateCrud = makeAdminCrud<{ id: number; name: string }>("/generator/admin/mockup-templates");
const variantCrud = makeAdminCrud<VariantRow>("/generator/admin/product-variants");
const blueprintCrud = makeAdminCrud<BlueprintRow>("/printify/blueprints");

const PRODUCT_TYPE_OPTIONS = [
  { value: "tshirt", label: "T-Shirt" },
  { value: "hoodie", label: "Hoodie" },
  { value: "mug", label: "Mug" },
  { value: "canvas", label: "Canvas" },
  { value: "poster", label: "Poster" },
  { value: "phone_case", label: "Phone Case" },
  { value: "tote_bag", label: "Tote Bag" },
];

const READY_STATUS_LABEL: Record<ReadyStatus, string> = {
  ready: "Ready",
  needs_attention: "Needs Attention",
  inactive_draft: "Inactive Draft",
};

const READY_STATUS_CLASS: Record<ReadyStatus, string> = {
  ready: "border-neon-blue/30 bg-neon-blue/10 text-neon-blue",
  needs_attention: "border-yellow-400/30 bg-yellow-400/10 text-yellow-400",
  inactive_draft: "border-white/10 bg-white/5 text-gray-400",
};

function ReadinessBadge({ readiness }: { readiness: ProductReadiness }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={readiness.issues.join(" ") || "No issues"}
        className={cn(
          "rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-widest",
          READY_STATUS_CLASS[readiness.status],
        )}
      >
        {READY_STATUS_LABEL[readiness.status]}
      </button>
      {open && readiness.issues.length > 0 && (
        <div className="absolute left-0 top-full z-10 mt-2 w-64 rounded-xl border border-white/10 bg-cyber-gray p-3 text-left shadow-xl">
          <ul className="flex flex-col gap-1.5 text-[10px] leading-relaxed text-gray-300">
            {readiness.issues.map((issue, index) => (
              <li key={index} className="flex gap-1.5">
                <span className="text-neon-pink">•</span>
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ProductDetail({
  product,
  categoryOptions,
  templateOptions,
  onBack,
  onUpdated,
}: {
  product: ProductRow;
  categoryOptions: AdminSelectOption[];
  templateOptions: AdminSelectOption[];
  onBack: () => void;
  onUpdated: (product: ProductRow) => void;
}) {
  const [current, setCurrent] = useState(product);
  const [saved, setSaved] = useState(false);
  const [variants, setVariants] = useState<VariantRow[] | null>(null);
  const [template, setTemplate] = useState<MockupTemplateDetail | null>(null);
  const [blueprint, setBlueprint] = useState<BlueprintRow | null>(null);

  useEffect(() => {
    setCurrent(product);
    setVariants(null);
    setTemplate(null);
    setBlueprint(null);

    void variantCrud.list({ product: product.id, page_size: 200 }).then((result) => setVariants(result.results));

    if (product.mockup_template) {
      void templateCrud.get(product.mockup_template).then((row) => setTemplate(row as unknown as MockupTemplateDetail));
      void blueprintCrud
        .list({ mockup_template: product.mockup_template })
        .then((result) => setBlueprint(result.results[0] ?? null));
    }
  }, [product]);

  const variantCounts = useMemo(() => {
    if (!variants) return null;
    return {
      total: variants.length,
      sellable: variants.filter((v) => v.readiness_status === "sellable").length,
      unavailable: variants.filter((v) => v.readiness_status === "unavailable").length,
      missingCost: variants.filter((v) => v.readiness_status === "missing_cost").length,
    };
  }, [variants]);

  const formFields: AdminFieldSchema[] = [
    { name: "name", label: "Name", type: "text", required: true },
    { name: "slug", label: "Slug", type: "text", helpText: "Optional — leave blank to auto-generate a unique slug from the name." },
    { name: "category", label: "Category", type: "select", required: true, options: categoryOptions },
    { name: "mockup_template", label: "Mockup Template", type: "select", options: templateOptions },
    { name: "description", label: "Description", type: "textarea" },
    { name: "image", label: "Image", type: "image" },
    { name: "image_url", label: "Fallback Image URL", type: "text" },
  ];

  const handleSubmit = async (payload: Record<string, unknown> | FormData) => {
    const updated = await crud.update(current.id, payload as never);
    setCurrent(updated);
    onUpdated(updated);
    setSaved(true);
  };

  const checklist: { label: string; done: boolean }[] = [
    { label: "Product created", done: true },
    { label: "Mockup template selected", done: Boolean(current.mockup_template) },
    { label: "Printify blueprint mapped", done: Boolean(blueprint) },
    { label: "Print provider selected", done: Boolean(template?.selected_print_provider) },
    { label: "Variants synced", done: (variantCounts?.total ?? 0) > 0 },
    {
      label: "Production costs reviewed",
      done: (variantCounts?.total ?? 0) > 0 && (variantCounts?.missingCost ?? 1) === 0,
    },
    { label: "Product activated", done: current.is_active },
  ];

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-white"
      >
        <ArrowLeft size={13} />
        Back to Products
      </button>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-xl font-black uppercase tracking-widest text-white">{current.name}</h1>
        <ReadinessBadge readiness={current.readiness} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="glass-card border-white/10 p-5 lg:col-span-2">
          {saved && (
            <div className="mb-4 rounded-xl border border-neon-blue/30 bg-neon-blue/10 px-3 py-2 text-xs text-neon-blue">
              Saved.
            </div>
          )}
          <AdminResourceForm
            fields={formFields}
            initialValues={current as unknown as Record<string, unknown>}
            onSubmit={handleSubmit}
            onCancel={onBack}
            submitLabel="Save Changes"
          />
        </div>

        <div className="flex flex-col gap-6">
          <div className="glass-card border-white/10 p-5">
            <h2 className="mb-4 text-[10px] font-bold uppercase tracking-[0.25em] text-gray-500">
              Storefront Status
            </h2>
            <dl className="flex flex-col gap-3 text-xs">
              <div className="flex items-center justify-between">
                <dt className="text-gray-400">Starting Price</dt>
                <dd className="font-bold text-white">{current.starting_price ?? "—"}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-gray-400">Total Variants</dt>
                <dd className="font-bold text-white">{variantCounts?.total ?? "…"}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-gray-400">Sellable Variants</dt>
                <dd className="font-bold text-neon-blue">{variantCounts?.sellable ?? "…"}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-gray-400">Unavailable Variants</dt>
                <dd className="font-bold text-gray-300">{variantCounts?.unavailable ?? "…"}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-gray-400">Missing Cost</dt>
                <dd className={cn("font-bold", (variantCounts?.missingCost ?? 0) > 0 ? "text-yellow-400" : "text-white")}>
                  {variantCounts?.missingCost ?? "…"}
                </dd>
              </div>
              <div className="flex items-center justify-between border-t border-white/10 pt-3">
                <dt className="text-gray-400">Activation Readiness</dt>
                <dd>
                  <ReadinessBadge readiness={current.readiness} />
                </dd>
              </div>
            </dl>
          </div>

          <div className="glass-card border-white/10 p-5">
            <h2 className="mb-4 text-[10px] font-bold uppercase tracking-[0.25em] text-gray-500">
              Onboarding Checklist
            </h2>
            <ul className="flex flex-col gap-2.5 text-xs">
              {checklist.map((item) => (
                <li key={item.label} className="flex items-center gap-2.5">
                  {item.done ? (
                    <CheckCircle2 size={14} className="shrink-0 text-neon-blue" />
                  ) : (
                    <XCircle size={14} className="shrink-0 text-gray-600" />
                  )}
                  <span className={item.done ? "text-gray-300" : "text-gray-500"}>{item.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="glass-card border-white/10 p-5">
            <h2 className="mb-4 text-[10px] font-bold uppercase tracking-[0.25em] text-gray-500">Quick Links</h2>
            <div className="flex flex-col gap-2">
              <a
                href="/admin/catalog/product-variants"
                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-300 hover:text-white"
              >
                View Variants
                <ArrowUpRight size={12} />
              </a>
              <button
                type="button"
                onClick={() => void adminAction(`/shop/admin/products/${current.id}/sync-variants/`).then(() => window.location.reload())}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-300 hover:text-white"
              >
                Sync Printify Variants
                <RefreshCw size={12} />
              </button>
              <a
                href="/admin/catalog/mockup-templates"
                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-300 hover:text-white"
              >
                Open Mockup Template
                <Layers size={12} />
              </a>
              {current.is_active && variantCounts && variantCounts.sellable > 0 && (
                <a
                  href={`/customize/product/${current.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-lg border border-neon-purple/30 bg-neon-purple/10 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-neon-purple/20"
                >
                  View in Shop
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categoryOptions, setCategoryOptions] = useState<AdminSelectOption[]>([]);
  const [templateOptions, setTemplateOptions] = useState<AdminSelectOption[]>([]);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductRow | null>(null);

  const category = searchParams.get("category") ?? "";
  const isActive = searchParams.get("is_active") ?? "";
  const readyStatus = searchParams.get("ready_status") ?? "";
  const productType = searchParams.get("product_type") ?? "";
  const mockupTemplate = searchParams.get("mockup_template") ?? "";
  const ordering = searchParams.get("ordering") ?? "";

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    void categoryCrud.list().then((result) => {
      setCategoryOptions(result.results.map((item) => ({ value: item.id, label: item.name })));
    });
    void templateCrud.list({ page_size: 200 }).then((result) => {
      setTemplateOptions(result.results.map((item) => ({ value: item.id, label: item.name })));
    });
  }, []);

  const formFields: AdminFieldSchema[] = [
    { name: "name", label: "Name", type: "text", required: true },
    { name: "slug", label: "Slug", type: "text", helpText: "Optional — leave blank to auto-generate a unique slug from the name." },
    { name: "category", label: "Category", type: "select", required: true, options: categoryOptions },
    { name: "mockup_template", label: "Mockup Template", type: "select", options: templateOptions },
    { name: "description", label: "Description", type: "textarea" },
    { name: "image", label: "Image", type: "image" },
    { name: "image_url", label: "Fallback Image URL", type: "text" },
  ];

  const runAction = async (productId: number, action: "activate" | "deactivate" | "sync-variants", refresh: () => void) => {
    setPendingAction(`${productId}-${action}`);
    try {
      await adminAction(`/shop/admin/products/${productId}/${action}/`);
      refresh();
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setPendingAction(null);
    }
  };

  if (selectedProduct) {
    return (
      <ProductDetail
        product={selectedProduct}
        categoryOptions={categoryOptions}
        templateOptions={templateOptions}
        onBack={() => setSelectedProduct(null)}
        onUpdated={setSelectedProduct}
      />
    );
  }

  const selectClass =
    "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:border-neon-purple/50 focus:outline-none";
  const optionStyle = { backgroundColor: "#121212", color: "#ffffff" };

  return (
    <AdminResourceTable<ProductRow>
      title="Products"
      crud={crud}
      searchable
      extraListParams={{
        category: category || undefined,
        is_active: isActive || undefined,
        ready_status: readyStatus || undefined,
        product_type: productType || undefined,
        mockup_template: mockupTemplate || undefined,
        ordering: ordering || undefined,
      }}
      filtersNode={
        <div className="flex flex-wrap gap-2">
          <select value={category} onChange={(e) => setFilter("category", e.target.value)} className={selectClass}>
            <option value="" style={optionStyle}>All Categories</option>
            {categoryOptions.map((opt) => (
              <option key={opt.value} value={opt.value} style={optionStyle}>{opt.label}</option>
            ))}
          </select>
          <select value={isActive} onChange={(e) => setFilter("is_active", e.target.value)} className={selectClass}>
            <option value="" style={optionStyle}>Active/Inactive</option>
            <option value="true" style={optionStyle}>Active</option>
            <option value="false" style={optionStyle}>Inactive</option>
          </select>
          <select value={readyStatus} onChange={(e) => setFilter("ready_status", e.target.value)} className={selectClass}>
            <option value="" style={optionStyle}>Any Readiness</option>
            <option value="ready" style={optionStyle}>Ready</option>
            <option value="needs_attention" style={optionStyle}>Needs Attention</option>
            <option value="inactive_draft" style={optionStyle}>Inactive Draft</option>
          </select>
          <select value={productType} onChange={(e) => setFilter("product_type", e.target.value)} className={selectClass}>
            <option value="" style={optionStyle}>All Product Types</option>
            {PRODUCT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} style={optionStyle}>{opt.label}</option>
            ))}
          </select>
          <select value={mockupTemplate} onChange={(e) => setFilter("mockup_template", e.target.value)} className={selectClass}>
            <option value="" style={optionStyle}>All Templates</option>
            {templateOptions.map((opt) => (
              <option key={opt.value} value={opt.value} style={optionStyle}>{opt.label}</option>
            ))}
          </select>
          <select value={ordering} onChange={(e) => setFilter("ordering", e.target.value)} className={selectClass}>
            <option value="" style={optionStyle}>Newest First</option>
            <option value="name" style={optionStyle}>Name (A–Z)</option>
            <option value="-name" style={optionStyle}>Name (Z–A)</option>
            <option value="oldest" style={optionStyle}>Oldest First</option>
            <option value="starting_price" style={optionStyle}>Starting Price (Low–High)</option>
            <option value="-starting_price" style={optionStyle}>Starting Price (High–Low)</option>
            <option value="-variant_count" style={optionStyle}>Most Variants</option>
          </select>
        </div>
      }
      columns={[
        {
          key: "thumbnail",
          label: "",
          render: (row) => {
            const src = resolveAssetUrl(row.thumbnail || row.image);
            return src ? (
              <img src={src} alt="" className="h-10 w-10 rounded-lg border border-white/10 object-cover" />
            ) : (
              <div className="h-10 w-10 rounded-lg border border-white/10 bg-white/5" />
            );
          },
        },
        { key: "id", label: "ID" },
        { key: "name", label: "Name" },
        { key: "starting_price", label: "Starting Price", render: (row) => row.starting_price ?? "—" },
        {
          key: "variants",
          label: "Variants",
          render: (row) => `${row.available_variant_count}/${row.total_variant_count} available`,
        },
        {
          key: "is_active",
          label: "Active",
          render: (row) => (
            <span className={row.is_active ? "text-neon-blue" : "text-gray-500"}>{row.is_active ? "Active" : "Inactive"}</span>
          ),
        },
        {
          key: "readiness",
          label: "Readiness",
          render: (row) => <ReadinessBadge readiness={row.readiness} />,
        },
      ]}
      formFields={formFields}
      onEditRow={setSelectedProduct}
      extraRowActions={(row, refresh) => (
        <>
          {!row.is_active ? (
            <button
              type="button"
              onClick={() => void runAction(row.id, "activate", refresh)}
              disabled={pendingAction === `${row.id}-activate`}
              aria-label="Activate"
              title="Activate"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-300 hover:text-neon-blue disabled:opacity-50"
            >
              <CheckCircle2 size={13} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void runAction(row.id, "deactivate", refresh)}
              disabled={pendingAction === `${row.id}-deactivate`}
              aria-label="Deactivate"
              title="Deactivate"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-300 hover:text-neon-pink disabled:opacity-50"
            >
              <XCircle size={13} />
            </button>
          )}
          <button
            type="button"
            onClick={() => void runAction(row.id, "sync-variants", refresh)}
            disabled={pendingAction === `${row.id}-sync-variants`}
            aria-label="Sync variants from Printify"
            title="Sync variants from Printify"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-300 hover:text-white disabled:opacity-50"
          >
            <RefreshCw size={13} />
          </button>
        </>
      )}
    />
  );
}
