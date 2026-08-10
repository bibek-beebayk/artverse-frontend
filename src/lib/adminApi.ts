/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Generic CRUD helper for the admin management panel (src/pages/admin/**, src/components/admin/**).
// Reuses api.ts's requestJson (auth header + 401 retry) — one makeAdminCrud<T>(basePath) call per
// resource replaces hand-writing list/get/create/update/remove for each of the ~20 admin resources,
// mirroring the *WriteInput + map*ToBackendPayload pattern already used for DesignProject CRUD in
// api.ts, just generic instead of one-off per resource.

import { requestJson } from "./api.ts";

interface AdminPaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  page: number;
  page_size: number;
  total_pages: number;
  results: T[];
}

export interface AdminListResult<T> {
  results: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
  next: string | null;
  previous: string | null;
}

export interface AdminCrud<T, TWrite = Partial<T>> {
  list(params?: Record<string, string | number | boolean | undefined>): Promise<AdminListResult<T>>;
  get(id: number | string): Promise<T>;
  create(input: TWrite | FormData): Promise<T>;
  update(id: number | string, input: TWrite | FormData): Promise<T>;
  remove(id: number | string): Promise<void>;
}

function toQueryString(params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

function isPaginatedResponse<T>(data: unknown): data is AdminPaginatedResponse<T> {
  return !!data && typeof data === "object" && Array.isArray((data as AdminPaginatedResponse<T>).results);
}

function toRequestBody(input: Record<string, unknown> | FormData): BodyInit {
  return input instanceof FormData ? input : JSON.stringify(input);
}

/** One call per resource — `/api/<app>/admin/<resource>/` for list+create,
 * `/api/<app>/admin/<resource>/<id>/` for get/update/remove. `basePath` includes the leading
 * `/<app>/admin/<resource>` segment (see api.ts's own path convention), no trailing slash needed. */
export function makeAdminCrud<T, TWrite = Partial<T>>(basePath: string): AdminCrud<T, TWrite> {
  const base = basePath.endsWith("/") ? basePath : `${basePath}/`;

  return {
    async list(params) {
      const data = await requestJson<AdminPaginatedResponse<T> | T[]>(`${base}${toQueryString(params)}`);
      if (isPaginatedResponse<T>(data)) {
        return {
          results: data.results,
          count: data.count,
          page: data.page,
          pageSize: data.page_size,
          totalPages: data.total_pages,
          next: data.next,
          previous: data.previous,
        };
      }
      return {
        results: data,
        count: data.length,
        page: 1,
        pageSize: data.length,
        totalPages: 1,
        next: null,
        previous: null,
      };
    },

    async get(id) {
      return requestJson<T>(`${base}${id}/`);
    },

    async create(input) {
      return requestJson<T>(base, {
        method: "POST",
        body: toRequestBody(input as Record<string, unknown> | FormData),
      });
    },

    async update(id, input) {
      return requestJson<T>(`${base}${id}/`, {
        method: "PATCH",
        body: toRequestBody(input as Record<string, unknown> | FormData),
      });
    },

    async remove(id) {
      await requestJson<Record<string, never>>(`${base}${id}/`, { method: "DELETE" });
    },
  };
}

/** For actions with no CRUD shape — e.g. product activate/deactivate/sync-variants,
 * artwork bulk-import, Printify sync triggers. */
export async function adminAction<T = unknown>(path: string, body?: Record<string, unknown> | FormData): Promise<T> {
  return requestJson<T>(path, {
    method: "POST",
    body: body ? toRequestBody(body) : undefined,
  });
}
