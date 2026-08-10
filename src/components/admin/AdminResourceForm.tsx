/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/utils.ts";
import { ApiError, resolveAssetUrl } from "../../lib/api.ts";
import { PlacementEditorField } from "./PlacementEditorField.tsx";

export type AdminFieldType =
  | "text"
  | "textarea"
  | "number"
  | "decimal"
  | "boolean"
  | "select"
  | "image"
  | "datetime"
  | "json"
  | "placement";

export interface AdminSelectOption {
  value: string | number;
  label: string;
}

export interface AdminFieldSchema {
  name: string;
  label: string;
  type: AdminFieldType;
  required?: boolean;
  readOnly?: boolean;
  helpText?: string;
  options?: AdminSelectOption[];
  placeholder?: string;
  rows?: number;
  /** "placement" fields only — name of the sibling image field (e.g. "base_image") whose
   * current preview (new file or existing URL) the visual placement editor overlays. */
  imageField?: string;
  /** "placement" fields only — name of the sibling safe_area/bleed_area fields (e.g.
   * "safe_area"/"bleed_area") to also manage on the same visual canvas. Neither is listed as
   * its own entry in the schema's `fields` array — the placement field owns reading/writing
   * both, since they only make sense drawn relative to the placement box. Omit either to render
   * that overlay's UI. */
  safeAreaField?: string;
  bleedAreaField?: string;
}

interface AdminResourceFormProps {
  fields: AdminFieldSchema[];
  initialValues?: Record<string, unknown> | null;
  onSubmit: (payload: Record<string, unknown> | FormData) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

function toDatetimeLocalValue(value: unknown): string {
  if (typeof value !== "string" || !value) return "";
  // "2026-08-10T14:30:00Z" -> "2026-08-10T14:30", the format <input type="datetime-local"> needs.
  return value.slice(0, 16);
}

function defaultValueFor(field: AdminFieldSchema): unknown {
  if (field.type === "boolean") return false;
  if (field.type === "json" || field.type === "placement") return "{}";
  return "";
}

function parseJsonFieldValue(value: unknown, label: string): unknown {
  const raw = typeof value === "string" ? value.trim() : "";
  try {
    return raw === "" ? {} : JSON.parse(raw);
  } catch {
    throw new Error(`${label}: must be valid JSON.`);
  }
}

const optionStyle = { backgroundColor: "#121212", color: "#ffffff" };

export function AdminResourceForm({ fields, initialValues, onSubmit, onCancel, submitLabel = "Save" }: AdminResourceFormProps) {
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};
    for (const field of fields) {
      const existing = initialValues?.[field.name];
      if (field.type === "json" || field.type === "placement") {
        initial[field.name] = existing !== undefined && existing !== null ? JSON.stringify(existing, null, 2) : "{}";
        if (field.type === "placement" && field.safeAreaField) {
          const existingSafeArea = initialValues?.[field.safeAreaField];
          initial[field.safeAreaField] =
            existingSafeArea !== undefined && existingSafeArea !== null ? JSON.stringify(existingSafeArea, null, 2) : "{}";
        }
        if (field.type === "placement" && field.bleedAreaField) {
          const existingBleedArea = initialValues?.[field.bleedAreaField];
          initial[field.bleedAreaField] =
            existingBleedArea !== undefined && existingBleedArea !== null ? JSON.stringify(existingBleedArea, null, 2) : "{}";
        }
      } else if (field.type === "datetime") {
        initial[field.name] = toDatetimeLocalValue(existing);
      } else if (existing !== undefined && existing !== null) {
        initial[field.name] = existing;
      } else {
        initial[field.name] = defaultValueFor(field);
      }
    }
    return initial;
  });
  const [imageFiles, setImageFiles] = useState<Record<string, File>>({});
  const [imagePreviewUrls, setImagePreviewUrls] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // object: URLs must be revoked when replaced or when the form unmounts, or each newly-selected
  // file leaks its blob for the lifetime of the tab.
  useEffect(() => {
    return () => {
      Object.values(imagePreviewUrls).forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setFieldValue = (name: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const setImageField = (name: string, file: File) => {
    setImageFiles((prev) => ({ ...prev, [name]: file }));
    setImagePreviewUrls((prev) => {
      if (prev[name]) URL.revokeObjectURL(prev[name]);
      return { ...prev, [name]: URL.createObjectURL(file) };
    });
  };

  // Shared by the image field's own preview and any "placement" field's imageField reference —
  // prefers a just-selected new file over whatever image already exists on the record.
  const resolveImagePreview = (name: string): string | null => {
    if (imagePreviewUrls[name]) return imagePreviewUrls[name];
    const existing = initialValues?.[name];
    return typeof existing === "string" && existing ? resolveAssetUrl(existing) : null;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const hasNewFiles = Object.keys(imageFiles).length > 0;

      if (hasNewFiles) {
        const formData = new FormData();
        for (const field of fields) {
          if (field.readOnly) continue;
          if (field.type === "image") {
            const file = imageFiles[field.name];
            if (file) formData.append(field.name, file);
            continue;
          }
          const value = values[field.name];
          if (value !== undefined && value !== null) {
            formData.append(field.name, typeof value === "boolean" ? (value ? "true" : "false") : String(value));
          }
          if (field.type === "placement") {
            for (const siblingField of [field.safeAreaField, field.bleedAreaField]) {
              if (!siblingField) continue;
              const siblingValue = values[siblingField];
              if (siblingValue !== undefined && siblingValue !== null) {
                formData.append(siblingField, String(siblingValue));
              }
            }
          }
        }
        await onSubmit(formData);
      } else {
        const payload: Record<string, unknown> = {};
        for (const field of fields) {
          if (field.readOnly || field.type === "image") continue;
          let value = values[field.name];
          if (field.type === "number" || field.type === "decimal") {
            value = value === "" ? null : Number(value);
          } else if (field.type === "json" || field.type === "placement") {
            value = parseJsonFieldValue(value, field.label);
            if (field.type === "placement") {
              if (field.safeAreaField) {
                payload[field.safeAreaField] = parseJsonFieldValue(values[field.safeAreaField], "Safe Area");
              }
              if (field.bleedAreaField) {
                payload[field.bleedAreaField] = parseJsonFieldValue(values[field.bleedAreaField], "Bleed Area");
              }
            }
          } else if (field.type === "select" && value === "") {
            value = null;
          }
          payload[field.name] = value;
        }
        await onSubmit(payload);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-neon-purple/50 focus:outline-none";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {fields.map((field) => (
        <div key={field.name} className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
            {field.label}
            {field.required && <span className="ml-1 text-neon-pink">*</span>}
          </label>

          {field.type === "text" && (
            <input
              type="text"
              className={inputClass}
              value={(values[field.name] as string) ?? ""}
              required={field.required}
              readOnly={field.readOnly}
              placeholder={field.placeholder}
              onChange={(event) => setFieldValue(field.name, event.target.value)}
            />
          )}

          {field.type === "textarea" && (
            <textarea
              className={cn(inputClass, "resize-y")}
              rows={field.rows ?? 3}
              value={(values[field.name] as string) ?? ""}
              required={field.required}
              readOnly={field.readOnly}
              placeholder={field.placeholder}
              onChange={(event) => setFieldValue(field.name, event.target.value)}
            />
          )}

          {field.type === "json" && (
            <textarea
              className={cn(inputClass, "resize-y font-mono text-xs")}
              rows={field.rows ?? 5}
              value={(values[field.name] as string) ?? ""}
              readOnly={field.readOnly}
              onChange={(event) => setFieldValue(field.name, event.target.value)}
            />
          )}

          {(field.type === "number" || field.type === "decimal") && (
            <input
              type="number"
              step={field.type === "decimal" ? "0.01" : "1"}
              className={inputClass}
              value={(values[field.name] as string | number) ?? ""}
              required={field.required}
              readOnly={field.readOnly}
              placeholder={field.placeholder}
              onChange={(event) => setFieldValue(field.name, event.target.value)}
            />
          )}

          {field.type === "datetime" && (
            <input
              type="datetime-local"
              className={inputClass}
              value={(values[field.name] as string) ?? ""}
              readOnly={field.readOnly}
              onChange={(event) => setFieldValue(field.name, event.target.value)}
            />
          )}

          {field.type === "select" && (
            <select
              className={inputClass}
              value={(values[field.name] as string | number) ?? ""}
              required={field.required}
              disabled={field.readOnly}
              onChange={(event) => setFieldValue(field.name, event.target.value)}
            >
              {/* Native <option> popups don't inherit the app's translucent dark background —
                  they fall back to browser-default white, so white option text needs an explicit
                  dark background/light text set directly here, not just via inputClass. */}
              <option value="" style={optionStyle}>
                —
              </option>
              {field.options?.map((option) => (
                <option key={option.value} value={option.value} style={optionStyle}>
                  {option.label}
                </option>
              ))}
            </select>
          )}

          {field.type === "boolean" && (
            <button
              type="button"
              disabled={field.readOnly}
              onClick={() => setFieldValue(field.name, !values[field.name])}
              className={cn(
                "flex h-10 w-fit items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-bold uppercase tracking-widest transition-colors",
                values[field.name] ? "text-neon-blue" : "text-gray-500",
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-9 items-center rounded-full p-0.5 transition-colors",
                  values[field.name] ? "bg-neon-blue/80 justify-end" : "bg-white/10 justify-start",
                )}
              >
                <span className="h-4 w-4 rounded-full bg-white" />
              </span>
              {values[field.name] ? "Enabled" : "Disabled"}
            </button>
          )}

          {field.type === "image" && (
            <div className="flex items-center gap-3">
              {imagePreviewUrls[field.name] ? (
                <div className="flex flex-col items-center gap-1">
                  <img
                    src={imagePreviewUrls[field.name]}
                    alt=""
                    className="h-14 w-14 rounded-lg border border-neon-blue/40 object-cover"
                  />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-neon-blue">New</span>
                </div>
              ) : typeof initialValues?.[field.name] === "string" && initialValues[field.name] ? (
                <div className="flex flex-col items-center gap-1">
                  <img
                    src={resolveAssetUrl(initialValues[field.name] as string)}
                    alt=""
                    className="h-14 w-14 rounded-lg border border-white/10 object-cover"
                  />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500">Current</span>
                </div>
              ) : null}
              <input
                type="file"
                accept="image/*"
                className="flex-1 text-xs text-gray-400 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-[10px] file:font-bold file:uppercase file:tracking-widest file:text-white"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) setImageField(field.name, file);
                }}
              />
            </div>
          )}

          {field.type === "placement" && (
            <PlacementEditorField
              value={(values[field.name] as string) ?? "{}"}
              onChange={(json) => setFieldValue(field.name, json)}
              imageUrl={field.imageField ? resolveImagePreview(field.imageField) : null}
              readOnly={field.readOnly}
              safeAreaValue={field.safeAreaField ? (values[field.safeAreaField] as string) : undefined}
              onSafeAreaChange={
                field.safeAreaField ? (json) => setFieldValue(field.safeAreaField as string, json) : undefined
              }
              bleedAreaValue={field.bleedAreaField ? (values[field.bleedAreaField] as string) : undefined}
              onBleedAreaChange={
                field.bleedAreaField ? (json) => setFieldValue(field.bleedAreaField as string, json) : undefined
              }
            />
          )}

          {field.helpText && <p className="text-[11px] leading-relaxed text-gray-500">{field.helpText}</p>}
        </div>
      ))}

      {error && (
        <div className="rounded-xl border border-neon-pink/30 bg-neon-pink/10 px-3 py-2 text-xs text-neon-pink">
          {error}
        </div>
      )}

      <div className="mt-2 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-black uppercase tracking-widest text-cyber-black transition-colors hover:bg-neon-purple hover:text-white disabled:opacity-60"
        >
          {submitting && <Loader2 size={14} className="animate-spin" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
