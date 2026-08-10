/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AdminResourceTable } from "../../../components/admin/AdminResourceTable.tsx";
import { makeAdminCrud } from "../../../lib/adminApi.ts";

interface FavoriteRow {
  id: number;
  user: { id: number; username: string } | null;
  artwork: number;
  artwork_title: string;
  created_at: string;
}

const crud = makeAdminCrud<FavoriteRow>("/gallery/admin/favorites");

export function FavoritesPage() {
  return (
    <AdminResourceTable
      title="Favorites"
      crud={crud}
      searchable={false}
      columns={[
        { key: "id", label: "ID" },
        { key: "user", label: "User", render: (row) => row.user?.username ?? "—" },
        { key: "artwork_title", label: "Artwork" },
        { key: "created_at", label: "Favorited", render: (row) => new Date(row.created_at).toLocaleString() },
      ]}
    />
  );
}
