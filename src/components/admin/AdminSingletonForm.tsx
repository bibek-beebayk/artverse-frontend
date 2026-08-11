/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { ApiError, requestJson } from "../../lib/api.ts";
import { AdminResourceForm, type AdminFieldSchema } from "./AdminResourceForm.tsx";
import { useToast } from "./ToastProvider.tsx";

interface AdminSingletonFormProps {
  title: string;
  path: string;
  fields: AdminFieldSchema[];
}

// For the two singleton resources (Site Configuration, Pricing Configuration) — no list, no
// create/delete, just one GET-then-PATCH form against a fixed detail endpoint backed by the
// model's get_solo() classmethod on the backend.
export function AdminSingletonForm({ title, path, fields }: AdminSingletonFormProps) {
  const toast = useToast();
  const [values, setValues] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    requestJson<Record<string, unknown>>(path)
      .then((data) => {
        if (!cancelled) setValues(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load.");
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  const handleSubmit = async (payload: Record<string, unknown> | FormData) => {
    try {
      const updated = await requestJson<Record<string, unknown>>(path, {
        method: "PATCH",
        body: payload instanceof FormData ? payload : JSON.stringify(payload),
      });
      setValues(updated);
      setSavedAt(Date.now());
      toast.success(`${title} saved.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Save failed.", { title: "Save failed" });
      throw err;
    }
  };

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 font-display text-xl font-black uppercase tracking-widest text-white">{title}</h1>
      {error && (
        <div className="mb-4 rounded-xl border border-neon-pink/30 bg-neon-pink/10 px-3 py-2 text-xs text-neon-pink">
          {error}
        </div>
      )}
      {savedAt && (
        <div className="mb-4 rounded-xl border border-neon-blue/30 bg-neon-blue/10 px-3 py-2 text-xs text-neon-blue">
          Saved.
        </div>
      )}
      {!values && !error ? (
        <Loader2 size={20} className="animate-spin text-gray-500" />
      ) : values ? (
        <div className="glass-card border-white/10 p-5">
          <AdminResourceForm fields={fields} initialValues={values} onSubmit={handleSubmit} onCancel={() => undefined} submitLabel="Save" />
        </div>
      ) : null}
    </div>
  );
}
