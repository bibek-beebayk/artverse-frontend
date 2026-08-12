/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { AdminResourceTable } from "../../../components/admin/AdminResourceTable.tsx";
import { AdminResourceForm, type AdminFieldSchema } from "../../../components/admin/AdminResourceForm.tsx";
import { useToast } from "../../../components/admin/ToastProvider.tsx";
import { makeAdminCrud } from "../../../lib/adminApi.ts";
import { cn } from "../../../lib/utils.ts";
import { ApiError, resolveAssetUrl } from "../../../lib/api.ts";

export interface MockupTemplateRow {
  id: number;
  name: string;
  slug: string;
  product_type: string;
  description: string;
  is_active: boolean;
  template_version: number;
  supported_colors: string[];
  supported_sizes: string[];
  supported_file_formats: string[];
  parts: MockupTemplatePartRow[];
  selected_print_provider: number | null;
}

export interface MockupTemplatePartRow {
  id: number;
  template: number;
  name: string;
  base_image: string | null;
  mask_image: string | null;
  displacement_map: string | null;
  shadow_layer: string | null;
  highlight_layer: string | null;
  config: Record<string, unknown>;
  dpi: number;
  safe_area: Record<string, unknown>;
  bleed_area: Record<string, unknown>;
  print_file_width: number | null;
  print_file_height: number | null;
  printify_placeholder_position: string;
}

/** A colour-specific override of a part's preview mockup images (e.g. Front+Black vs.
 * Front+White) — reused across every size of that colour. Any field left blank falls back to
 * the parent part's own generic asset at preview-render time (see apps.generator.services.
 * resolve_part_assets on the backend); this is preview-only and never touches production print
 * files. */
interface MockupTemplatePartColorAssetRow {
  id: number;
  part: number;
  color_name: string;
  base_image: string | null;
  mask_image: string | null;
  displacement_map: string | null;
  shadow_layer: string | null;
  highlight_layer: string | null;
}

const templateCrud = makeAdminCrud<MockupTemplateRow>("/generator/admin/mockup-templates");
const partCrud = makeAdminCrud<MockupTemplatePartRow>("/generator/admin/mockup-template-parts");
const colorAssetCrud = makeAdminCrud<MockupTemplatePartColorAssetRow>(
  "/generator/admin/mockup-template-part-color-assets",
);
const blueprintCrud = makeAdminCrud<BlueprintRow>("/printify/blueprints");

export interface PrintProvider {
  id: number;
  provider_id: number;
  title: string;
  location: Record<string, unknown>;
  variant_count: number;
  available_variant_count: number;
  supported_placeholders: string[];
  missing_cost_variant_count: number;
  synced_at: string;
}

// Printify's own location shape (city/region/country) — degrades gracefully for any other object
// shape, since this is passed through untouched from whatever Printify's API returned at sync
// time. Mirrors PrintifyBlueprintsPage.tsx's identical helper.
export function formatLocation(location: Record<string, unknown> | null | undefined): string {
  if (!location || typeof location !== "object") return "Unknown";
  const parts = [location.city, location.region, location.country].filter(
    (part): part is string => typeof part === "string" && part.length > 0,
  );
  return parts.length ? parts.join(", ") : "Unknown";
}

export interface BlueprintRow {
  id: number;
  blueprint_id: number;
  title: string;
  mockup_template: number | null;
  /** Printify's own catalogue/marketing photos for this blueprint — synced as-is, unvalidated
   * shape (see the "Or use a Printify catalog image" picker on the Part form's Base Image
   * field). Not necessarily a clean flat product shot; review before relying on one as-is. */
  images?: unknown[];
  print_providers?: PrintProvider[];
}

// Mirrors the backend's own fallback (apps.generator.serializers.resolve_display_thumbnail_url /
// apps.shop.serializers._fallback_template_image_url): prefer the 'front' part's photo, else
// whichever part actually has one.
function frontPartImage(template: MockupTemplateRow): string | null {
  const front = template.parts.find((part) => part.name === "front" && part.base_image);
  return front?.base_image ?? template.parts.find((part) => part.base_image)?.base_image ?? null;
}

const PRODUCT_TYPE_OPTIONS = [
  { value: "tshirt", label: "T-Shirt" },
  { value: "hoodie", label: "Hoodie" },
  { value: "mug", label: "Mug" },
  { value: "canvas", label: "Canvas" },
  { value: "poster", label: "Poster" },
  { value: "phone_case", label: "Phone Case" },
  { value: "tote_bag", label: "Tote Bag" },
];

export const PART_NAME_OPTIONS = [
  { value: "front", label: "Front" },
  { value: "back", label: "Back" },
  { value: "left_sleeve", label: "Left Sleeve" },
  { value: "right_sleeve", label: "Right Sleeve" },
];

// No base_image/mask_image/displacement_map/shadow_layer/highlight_layer/config/canvas_width/
// canvas_height here anymore — a template can no longer bypass Parts with a "root" image.
// Every renderable surface is a MockupTemplatePart (see the Parts tab below), and a template
// can't be activated until it has at least one (enforced server-side; the Active toggle here
// will reject with a clear error if you try before adding a part).
export const templateFormFields: AdminFieldSchema[] = [
  { name: "name", label: "Name", type: "text", required: true },
  { name: "slug", label: "Slug", type: "text", helpText: "Optional — leave blank to auto-generate a unique slug from the name." },
  { name: "product_type", label: "Product Type", type: "select", required: true, options: PRODUCT_TYPE_OPTIONS },
  { name: "description", label: "Description", type: "textarea" },
  {
    name: "is_active",
    label: "Active",
    type: "boolean",
    helpText: "Requires at least one part — add one on the Parts tab first.",
  },
  { name: "template_version", label: "Template Version", type: "number" },
  {
    name: "supported_colors",
    label: "Supported Colors (JSON list)",
    type: "json",
    helpText: 'e.g. ["Black", "White", "Navy"]',
  },
  {
    name: "supported_sizes",
    label: "Supported Sizes (JSON list)",
    type: "json",
    helpText: 'e.g. ["S", "M", "L", "XL"]',
  },
  {
    name: "supported_file_formats",
    label: "Supported Print File Formats (JSON list)",
    type: "json",
    helpText: 'e.g. ["png", "pdf"]',
  },
];

// blueprintImages/blueprintId let the Base Image field also offer "use a Printify catalog
// image" — computed per-render from whichever blueprint is mapped to the template currently
// being edited (see TemplateDetail), since that's not known at module load time the way the
// rest of this schema is.
export function buildPartFormFields(blueprintImages: string[], blueprintId: number | null): AdminFieldSchema[] {
  return [
    { name: "name", label: "Part", type: "select", required: true, options: PART_NAME_OPTIONS },
    {
      name: "base_image",
      label: "Base Image",
      type: "image",
      required: true,
      printifyImages: blueprintImages,
      printifyBlueprintId: blueprintId ?? undefined,
    },
    { name: "mask_image", label: "Mask Image", type: "image" },
    { name: "displacement_map", label: "Displacement Map", type: "image" },
    { name: "shadow_layer", label: "Shadow Layer", type: "image" },
    { name: "highlight_layer", label: "Highlight Layer", type: "image" },
    { name: "dpi", label: "Required DPI", type: "number" },
    { name: "print_file_width", label: "Print File Width (px)", type: "number" },
    { name: "print_file_height", label: "Print File Height (px)", type: "number" },
    {
      name: "printify_placeholder_position",
      label: "Printify Placeholder Position",
      type: "text",
      helpText: "Falls back to the part name if blank.",
    },
    {
      name: "config",
      label: "Print Area, Safe Area & Bleed",
      type: "placement",
      imageField: "base_image",
      safeAreaField: "safe_area",
      bleedAreaField: "bleed_area",
      helpText:
        "Drag the blue box to move/resize the print area. The green box inside it is the safe area (drag its own corner handle, or the numeric fields below). The amber outline is the bleed — drag its 4 edge handles, or use the numeric fields.",
    },
  ];
}

// blueprintImages/blueprintId mirror buildPartFormFields above — the Base Image field can also
// be set from one of the mapped Printify blueprint's own synced catalogue images instead of an
// uploaded file. Note these are the same *blueprint-level* catalogue photos as the generic
// part's own Base Image field, not colour-tagged by Printify — the admin is matching a photo to
// a colour by eye, not selecting a colour-specific image Printify identified for them.
function buildColorAssetFormFields(blueprintImages: string[], blueprintId: number | null): AdminFieldSchema[] {
  return [
    {
      name: "color_name",
      label: "Colour Name",
      type: "text",
      required: true,
      helpText: "Matches the variant colour exactly (case-insensitive), e.g. \"Black\".",
    },
    {
      name: "base_image",
      label: "Base Image",
      type: "image",
      required: true,
      printifyImages: blueprintImages,
      printifyBlueprintId: blueprintId ?? undefined,
    },
    { name: "mask_image", label: "Mask Image", type: "image" },
    { name: "displacement_map", label: "Displacement Map", type: "image" },
    { name: "shadow_layer", label: "Shadow Layer", type: "image" },
    { name: "highlight_layer", label: "Highlight Layer", type: "image" },
  ];
}

function PartDetail({
  part,
  blueprintImages,
  blueprintId,
  onBack,
  onUpdated,
}: {
  part: MockupTemplatePartRow;
  blueprintImages: string[];
  blueprintId: number | null;
  onBack: () => void;
  onUpdated: (part: MockupTemplatePartRow) => void;
}) {
  const toast = useToast();
  const [current, setCurrent] = useState(part);
  const [saved, setSaved] = useState(false);
  const partFormFields = buildPartFormFields(blueprintImages, blueprintId);

  const handleSubmit = async (payload: Record<string, unknown> | FormData) => {
    try {
      const updated = await partCrud.update(current.id, payload as never);
      setCurrent(updated);
      onUpdated(updated);
      setSaved(true);
      toast.success("Mockup template part updated.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Save failed.", { title: "Update failed" });
      throw err;
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-white"
      >
        <ArrowLeft size={13} />
        Back to Parts
      </button>

      <h2 className="mb-4 font-display text-lg font-black uppercase tracking-widest text-white">
        {PART_NAME_OPTIONS.find((option) => option.value === current.name)?.label ?? current.name} Part
      </h2>

      <div className="glass-card mb-8 max-w-3xl border-white/10 p-5">
        {saved && (
          <div className="mb-4 rounded-xl border border-neon-blue/30 bg-neon-blue/10 px-3 py-2 text-xs text-neon-blue">
            Saved.
          </div>
        )}
        <AdminResourceForm
          fields={partFormFields}
          initialValues={current as unknown as Record<string, unknown>}
          onSubmit={handleSubmit}
          onCancel={onBack}
          submitLabel="Save Changes"
        />
      </div>

      <div>
        <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-gray-500">
          Colour-Specific Assets
        </h3>
        <p className="mb-4 max-w-2xl text-xs text-gray-500">
          Override this part's mockup images for a specific product colour — e.g. a different photo
          for Black vs. White. Reused across every size of that colour. Any field left blank here
          falls back to this part's own generic asset above. Preview-only — production print files
          are never affected.
        </p>
        <AdminResourceTable
          title=""
          crud={colorAssetCrud}
          searchable={false}
          modalSize="lg"
          columns={[
            {
              key: "thumbnail",
              label: "",
              render: (row) => {
                const src = resolveAssetUrl(row.base_image);
                return src ? (
                  <img src={src} alt="" className="h-10 w-10 rounded-lg border border-white/10 object-cover" />
                ) : (
                  <div className="h-10 w-10 rounded-lg border border-white/10 bg-white/5" />
                );
              },
            },
            { key: "color_name", label: "Colour" },
          ]}
          formFields={buildColorAssetFormFields(blueprintImages, blueprintId)}
          extraListParams={{ part: current.id }}
          extraCreateValues={{ part: current.id }}
        />
      </div>
    </div>
  );
}

export function PrintifyMappingTab({
  template,
  onUpdated,
}: {
  template: MockupTemplateRow;
  onUpdated: (template: MockupTemplateRow) => void;
}) {
  const toast = useToast();
  const [blueprint, setBlueprint] = useState<BlueprintRow | null | "loading">("loading");
  const [selecting, setSelecting] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState<string>(
    template.selected_print_provider ? String(template.selected_print_provider) : "",
  );
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setBlueprint("loading");
    void blueprintCrud
      .list({ mockup_template: template.id })
      .then((result) => (result.results[0] ? blueprintCrud.get(result.results[0].id) : Promise.resolve(null)))
      .then((detail) => setBlueprint(detail as BlueprintRow | null));
  };

  useEffect(load, [template.id]);
  useEffect(() => {
    setSelectedProviderId(template.selected_print_provider ? String(template.selected_print_provider) : "");
  }, [template.selected_print_provider]);

  if (blueprint === "loading") {
    return (
      <div className="glass-card flex justify-center border-white/10 p-10 text-gray-500">
        <Loader2 size={18} className="animate-spin" />
      </div>
    );
  }

  if (!blueprint) {
    return (
      <div className="glass-card border-white/10 p-6 text-sm text-gray-400">
        No Printify blueprint is mapped to this template yet. Map one from the Printify → Blueprints
        page first, then come back here to select a print provider.
      </div>
    );
  }

  const providers = blueprint.print_providers ?? [];
  const selectedProvider = providers.find((p) => String(p.id) === selectedProviderId) ?? null;
  const currentProviderStillValid =
    !template.selected_print_provider || providers.some((p) => p.id === template.selected_print_provider);

  const handleSave = async () => {
    setSelecting(true);
    setError(null);
    try {
      const updated = await templateCrud.update(template.id, {
        selected_print_provider: selectedProviderId === "" ? null : Number(selectedProviderId),
      } as never);
      onUpdated(updated);
      toast.success(selectedProviderId === "" ? "Print provider cleared." : "Print provider selected.");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Could not update the selected provider.";
      setError(message);
      toast.error(message, { title: "Save failed" });
    } finally {
      setSelecting(false);
    }
  };

  const optionStyle = { backgroundColor: "#121212", color: "#ffffff" };

  return (
    <div className="glass-card max-w-3xl border-white/10 p-5">
      <h2 className="mb-4 text-[10px] font-bold uppercase tracking-[0.25em] text-gray-500">Printify Mapping</h2>

      <dl className="mb-5 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
        <div>
          <dt className="text-gray-500">Mapped Blueprint</dt>
          <dd className="font-bold text-white">{blueprint.title}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Provider Location</dt>
          <dd className="font-bold text-white">
            {selectedProvider ? formatLocation(selectedProvider.location) : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">Provider Variant Count</dt>
          <dd className="font-bold text-white">{selectedProvider ? selectedProvider.variant_count : "—"}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Supported Placeholders</dt>
          <dd className="font-bold text-white">
            {selectedProvider?.supported_placeholders.length ? selectedProvider.supported_placeholders.join(", ") : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">Last Provider Sync</dt>
          <dd className="font-bold text-white">
            {selectedProvider ? new Date(selectedProvider.synced_at).toLocaleString() : "—"}
          </dd>
        </div>
      </dl>

      {!currentProviderStillValid && (
        <div className="mb-4 rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-3 py-2 text-xs text-yellow-400">
          The previously selected provider no longer belongs to this template's mapped blueprint — select a
          provider again below.
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-gray-500">
            Selected Print Provider
          </label>
          <select
            value={selectedProviderId}
            onChange={(event) => setSelectedProviderId(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-neon-purple/50 focus:outline-none"
          >
            <option value="" style={optionStyle}>— None —</option>
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id} style={optionStyle}>
                {provider.title} — {formatLocation(provider.location)} ({provider.variant_count} variants)
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={selecting}
          className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-black uppercase tracking-widest text-cyber-black hover:bg-neon-purple hover:text-white disabled:opacity-60"
        >
          {selecting && <Loader2 size={14} className="animate-spin" />}
          Save Provider
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-neon-pink/30 bg-neon-pink/10 px-3 py-2 text-xs text-neon-pink">{error}</div>
      )}

      {selectedProvider && (
        <div>
          <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">Part Compatibility</h3>
          <div className="flex flex-col gap-1.5">
            {template.parts.map((part) => {
              const position = part.printify_placeholder_position || part.name;
              const supported = selectedProvider.supported_placeholders.includes(position);
              return (
                <div key={part.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs">
                  <span className="text-gray-300">
                    {part.name} <span className="text-gray-600">({position})</span>
                  </span>
                  {supported ? (
                    <span className="flex items-center gap-1.5 text-neon-blue">
                      <CheckCircle2 size={13} /> Supported
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-neon-pink">
                      <XCircle size={13} /> Unsupported
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function TemplateDetail({
  template,
  onBack,
  onUpdated,
}: {
  template: MockupTemplateRow;
  onBack: () => void;
  onUpdated: (template: MockupTemplateRow) => void;
}) {
  const toast = useToast();
  const [tab, setTab] = useState<"details" | "parts" | "printify">("details");
  const [current, setCurrent] = useState(template);
  const [saved, setSaved] = useState(false);
  const [blueprintImages, setBlueprintImages] = useState<string[]>([]);
  const [blueprintId, setBlueprintId] = useState<number | null>(null);
  const [selectedPart, setSelectedPart] = useState<MockupTemplatePartRow | null>(null);

  useEffect(() => {
    setBlueprintImages([]);
    setBlueprintId(null);
    void blueprintCrud.list({ mockup_template: current.id }).then((result) => {
      const blueprint = result.results[0];
      if (!blueprint) return;
      setBlueprintId(blueprint.id);
      setBlueprintImages((blueprint.images ?? []).filter((img): img is string => typeof img === "string"));
    });
  }, [current.id]);

  const partFormFields = buildPartFormFields(blueprintImages, blueprintId);

  const handleDetailsSubmit = async (payload: Record<string, unknown> | FormData) => {
    try {
      const updated = await templateCrud.update(current.id, payload as never);
      setCurrent(updated);
      onUpdated(updated);
      setSaved(true);
      toast.success("Mockup template updated.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Save failed.", { title: "Update failed" });
      throw err;
    }
  };

  const handlePrintifyUpdated = (updated: MockupTemplateRow) => {
    setCurrent(updated);
    onUpdated(updated);
  };

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-white"
      >
        <ArrowLeft size={13} />
        Back to Mockup Templates
      </button>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-xl font-black uppercase tracking-widest text-white">{current.name}</h1>
        <div className="flex gap-2 rounded-xl border border-white/10 bg-white/5 p-1">
          {(
            [
              ["details", "Details"],
              ["parts", "Parts"],
              ["printify", "Printify Mapping"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                "rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-colors",
                tab === key ? "bg-white text-cyber-black" : "text-gray-400 hover:text-white",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "details" ? (
        <div className="glass-card max-w-3xl border-white/10 p-5">
          {saved && (
            <div className="mb-4 rounded-xl border border-neon-blue/30 bg-neon-blue/10 px-3 py-2 text-xs text-neon-blue">
              Saved.
            </div>
          )}
          <AdminResourceForm
            fields={templateFormFields}
            initialValues={current as unknown as Record<string, unknown>}
            onSubmit={handleDetailsSubmit}
            onCancel={onBack}
            submitLabel="Save Changes"
          />
        </div>
      ) : tab === "printify" ? (
        <PrintifyMappingTab template={current} onUpdated={handlePrintifyUpdated} />
      ) : selectedPart ? (
        <PartDetail
          part={selectedPart}
          blueprintImages={blueprintImages}
          blueprintId={blueprintId}
          onBack={() => setSelectedPart(null)}
          onUpdated={setSelectedPart}
        />
      ) : (
        <AdminResourceTable<MockupTemplatePartRow>
          title=""
          crud={partCrud}
          searchable={false}
          modalSize="lg"
          columns={[
            {
              key: "thumbnail",
              label: "",
              render: (row) => {
                const src = resolveAssetUrl(row.base_image);
                return src ? (
                  <img src={src} alt="" className="h-10 w-10 rounded-lg border border-white/10 object-cover" />
                ) : (
                  <div className="h-10 w-10 rounded-lg border border-white/10 bg-white/5" />
                );
              },
            },
            { key: "name", label: "Part" },
            { key: "dpi", label: "DPI" },
            { key: "print_file_width", label: "Width", render: (row) => row.print_file_width ?? "—" },
            { key: "print_file_height", label: "Height", render: (row) => row.print_file_height ?? "—" },
            {
              key: "printify_placeholder_position",
              label: "Printify Position",
              render: (row) => row.printify_placeholder_position || "—",
            },
          ]}
          formFields={partFormFields}
          extraListParams={{ template: current.id }}
          extraCreateValues={{ template: current.id }}
          onEditRow={setSelectedPart}
        />
      )}
    </div>
  );
}

export function MockupTemplatesPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<MockupTemplateRow | null>(null);

  if (selectedTemplate) {
    return (
      <TemplateDetail
        template={selectedTemplate}
        onBack={() => setSelectedTemplate(null)}
        onUpdated={setSelectedTemplate}
      />
    );
  }

  return (
    <AdminResourceTable<MockupTemplateRow>
      title="Mockup Templates"
      crud={templateCrud}
      searchable={false}
      columns={[
        {
          key: "thumbnail",
          label: "",
          render: (row) => {
            const src = resolveAssetUrl(frontPartImage(row));
            return src ? (
              <img src={src} alt="" className="h-10 w-10 rounded-lg border border-white/10 object-cover" />
            ) : (
              <div className="h-10 w-10 rounded-lg border border-white/10 bg-white/5" />
            );
          },
        },
        { key: "id", label: "ID" },
        { key: "name", label: "Name" },
        { key: "product_type", label: "Type" },
        { key: "parts", label: "Parts", render: (row) => row.parts.length },
        { key: "is_active", label: "Active", render: (row) => (row.is_active ? "Yes" : "No") },
      ]}
      formFields={templateFormFields}
      onEditRow={setSelectedTemplate}
    />
  );
}
