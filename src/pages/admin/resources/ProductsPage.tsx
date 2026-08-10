/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";
import { CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { AdminResourceTable } from "../../../components/admin/AdminResourceTable.tsx";
import type { AdminFieldSchema, AdminSelectOption } from "../../../components/admin/AdminResourceForm.tsx";
import { adminAction, makeAdminCrud } from "../../../lib/adminApi.ts";
import { ApiError, resolveAssetUrl } from "../../../lib/api.ts";

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
}

const crud = makeAdminCrud<ProductRow>("/shop/admin/products");
const categoryCrud = makeAdminCrud<{ id: number; name: string }>("/shop/admin/categories");
const templateCrud = makeAdminCrud<{ id: number; name: string }>("/generator/admin/mockup-templates");

export function ProductsPage() {
  const [categoryOptions, setCategoryOptions] = useState<AdminSelectOption[]>([]);
  const [templateOptions, setTemplateOptions] = useState<AdminSelectOption[]>([]);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

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
    { name: "slug", label: "Slug", type: "text", required: true },
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

  return (
    <AdminResourceTable
      title="Products"
      crud={crud}
      searchable={false}
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
      ]}
      formFields={formFields}
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
