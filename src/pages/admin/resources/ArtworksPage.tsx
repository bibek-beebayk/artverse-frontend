/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Upload } from "lucide-react";
import { AdminResourceTable } from "../../../components/admin/AdminResourceTable.tsx";
import type { AdminFieldSchema, AdminSelectOption } from "../../../components/admin/AdminResourceForm.tsx";
import { AdminModal } from "../../../components/admin/AdminModal.tsx";
import { makeAdminCrud } from "../../../lib/adminApi.ts";
import { ApiError, requestJson } from "../../../lib/api.ts";

interface ArtworkRow {
  id: number;
  title: string;
  slug: string;
  category: number;
  collection: number | null;
  description: string;
  image: string | null;
  image_url: string;
  is_featured: boolean;
  is_published: boolean;
}

interface BulkImportRowResult {
  row_number: number;
  slug: string;
  action: string;
  message: string;
}

interface BulkImportResult {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  row_results: BulkImportRowResult[];
}

const crud = makeAdminCrud<ArtworkRow>("/gallery/admin/artworks");
const categoryCrud = makeAdminCrud<{ id: number; name: string }>("/gallery/admin/categories");
const collectionCrud = makeAdminCrud<{ id: number; name: string }>("/gallery/admin/collections");

function BulkImportForm({ onDone }: { onDone: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkImportResult | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await requestJson<BulkImportResult>("/gallery/admin/artworks/bulk-import/", {
        method: "POST",
        body: form,
      });
      setResult(response);
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Bulk import failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-[10px] file:font-bold file:uppercase file:tracking-widest file:text-white";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
          CSV File<span className="ml-1 text-neon-pink">*</span>
        </label>
        <input type="file" name="csv_file" accept=".csv" required className={inputClass} />
        <p className="text-[11px] leading-relaxed text-gray-500">
          Required columns: title, category. Optional: slug, collection, description, image_filename, is_featured, is_published, image_url.
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Images ZIP (optional)</label>
        <input type="file" name="images_zip_file" accept=".zip" className={inputClass} />
      </div>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-xs text-gray-300">
          <input type="checkbox" name="update_existing" value="true" defaultChecked className="accent-neon-purple" />
          Update existing
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-300">
          <input type="checkbox" name="auto_create_categories" value="true" defaultChecked className="accent-neon-purple" />
          Auto-create categories
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-300">
          <input type="checkbox" name="dry_run" value="true" className="accent-neon-purple" />
          Dry run
        </label>
      </div>

      {error && (
        <div className="rounded-xl border border-neon-pink/30 bg-neon-pink/10 px-3 py-2 text-xs text-neon-pink">{error}</div>
      )}

      {result && (
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-xs text-gray-300">
          <p className="mb-2 font-bold uppercase tracking-widest text-white">
            {result.created} created · {result.updated} updated · {result.skipped} skipped · {result.failed} failed
          </p>
          <div className="max-h-40 overflow-y-auto">
            {result.row_results.map((row) => (
              <div key={row.row_number} className="border-t border-white/5 py-1 first:border-0">
                Row {row.row_number} ({row.slug || "—"}): {row.action} — {row.message}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-black uppercase tracking-widest text-cyber-black transition-colors hover:bg-neon-purple hover:text-white disabled:opacity-60"
        >
          {submitting && <Loader2 size={14} className="animate-spin" />}
          Import
        </button>
      </div>
    </form>
  );
}

export function ArtworksPage() {
  const [categoryOptions, setCategoryOptions] = useState<AdminSelectOption[]>([]);
  const [collectionOptions, setCollectionOptions] = useState<AdminSelectOption[]>([]);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    void categoryCrud.list().then((result) => {
      setCategoryOptions(result.results.map((item) => ({ value: item.id, label: item.name })));
    });
    void collectionCrud.list().then((result) => {
      setCollectionOptions(result.results.map((item) => ({ value: item.id, label: item.name })));
    });
  }, []);

  const formFields: AdminFieldSchema[] = [
    { name: "title", label: "Title", type: "text", required: true },
    { name: "slug", label: "Slug", type: "text", helpText: "Optional — leave blank to auto-generate a unique slug from the title." },
    { name: "category", label: "Category", type: "select", required: true, options: categoryOptions },
    { name: "collection", label: "Collection", type: "select", options: collectionOptions },
    { name: "description", label: "Description", type: "textarea" },
    { name: "image", label: "Image", type: "image" },
    { name: "image_url", label: "Fallback Image URL", type: "text" },
    { name: "is_featured", label: "Featured", type: "boolean" },
    { name: "is_published", label: "Published", type: "boolean" },
  ];

  return (
    <>
      <AdminResourceTable
        key={refreshKey}
        title="Artworks"
        crud={crud}
        searchable={false}
        columns={[
          { key: "id", label: "ID" },
          { key: "title", label: "Title" },
          { key: "is_featured", label: "Featured", render: (row) => (row.is_featured ? "Yes" : "No") },
          { key: "is_published", label: "Published", render: (row) => (row.is_published ? "Yes" : "No") },
        ]}
        formFields={formFields}
        extraHeaderActions={
          <button
            type="button"
            onClick={() => setBulkImportOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-300 hover:text-white"
          >
            <Upload size={13} />
            Bulk Upload
          </button>
        }
      />

      <AdminModal isOpen={bulkImportOpen} onClose={() => setBulkImportOpen(false)} title="Bulk Upload Artworks">
        <BulkImportForm onDone={() => setRefreshKey((key) => key + 1)} />
      </AdminModal>
    </>
  );
}
