/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AdminResourceTable } from "../../../components/admin/AdminResourceTable.tsx";
import { makeAdminCrud } from "../../../lib/adminApi.ts";

interface VideoClipRow {
  id: number;
  title: string;
  slug: string;
  thumbnail_url: string;
  video_url: string;
  is_published: boolean;
}

const crud = makeAdminCrud<VideoClipRow>("/gallery/admin/videos");

export function VideoClipsPage() {
  return (
    <AdminResourceTable
      title="Video Clips"
      crud={crud}
      searchable={false}
      columns={[
        { key: "id", label: "ID" },
        { key: "title", label: "Title" },
        { key: "is_published", label: "Published", render: (row) => (row.is_published ? "Yes" : "No") },
      ]}
      formFields={[
        { name: "title", label: "Title", type: "text", required: true },
        { name: "slug", label: "Slug", type: "text", required: true },
        { name: "thumbnail_url", label: "Thumbnail URL", type: "text" },
        { name: "video_url", label: "Video URL", type: "text", required: true },
        { name: "is_published", label: "Published", type: "boolean" },
      ]}
    />
  );
}
