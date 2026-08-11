/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Fragment, useCallback, useEffect, useState, type ReactNode } from "react";
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Pagination } from "../Common.tsx";
import { ApiError } from "../../lib/api.ts";
import type { AdminCrud } from "../../lib/adminApi.ts";
import { AdminModal } from "./AdminModal.tsx";
import { AdminResourceForm, type AdminFieldSchema } from "./AdminResourceForm.tsx";
import { useAdminDialog } from "./AdminDialogProvider.tsx";
import { useToast } from "./ToastProvider.tsx";

export interface AdminColumnSchema<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
}

interface AdminResourceTableProps<T extends { id: number | string }> {
  title: string;
  crud: AdminCrud<T>;
  columns: AdminColumnSchema<T>[];
  /** Omit for a read-only Support & Monitoring table — no New/Edit affordances render. */
  formFields?: AdminFieldSchema[];
  /** Independent of formFields — e.g. Notification Subscriptions is delete-only (no edit/create).
   * Defaults to true whenever formFields is provided, false otherwise. */
  deletable?: boolean;
  /** False for the handful of resources whose admin list endpoint doesn't filter on ?search= —
   * hides the search box rather than showing one that silently does nothing. */
  searchable?: boolean;
  searchPlaceholder?: string;
  createLabel?: string;
  /** Defaults to the row itself; override when the form's field names don't match the row shape
   * 1:1 (e.g. a FK rendered as a nested object in the row but a plain id in the form). */
  getRowInitialValues?: (row: T) => Record<string, unknown>;
  extraRowActions?: (row: T, refresh: () => void) => ReactNode;
  extraHeaderActions?: ReactNode;
  /** Static params merged into every crud.list() call — e.g. { template: templateId } for a
   * nested-resource table scoped to one parent. Applied on top of page/search. */
  extraListParams?: Record<string, string | number | boolean | undefined>;
  /** Values merged into the create payload that aren't editable fields of their own — e.g. the
   * parent id for a nested-resource table's "New" form. */
  extraCreateValues?: Record<string, unknown>;
  /** "lg" for a form with several image fields and/or the placement editor. Passed straight
   * through to the internal AdminModal. */
  modalSize?: "md" | "lg";
  /** A full-width row of filter controls (selects, etc.) rendered under the title/search bar —
   * e.g. Products' category/status/ordering dropdowns. The caller owns the filter state and
   * feeds it back in via extraListParams; this is purely a layout slot. */
  filtersNode?: ReactNode;
  /** When provided, the Edit button calls this instead of opening the internal create/edit
   * modal — for a page that shows its own inline detail view rather than a modal (e.g.
   * MockupTemplatesPage, which never nests one AdminModal inside another — see AdminModal.tsx's
   * docstring for why that's unsafe). "New" still uses the internal modal either way, since a
   * brand-new row has no detail view to switch to yet.
   */
  onEditRow?: (row: T) => void;
  /** Renders a checkbox column and a bulk-actions bar above the table whenever at least one row
   * is selected — for safe, scoped multi-row operations (e.g. Product Variants' Mark Available/
   * Unavailable/Set Base Cost). Selection is cleared on every reload (page change, filter change,
   * after an action completes) rather than persisted across pages — a bulk action is only ever
   * meant to apply to what's currently visible and deliberately checked. */
  selectable?: boolean;
  renderBulkActions?: (selectedIds: (number | string)[], helpers: { clearSelection: () => void; refresh: () => void }) => ReactNode;
  /** When set, an extra full-width row is inserted directly under the row whose `id` matches —
   * pushing subsequent rows down, not appended after the whole table — e.g. Printify Blueprints'
   * per-row provider-inspection panel. `renderExpandedContent` supplies that row's content. */
  expandedRowId?: number | string | null;
  renderExpandedContent?: (row: T) => ReactNode;
}

export function AdminResourceTable<T extends { id: number | string }>({
  title,
  crud,
  columns,
  formFields,
  deletable = Boolean(formFields),
  searchable = true,
  searchPlaceholder = "Search…",
  createLabel = "New",
  getRowInitialValues,
  extraRowActions,
  extraHeaderActions,
  extraListParams,
  extraCreateValues,
  modalSize,
  filtersNode,
  onEditRow,
  selectable = false,
  renderBulkActions,
  expandedRowId = null,
  renderExpandedContent,
}: AdminResourceTableProps<T>) {
  const dialog = useAdminDialog();
  const toast = useToast();
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [modalRow, setModalRow] = useState<T | null | "new">(null);
  const [deletingId, setDeletingId] = useState<number | string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await crud.list({
        page,
        search: searchable ? search || undefined : undefined,
        ...extraListParams,
      });
      setRows(result.results);
      setTotalPages(result.totalPages || 1);
      setSelectedIds(new Set());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crud, page, search, searchable, JSON.stringify(extraListParams)]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, JSON.stringify(extraListParams)]);

  const toggleRowSelected = (id: number | string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allVisibleSelected = rows.length > 0 && rows.every((row) => selectedIds.has(row.id));
  const toggleSelectAllVisible = () => {
    setSelectedIds(allVisibleSelected ? new Set() : new Set(rows.map((row) => row.id)));
  };

  const handleDelete = async (id: number | string) => {
    const confirmed = await dialog.confirm("Delete this item? This cannot be undone.", {
      title: "Confirm delete",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!confirmed) return;
    setDeletingId(id);
    try {
      await crud.remove(id);
      toast.success(`${title || "Item"} deleted.`);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Delete failed.", { title: "Delete failed" });
    } finally {
      setDeletingId(null);
    }
  };

  const closeModal = () => setModalRow(null);

  const handleSubmit = async (payload: Record<string, unknown> | FormData) => {
    const isCreate = modalRow === "new";
    try {
      if (isCreate) {
        if (extraCreateValues && !(payload instanceof FormData)) {
          Object.assign(payload, extraCreateValues);
        } else if (extraCreateValues && payload instanceof FormData) {
          for (const [key, value] of Object.entries(extraCreateValues)) {
            payload.append(key, String(value));
          }
        }
        await crud.create(payload as never);
      } else if (modalRow) {
        await crud.update(modalRow.id, payload as never);
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Save failed.", {
        title: isCreate ? "Create failed" : "Update failed",
      });
      // Rethrown so AdminResourceForm's own catch still shows the inline, field-context error
      // and keeps the modal open for a retry — the toast is a supplementary, transient signal,
      // not a replacement for that.
      throw err;
    }
    toast.success(`${title || "Item"} ${isCreate ? "created" : "updated"}.`);
    closeModal();
    await load();
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        {title && <h1 className="font-display text-xl font-black uppercase tracking-widest text-white">{title}</h1>}
        <div className="ml-auto flex items-center gap-3">
          {searchable && (
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={searchPlaceholder}
                className="w-48 rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-xs text-white placeholder:text-gray-600 focus:border-neon-purple/50 focus:outline-none sm:w-64"
              />
            </div>
          )}
          {extraHeaderActions}
          {formFields && (
            <button
              type="button"
              onClick={() => setModalRow("new")}
              className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-cyber-black transition-colors hover:bg-neon-purple hover:text-white"
            >
              <Plus size={13} />
              {createLabel}
            </button>
          )}
        </div>
      </div>

      {filtersNode && <div className="mb-4">{filtersNode}</div>}

      {selectable && selectedIds.size > 0 && renderBulkActions && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-neon-purple/30 bg-neon-purple/10 px-4 py-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-white">
            {selectedIds.size} selected
          </span>
          {renderBulkActions(Array.from(selectedIds), { clearSelection: () => setSelectedIds(new Set()), refresh: load })}
        </div>
      )}

      <div className="glass-card overflow-hidden border-white/10 p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-160 text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                {selectable && (
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAllVisible}
                      aria-label="Select all visible rows"
                      className="h-3.5 w-3.5 accent-neon-purple"
                    />
                  </th>
                )}
                {columns.map((column) => (
                  <th key={column.key} className="px-4 py-3">
                    {column.label}
                  </th>
                ))}
                {(formFields || deletable || extraRowActions) && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length + 1 + (selectable ? 1 : 0)} className="px-4 py-10 text-center text-gray-500">
                    <Loader2 size={18} className="mx-auto animate-spin" />
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={columns.length + 1 + (selectable ? 1 : 0)} className="px-4 py-10 text-center text-neon-pink">
                    {error}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1 + (selectable ? 1 : 0)} className="px-4 py-10 text-center text-gray-500">
                    Nothing here yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <Fragment key={row.id}>
                    <tr className="border-b border-white/5 text-gray-300 last:border-0 hover:bg-white/3">
                      {selectable && (
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(row.id)}
                            onChange={() => toggleRowSelected(row.id)}
                            aria-label="Select row"
                            className="h-3.5 w-3.5 accent-neon-purple"
                          />
                        </td>
                      )}
                      {columns.map((column) => (
                        <td key={column.key} className="px-4 py-3">
                          {column.render ? column.render(row) : String((row as Record<string, unknown>)[column.key] ?? "—")}
                        </td>
                      ))}
                      {(formFields || deletable || extraRowActions) && (
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            {extraRowActions?.(row, load)}
                            {formFields && (
                              <button
                                type="button"
                                onClick={() => (onEditRow ? onEditRow(row) : setModalRow(row))}
                                aria-label="Edit"
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-300 hover:text-white"
                              >
                                <Pencil size={13} />
                              </button>
                            )}
                            {deletable && (
                              <button
                                type="button"
                                onClick={() => void handleDelete(row.id)}
                                disabled={deletingId === row.id}
                                aria-label="Delete"
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-300 hover:text-neon-pink disabled:opacity-50"
                              >
                                {deletingId === row.id ? (
                                  <Loader2 size={13} className="animate-spin" />
                                ) : (
                                  <Trash2 size={13} />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                    {renderExpandedContent && expandedRowId === row.id && (
                      <tr className="border-b border-white/5">
                        <td colSpan={columns.length + 1 + (selectable ? 1 : 0)} className="p-0">
                          {renderExpandedContent(row)}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

      {formFields && (
        <AdminModal
          isOpen={modalRow !== null}
          onClose={closeModal}
          size={modalSize}
          title={modalRow === "new" ? createLabel : title ? `Edit ${title}` : "Edit"}
        >
          <AdminResourceForm
            fields={formFields}
            initialValues={modalRow && modalRow !== "new" ? (getRowInitialValues ? getRowInitialValues(modalRow) : (modalRow as unknown as Record<string, unknown>)) : null}
            onSubmit={handleSubmit}
            onCancel={closeModal}
            submitLabel={modalRow === "new" ? "Create" : "Save Changes"}
          />
        </AdminModal>
      )}
    </div>
  );
}
