/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// A single continuous, step-by-step flow through everything docs/ADMIN_GUIDE.md §10 (the
// "Product Publishing Manual") walks an admin through by hand across five different sidebar
// sections — Category, Printify Blueprint, Mockup Template + Parts, Blueprint Mapping + Provider,
// Product, Variants, Pricing, Activation. This page doesn't replace any of those resource pages
// or introduce new backend endpoints — every action here calls the exact same admin CRUD/action
// endpoints those pages already use (see each step's imports below), just sequenced in one place
// so creating a product doesn't require jumping between Catalog/Printify/Pricing in the sidebar.
// Entry point is deliberately the Dashboard's own button only (see DashboardPage.tsx) — no
// adminNav.ts sidebar entry, so the existing nav structure is completely untouched.

import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import { AdminResourceForm, type AdminFieldSchema, type AdminSelectOption } from "../../../components/admin/AdminResourceForm.tsx";
import { useToast } from "../../../components/admin/ToastProvider.tsx";
import { useAdminDialog } from "../../../components/admin/AdminDialogProvider.tsx";
import { adminAction, makeAdminCrud } from "../../../lib/adminApi.ts";
import { ApiError, resolveAssetUrl } from "../../../lib/api.ts";
import { cn } from "../../../lib/utils.ts";
import {
  buildPartFormFields,
  PART_NAME_OPTIONS,
  PrintifyMappingTab,
  templateFormFields,
  type MockupTemplatePartRow,
  type MockupTemplateRow,
} from "./MockupTemplatesPage.tsx";
import { ReadinessBadge, type ProductRow } from "./ProductsPage.tsx";
import { ReadinessPill, type ReadinessStatus } from "./ProductVariantsPage.tsx";

interface CategoryRow {
  id: number;
  name: string;
  slug: string;
}

interface WizardBlueprintRow {
  id: number;
  blueprint_id: number;
  title: string;
  brand: string;
  mockup_template: number | null;
  is_mapped: boolean;
  provider_count: number;
}

interface WizardVariantRow {
  id: number;
  color_name: string;
  size: string;
  base_cost: string | null;
  is_available: boolean;
  readiness_status: ReadinessStatus;
}

interface PricingRuleRow {
  id: number;
  name: string;
  rule_type: string;
  markup_type: string;
  amount: string;
  category: number | null;
  product: number | null;
  is_active: boolean;
  priority: number;
}

const categoryCrud = makeAdminCrud<CategoryRow>("/shop/admin/categories");
const productCrud = makeAdminCrud<ProductRow>("/shop/admin/products");
const templateCrud = makeAdminCrud<MockupTemplateRow>("/generator/admin/mockup-templates");
const partCrud = makeAdminCrud<MockupTemplatePartRow>("/generator/admin/mockup-template-parts");
const variantCrud = makeAdminCrud<WizardVariantRow>("/generator/admin/product-variants");
const blueprintCrud = makeAdminCrud<WizardBlueprintRow>("/printify/blueprints");
const pricingRuleCrud = makeAdminCrud<PricingRuleRow>("/cart/admin/pricing-rules");

const selectClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-neon-purple/50 focus:outline-none";
const optionStyle = { backgroundColor: "#121212", color: "#ffffff" };

/** Mirrors AdminResourceTable's own extraCreateValues merge exactly (see that component's
 * create handler) — a plain object gets the extra keys assigned directly, a FormData submission
 * (any form with a selected image file) gets them appended instead. Every wizard step that
 * pre-fills a value the admin already chose earlier in the flow (category, template, product,
 * colour, etc.) goes through this rather than exposing a redundant re-selection field. */
function mergePayload(
  payload: Record<string, unknown> | FormData,
  extra: Record<string, unknown>,
): Record<string, unknown> | FormData {
  if (payload instanceof FormData) {
    for (const [key, value] of Object.entries(extra)) {
      payload.append(key, String(value));
    }
    return payload;
  }
  return { ...payload, ...extra };
}

interface WizardState {
  categoryId: number | null;
  categoryName: string;
  usePrintify: boolean | null;
  blueprintId: number | null;
  blueprintTitle: string | null;
  templateId: number | null;
  templateName: string | null;
  productId: number | null;
  productName: string | null;
  productSlug: string | null;
}

const INITIAL_STATE: WizardState = {
  categoryId: null,
  categoryName: "",
  usePrintify: null,
  blueprintId: null,
  blueprintTitle: null,
  templateId: null,
  templateName: null,
  productId: null,
  productName: null,
  productSlug: null,
};

type StepId =
  | "category"
  | "blueprint"
  | "template"
  | "parts"
  | "mapping"
  | "activate-template"
  | "product"
  | "variants"
  | "pricing"
  | "activate-product"
  | "done";

function visibleSteps(usePrintify: boolean | null): { id: StepId; label: string }[] {
  const steps: { id: StepId; label: string }[] = [
    { id: "category", label: "Category" },
    { id: "blueprint", label: "Printify" },
    { id: "template", label: "Template" },
    { id: "parts", label: "Parts" },
  ];
  if (usePrintify !== false) {
    steps.push({ id: "mapping", label: "Mapping" });
  }
  steps.push(
    { id: "activate-template", label: "Activate Template" },
    { id: "product", label: "Product" },
    { id: "variants", label: "Variants" },
    { id: "pricing", label: "Pricing" },
    { id: "activate-product", label: "Activate" },
    { id: "done", label: "Done" },
  );
  return steps;
}

interface StepProps {
  state: WizardState;
  onNext: (update?: Partial<WizardState>) => void;
  onBack: () => void;
}

function StepProgress({ steps, currentIndex }: { steps: { id: StepId; label: string }[]; currentIndex: number }) {
  return (
    <div className="mb-6 flex items-center gap-1.5 overflow-x-auto pb-2">
      {steps.map((step, index) => (
        <div key={step.id} className="flex shrink-0 items-center gap-1.5">
          <div
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[9px] font-black",
              index < currentIndex
                ? "border-neon-blue/50 bg-neon-blue/10 text-neon-blue"
                : index === currentIndex
                  ? "border-white bg-white text-cyber-black"
                  : "border-white/10 bg-white/5 text-gray-600",
            )}
          >
            {index < currentIndex ? <Check size={11} /> : index + 1}
          </div>
          <span
            className={cn(
              "whitespace-nowrap text-[9px] font-bold uppercase tracking-widest",
              index === currentIndex ? "text-white" : "text-gray-600",
            )}
          >
            {step.label}
          </span>
          {index < steps.length - 1 && <div className="mx-1 h-px w-4 shrink-0 bg-white/10" />}
        </div>
      ))}
    </div>
  );
}

function WizardStepFrame({
  title,
  description,
  onBack,
  children,
}: {
  title: string;
  description?: string;
  onBack?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="glass-card max-w-3xl border-white/10 p-6">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-white"
        >
          <ArrowLeft size={13} />
          Back
        </button>
      )}
      <h2 className="mb-1 font-display text-lg font-black uppercase tracking-widest text-white">{title}</h2>
      {description && <p className="mb-5 text-xs leading-relaxed text-gray-400">{description}</p>}
      {children}
    </div>
  );
}

function CategoryStep({ state, onNext }: StepProps) {
  const toast = useToast();
  const [options, setOptions] = useState<AdminSelectOption[] | null>(null);
  const [selected, setSelected] = useState<string>(state.categoryId ? String(state.categoryId) : "");
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    void categoryCrud.list({ page_size: 200 }).then((result) => {
      setOptions(result.results.map((item) => ({ value: item.id, label: item.name })));
    });
  }, []);

  const handleContinue = () => {
    if (!selected || !options) return;
    const option = options.find((o) => String(o.value) === selected);
    onNext({ categoryId: Number(selected), categoryName: option?.label ?? "" });
  };

  const createFields: AdminFieldSchema[] = [
    { name: "name", label: "Name", type: "text", required: true },
    { name: "slug", label: "Slug", type: "text", helpText: "Optional — auto-generated from the name if left blank." },
  ];

  const handleCreate = async (payload: Record<string, unknown> | FormData) => {
    try {
      const created = await categoryCrud.create(payload as never);
      toast.success("Category created.");
      onNext({ categoryId: created.id, categoryName: created.name });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not create category.", { title: "Create failed" });
      throw err;
    }
  };

  return (
    <WizardStepFrame title="Product Category" description="Every product belongs to a category, e.g. T-Shirts, Hoodies, Mugs.">
      {options === null ? (
        <div className="flex justify-center py-8 text-gray-500">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : showCreate ? (
        <AdminResourceForm
          fields={createFields}
          initialValues={null}
          onSubmit={handleCreate}
          onCancel={() => setShowCreate(false)}
          submitLabel="Create & Continue"
        />
      ) : (
        <div className="flex flex-col gap-4">
          {options.length > 0 && (
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-gray-500">
                Existing Category
              </label>
              <select value={selected} onChange={(e) => setSelected(e.target.value)} className={selectClass}>
                <option value="" style={optionStyle}>— Select —</option>
                {options.map((opt) => (
                  <option key={opt.value} value={opt.value} style={optionStyle}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleContinue}
              disabled={!selected}
              className="rounded-xl bg-white px-5 py-2.5 text-xs font-black uppercase tracking-widest text-cyber-black hover:bg-neon-purple hover:text-white disabled:opacity-40"
            >
              Continue
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-gray-300 hover:text-white"
            >
              + Create New Category
            </button>
          </div>
        </div>
      )}
    </WizardStepFrame>
  );
}

function BlueprintStep({ state, onNext, onBack }: StepProps) {
  const toast = useToast();
  const [choice, setChoice] = useState<"printify" | null>(state.usePrintify ? "printify" : null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WizardBlueprintRow[] | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [selected, setSelected] = useState<WizardBlueprintRow | null>(null);

  const search = (q: string) => {
    void blueprintCrud.list({ search: q || undefined, page_size: 20 }).then((result) => setResults(result.results));
  };

  useEffect(() => {
    if (choice === "printify") search("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choice]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await adminAction("/printify/sync-blueprints/");
      toast.success("Blueprints synced from Printify.");
      search(query);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Sync failed.", { title: "Sync failed" });
    } finally {
      setSyncing(false);
    }
  };

  if (choice === null) {
    return (
      <WizardStepFrame
        title="Printify Blueprint"
        onBack={onBack}
        description="Is this product fulfilled through Printify, or will you manage pricing and variants manually?"
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => setChoice("printify")}
            className="glass-card flex-1 border-white/10 p-5 text-left hover:border-neon-purple/40"
          >
            <div className="mb-1 text-xs font-black uppercase tracking-widest text-white">Use a Printify Blueprint</div>
            <div className="text-[11px] leading-relaxed text-gray-500">
              Recommended — pulls in print providers, a synced variant catalogue, and per-part placeholder
              positions automatically.
            </div>
          </button>
          <button
            type="button"
            onClick={() => onNext({ usePrintify: false, blueprintId: null, blueprintTitle: null })}
            className="glass-card flex-1 border-white/10 p-5 text-left hover:border-white/30"
          >
            <div className="mb-1 text-xs font-black uppercase tracking-widest text-white">Skip — Manage Manually</div>
            <div className="text-[11px] leading-relaxed text-gray-500">
              You'll add variants, production costs, and print-area positions by hand later in this flow.
            </div>
          </button>
        </div>
      </WizardStepFrame>
    );
  }

  return (
    <WizardStepFrame
      title="Printify Blueprint"
      onBack={onBack}
      description="Search Printify's synced catalogue and pick the blank item you're fulfilling this product with."
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            search(e.target.value);
          }}
          placeholder="Search title, brand, model…"
          className="min-w-50 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-neon-purple/50 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => void handleSync()}
          disabled={syncing}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-gray-300 hover:text-white disabled:opacity-60"
        >
          {syncing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          Sync Blueprints
        </button>
      </div>

      {results === null ? (
        <div className="flex justify-center py-8 text-gray-500">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : results.length === 0 ? (
        <div className="glass-card mb-5 border-white/10 p-6 text-xs text-gray-400">
          No blueprints found. Try Sync Blueprints, or a different search term.
        </div>
      ) : (
        <div className="mb-5 flex max-h-80 flex-col gap-2 overflow-y-auto pr-1">
          {results.map((bp) => (
            <button
              key={bp.id}
              type="button"
              onClick={() => setSelected(bp)}
              className={cn(
                "flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-xs transition-colors",
                selected?.id === bp.id
                  ? "border-neon-purple/60 bg-neon-purple/10 text-white"
                  : "border-white/10 bg-white/5 text-gray-300 hover:border-white/30",
              )}
            >
              <span>
                <span className="font-bold">{bp.title}</span>
                <span className="ml-2 text-gray-500">{bp.brand}</span>
              </span>
              <span className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-gray-500">
                {bp.is_mapped && <span className="text-yellow-400">Already mapped</span>}
                {bp.provider_count} provider{bp.provider_count === 1 ? "" : "s"}
              </span>
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => selected && onNext({ usePrintify: true, blueprintId: selected.id, blueprintTitle: selected.title })}
        disabled={!selected}
        className="rounded-xl bg-white px-5 py-2.5 text-xs font-black uppercase tracking-widest text-cyber-black hover:bg-neon-purple hover:text-white disabled:opacity-40"
      >
        Continue
      </button>
    </WizardStepFrame>
  );
}

function TemplateStep({ onNext, onBack }: StepProps) {
  const toast = useToast();
  // is_active is deliberately excluded here — a template can't be activated until it has at
  // least one part (next step), so that toggle belongs on the dedicated Activate Template step.
  const wizardTemplateFields = templateFormFields.filter((f) => f.name !== "is_active");

  const handleCreate = async (payload: Record<string, unknown> | FormData) => {
    try {
      const body = mergePayload(payload, { is_active: false });
      const created = await templateCrud.create(body as never);
      toast.success("Mockup template created.");
      onNext({ templateId: created.id, templateName: created.name });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not create template.", { title: "Create failed" });
      throw err;
    }
  };

  return (
    <WizardStepFrame
      title="Mockup Template"
      onBack={onBack}
      description="The customizable design surface for this product — its name, product type, and supported colours/sizes."
    >
      <AdminResourceForm
        fields={wizardTemplateFields}
        initialValues={null}
        onSubmit={handleCreate}
        onCancel={onBack}
        submitLabel="Create & Continue"
      />
    </WizardStepFrame>
  );
}

function PartsStep({ state, onNext, onBack }: StepProps) {
  const toast = useToast();
  const [parts, setParts] = useState<MockupTemplatePartRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [adding, setAdding] = useState(true);
  const [addKey, setAddKey] = useState(0);

  useEffect(() => {
    if (!state.templateId) return;
    void partCrud.list({ template: state.templateId, page_size: 50 }).then((result) => {
      setParts(result.results);
      setLoaded(true);
      setAdding(result.results.length === 0);
    });
  }, [state.templateId]);

  // No Printify catalogue images offered here — the blueprint isn't mapped to this template yet
  // (that happens in the next step, matching the same order docs/ADMIN_GUIDE.md §10.5/§10.6
  // uses). Admins can still attach a Printify catalogue image to a part later from the Mockup
  // Templates page once mapped.
  const partFields = buildPartFormFields([], null);

  const handleAdd = async (payload: Record<string, unknown> | FormData) => {
    try {
      const body = mergePayload(payload, { template: state.templateId });
      const created = await partCrud.create(body as never);
      setParts((prev) => [...prev, created]);
      setAdding(false);
      setAddKey((k) => k + 1);
      toast.success("Part added.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not add part.", { title: "Create failed" });
      throw err;
    }
  };

  return (
    <WizardStepFrame
      title="Template Parts"
      onBack={onBack}
      description="Add at least a Front part — Back and sleeves too, if this product prints there."
    >
      {!loaded ? (
        <div className="flex justify-center py-8 text-gray-500">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : (
        <>
          {parts.length > 0 && (
            <div className="mb-5 flex flex-col gap-2">
              {parts.map((part) => (
                <div
                  key={part.id}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs"
                >
                  {resolveAssetUrl(part.base_image) ? (
                    <img
                      src={resolveAssetUrl(part.base_image)}
                      alt=""
                      className="h-9 w-9 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-9 w-9 rounded-lg bg-white/10" />
                  )}
                  <span className="font-bold uppercase tracking-widest text-white">
                    {PART_NAME_OPTIONS.find((o) => o.value === part.name)?.label ?? part.name}
                  </span>
                  <CheckCircle2 size={14} className="ml-auto shrink-0 text-neon-blue" />
                </div>
              ))}
            </div>
          )}

          {adding ? (
            <AdminResourceForm
              key={addKey}
              fields={partFields}
              initialValues={null}
              onSubmit={handleAdd}
              onCancel={() => setAdding(false)}
              submitLabel="Add Part"
            />
          ) : (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-gray-300 hover:text-white"
              >
                + Add Another Part
              </button>
              <button
                type="button"
                onClick={() => onNext()}
                disabled={parts.length === 0}
                className="rounded-xl bg-white px-5 py-2.5 text-xs font-black uppercase tracking-widest text-cyber-black hover:bg-neon-purple hover:text-white disabled:opacity-40"
              >
                Continue
              </button>
            </div>
          )}
        </>
      )}
    </WizardStepFrame>
  );
}

function MappingStep({ state, onNext, onBack }: StepProps) {
  const [mapping, setMapping] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [template, setTemplate] = useState<MockupTemplateRow | null>(null);

  useEffect(() => {
    if (!state.blueprintId || !state.templateId) return;
    setMapping(true);
    setError(null);
    adminAction(`/printify/blueprints/${state.blueprintId}/map/`, { mockup_template_id: state.templateId })
      .then(() => templateCrud.get(state.templateId as number))
      .then((tpl) => setTemplate(tpl))
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Could not map the blueprint to this template."),
      )
      .finally(() => setMapping(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.blueprintId, state.templateId]);

  return (
    <WizardStepFrame
      title="Map Blueprint & Select Provider"
      onBack={onBack}
      description={`Mapping "${state.blueprintTitle}" to "${state.templateName}", then choosing which print provider fulfils it.`}
    >
      {mapping ? (
        <div className="flex justify-center py-8 text-gray-500">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-neon-pink/30 bg-neon-pink/10 px-3 py-2 text-xs text-neon-pink">
          {error}
        </div>
      ) : template ? (
        <>
          <PrintifyMappingTab template={template} onUpdated={setTemplate} />
          <button
            type="button"
            onClick={() => onNext()}
            disabled={!template.selected_print_provider}
            className="mt-5 rounded-xl bg-white px-5 py-2.5 text-xs font-black uppercase tracking-widest text-cyber-black hover:bg-neon-purple hover:text-white disabled:opacity-40"
          >
            Continue
          </button>
        </>
      ) : null}
    </WizardStepFrame>
  );
}

function ActivateTemplateStep({ state, onNext, onBack }: StepProps) {
  const toast = useToast();
  const [template, setTemplate] = useState<MockupTemplateRow | null>(null);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!state.templateId) return;
    void templateCrud.get(state.templateId).then(setTemplate);
  }, [state.templateId]);

  const handleActivate = async () => {
    if (!template) return;
    setActivating(true);
    setError(null);
    try {
      const updated = await templateCrud.update(template.id, { is_active: true } as never);
      setTemplate(updated);
      toast.success("Mockup template activated.");
      onNext();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Could not activate the template.";
      setError(message);
      toast.error(message, { title: "Activation failed" });
    } finally {
      setActivating(false);
    }
  };

  return (
    <WizardStepFrame title="Activate Template" onBack={onBack} description="Make this template's parts available for rendering.">
      {!template ? (
        <div className="flex justify-center py-8 text-gray-500">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : (
        <>
          <dl className="mb-5 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
            <div>
              <dt className="text-gray-500">Name</dt>
              <dd className="font-bold text-white">{template.name}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Parts</dt>
              <dd className="font-bold text-white">{template.parts.length}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Print Provider</dt>
              <dd className="font-bold text-white">{template.selected_print_provider ? "Selected" : "None"}</dd>
            </div>
          </dl>
          {error && (
            <div className="mb-4 rounded-xl border border-neon-pink/30 bg-neon-pink/10 px-3 py-2 text-xs text-neon-pink">
              {error}
            </div>
          )}
          <button
            type="button"
            onClick={() => void handleActivate()}
            disabled={activating}
            className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-black uppercase tracking-widest text-cyber-black hover:bg-neon-purple hover:text-white disabled:opacity-60"
          >
            {activating && <Loader2 size={13} className="animate-spin" />}
            Activate & Continue
          </button>
        </>
      )}
    </WizardStepFrame>
  );
}

function ProductStep({ state, onNext, onBack }: StepProps) {
  const toast = useToast();
  const productFields: AdminFieldSchema[] = [
    { name: "name", label: "Name", type: "text", required: true },
    { name: "slug", label: "Slug", type: "text", helpText: "Optional — leave blank to auto-generate a unique slug from the name." },
    { name: "description", label: "Description", type: "textarea" },
    {
      name: "image",
      label: "Image",
      type: "image",
      helpText: "Optional — falls back to the mockup template's front part photo if left blank.",
    },
  ];

  const handleCreate = async (payload: Record<string, unknown> | FormData) => {
    try {
      const body = mergePayload(payload, { category: state.categoryId, mockup_template: state.templateId });
      const created = await productCrud.create(body as never);
      toast.success("Product created.");
      onNext({ productId: created.id, productName: created.name, productSlug: created.slug });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not create product.", { title: "Create failed" });
      throw err;
    }
  };

  return (
    <WizardStepFrame
      title="Product"
      onBack={onBack}
      description={`Category: ${state.categoryName} · Mockup Template: ${state.templateName}`}
    >
      <AdminResourceForm
        fields={productFields}
        initialValues={null}
        onSubmit={handleCreate}
        onCancel={onBack}
        submitLabel="Create & Continue"
      />
    </WizardStepFrame>
  );
}

function VariantsStep({ state, onNext, onBack }: StepProps) {
  const toast = useToast();
  const dialog = useAdminDialog();
  const [variants, setVariants] = useState<WizardVariantRow[] | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [addingManual, setAddingManual] = useState(false);
  const [addKey, setAddKey] = useState(0);

  const refresh = () => {
    if (!state.productId) return;
    void variantCrud.list({ product: state.productId, page_size: 200 }).then((result) => setVariants(result.results));
  };

  useEffect(refresh, [state.productId]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await adminAction(`/shop/admin/products/${state.productId}/sync-variants/`);
      toast.success("Variants synced from Printify.");
      refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Sync failed.", { title: "Sync failed" });
    } finally {
      setSyncing(false);
    }
  };

  const handleCostChange = async (id: number, value: string) => {
    setSavingId(id);
    try {
      const updated = await variantCrud.update(id, { base_cost: value } as never);
      setVariants((prev) => prev?.map((v) => (v.id === id ? updated : v)) ?? prev);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not save cost.", { title: "Save failed" });
    } finally {
      setSavingId(null);
    }
  };

  const handleBulkCost = async () => {
    if (!variants || variants.length === 0) return;
    const input = await dialog.prompt("Set base cost for every listed variant:", {
      title: "Set base cost",
      placeholder: "e.g. 8.75",
    });
    if (input === null) return;
    const base_cost = input.trim();
    if (!base_cost) return;
    try {
      const result = await adminAction<{ updated: number }>("/generator/admin/product-variants/bulk-action/", {
        action: "set_base_cost",
        variant_ids: variants.map((v) => v.id),
        base_cost,
      });
      toast.success(`Updated ${result.updated} variant(s).`, { title: "Bulk update complete" });
      refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Bulk update failed.", { title: "Bulk update failed" });
    }
  };

  const manualFields: AdminFieldSchema[] = [
    { name: "color_name", label: "Colour", type: "text", required: true },
    { name: "color_hex", label: "Colour Hex", type: "text", placeholder: "#1a1a1a" },
    { name: "size", label: "Size", type: "text", required: true },
    { name: "base_cost", label: "Base Cost", type: "decimal", required: true },
    { name: "retail_price", label: "Retail Price (display only)", type: "decimal" },
    { name: "inventory", label: "Inventory", type: "number" },
    { name: "is_available", label: "Available", type: "boolean" },
    { name: "image", label: "Image", type: "image" },
  ];

  const handleAddManual = async (payload: Record<string, unknown> | FormData) => {
    try {
      const body = mergePayload(payload, { product: state.productId, template: state.templateId });
      await variantCrud.create(body as never);
      toast.success("Variant added.");
      setAddKey((k) => k + 1);
      refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not add variant.", { title: "Create failed" });
      throw err;
    }
  };

  const missingCost = variants?.filter((v) => v.readiness_status === "missing_cost").length ?? 0;
  const sellable = variants?.filter((v) => v.readiness_status === "sellable").length ?? 0;

  return (
    <WizardStepFrame
      title="Variants"
      onBack={onBack}
      description="Every colour/size combination customers can actually buy, each with a real production cost."
    >
      {state.usePrintify ? (
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void handleSync()}
            disabled={syncing}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-gray-300 hover:text-white disabled:opacity-60"
          >
            {syncing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            Sync Printify Variants
          </button>
          {variants && variants.length > 0 && (
            <button
              type="button"
              onClick={() => void handleBulkCost()}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-gray-300 hover:text-white"
            >
              Set Base Cost For All
            </button>
          )}
        </div>
      ) : (
        <div className="mb-5">
          {addingManual ? (
            <AdminResourceForm
              key={addKey}
              fields={manualFields}
              initialValues={null}
              onSubmit={handleAddManual}
              onCancel={() => setAddingManual(false)}
              submitLabel="Add Variant"
            />
          ) : (
            <button
              type="button"
              onClick={() => setAddingManual(true)}
              className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-gray-300 hover:text-white"
            >
              + Add Variant
            </button>
          )}
        </div>
      )}

      {variants === null ? (
        <div className="flex justify-center py-8 text-gray-500">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : (
        variants.length > 0 && (
          <div className="mb-5 flex flex-col gap-2">
            {variants.map((v) => (
              <div
                key={v.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs"
              >
                <span className="font-bold text-white">
                  {v.color_name} / {v.size}
                </span>
                <input
                  type="text"
                  defaultValue={v.base_cost ?? ""}
                  placeholder="Base cost"
                  onBlur={(e) => {
                    if (e.target.value !== (v.base_cost ?? "")) void handleCostChange(v.id, e.target.value);
                  }}
                  className="w-24 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white placeholder:text-gray-600 focus:border-neon-purple/50 focus:outline-none"
                />
                {savingId === v.id && <Loader2 size={12} className="animate-spin text-gray-500" />}
                <ReadinessPill status={v.readiness_status} />
              </div>
            ))}
          </div>
        )
      )}

      {variants !== null && (
        <>
          <p className="mb-4 text-[11px] text-gray-500">
            {sellable} sellable · {missingCost} missing cost · {variants.length} total
          </p>
          <button
            type="button"
            onClick={() => onNext()}
            disabled={variants.length === 0}
            className="rounded-xl bg-white px-5 py-2.5 text-xs font-black uppercase tracking-widest text-cyber-black hover:bg-neon-purple hover:text-white disabled:opacity-40"
          >
            Continue
          </button>
        </>
      )}
    </WizardStepFrame>
  );
}

function PricingStep({ state, onNext, onBack }: StepProps) {
  const toast = useToast();
  const [rules, setRules] = useState<PricingRuleRow[] | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    void pricingRuleCrud.list({ page_size: 200 }).then((result) => setRules(result.results));
  }, []);

  const applicable =
    rules
      ?.filter(
        (r) =>
          r.is_active &&
          (r.rule_type === "global" ||
            (r.rule_type === "category" && r.category === state.categoryId) ||
            (r.rule_type === "product" && r.product === state.productId)),
      )
      .sort((a, b) => b.priority - a.priority)[0] ?? null;

  const ruleFields: AdminFieldSchema[] = [
    { name: "name", label: "Name", type: "text", required: true },
    {
      name: "markup_type",
      label: "Markup Type",
      type: "select",
      required: true,
      options: [
        { value: "fixed", label: "Fixed amount" },
        { value: "percentage", label: "Percentage" },
      ],
    },
    {
      name: "amount",
      label: "Amount",
      type: "decimal",
      required: true,
      helpText: "Flat currency amount if fixed, or percentage points (15 = 15%) if percentage.",
    },
    { name: "currency", label: "Currency", type: "text", required: true },
    { name: "priority", label: "Priority", type: "number", helpText: "Higher wins over the Global rule shown above." },
  ];

  const handleCreate = async (payload: Record<string, unknown> | FormData) => {
    try {
      const body = mergePayload(payload, { rule_type: "product", product: state.productId, is_active: true });
      await pricingRuleCrud.create(body as never);
      toast.success("Pricing rule created.");
      onNext();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not create pricing rule.", { title: "Create failed" });
      throw err;
    }
  };

  return (
    <WizardStepFrame
      title="Pricing"
      onBack={onBack}
      description="The customer-facing price is variant base cost plus the single most specific applicable markup rule."
    >
      {rules === null ? (
        <div className="flex justify-center py-8 text-gray-500">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : (
        <>
          {applicable ? (
            <div className="mb-5 rounded-xl border border-neon-blue/30 bg-neon-blue/10 px-4 py-3 text-xs leading-relaxed text-neon-blue">
              An applicable rule already exists: <strong>{applicable.name}</strong> ({applicable.rule_type},{" "}
              {applicable.markup_type === "percentage" ? `${applicable.amount}%` : applicable.amount}). You can
              continue as-is, or add a product-specific override below.
            </div>
          ) : (
            <div className="mb-5 rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-4 py-3 text-xs leading-relaxed text-yellow-400">
              No pricing rule applies to this product yet — it won't have a computed starting price until one does.
              Add one below, or set up a Global rule later from Pricing → Pricing Rules.
            </div>
          )}

          {showCreate ? (
            <AdminResourceForm
              fields={ruleFields}
              initialValues={{ currency: "USD", priority: 0 }}
              onSubmit={handleCreate}
              onCancel={() => setShowCreate(false)}
              submitLabel="Create & Continue"
            />
          ) : (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => onNext()}
                className="rounded-xl bg-white px-5 py-2.5 text-xs font-black uppercase tracking-widest text-cyber-black hover:bg-neon-purple hover:text-white"
              >
                Continue
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-gray-300 hover:text-white"
              >
                + Add Product-Specific Rule
              </button>
            </div>
          )}
        </>
      )}
    </WizardStepFrame>
  );
}

function ActivateProductStep({ state, onNext, onBack }: StepProps) {
  const toast = useToast();
  const [product, setProduct] = useState<ProductRow | null>(null);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => {
    if (!state.productId) return;
    void productCrud.get(state.productId).then(setProduct);
  };

  useEffect(refresh, [state.productId]);

  const handleActivate = async () => {
    if (!product) return;
    setActivating(true);
    setError(null);
    try {
      await adminAction(`/shop/admin/products/${product.id}/activate/`);
      toast.success("Product activated.");
      onNext();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Could not activate the product.";
      setError(message);
      toast.error(message, { title: "Activation failed" });
      refresh();
    } finally {
      setActivating(false);
    }
  };

  return (
    <WizardStepFrame title="Activate" onBack={onBack} description="The last step — make this product visible in the public Shop.">
      {!product ? (
        <div className="flex justify-center py-8 text-gray-500">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : (
        <>
          <div className="mb-5 flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Readiness</span>
            <ReadinessBadge readiness={product.readiness} />
          </div>
          {error && (
            <div className="mb-4 rounded-xl border border-neon-pink/30 bg-neon-pink/10 px-3 py-2 text-xs text-neon-pink">
              {error}
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleActivate()}
              disabled={activating}
              className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-black uppercase tracking-widest text-cyber-black hover:bg-neon-purple hover:text-white disabled:opacity-60"
            >
              {activating && <Loader2 size={13} className="animate-spin" />}
              Activate & Finish
            </button>
            <a
              href={`/admin/catalog/product-variants?product=${product.id}`}
              className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-gray-300 hover:text-white"
            >
              Review Variants
            </a>
          </div>
        </>
      )}
    </WizardStepFrame>
  );
}

function DoneStep({ state, onRestart }: { state: WizardState; onRestart: () => void }) {
  return (
    <WizardStepFrame title="Product Live" description={`"${state.productName}" has been created and activated.`}>
      <div className="flex flex-col gap-3">
        {state.productSlug && (
          <a
            href={`/customize/product/${state.productSlug}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between rounded-xl border border-neon-purple/30 bg-neon-purple/10 px-4 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-neon-purple/20"
          >
            Customize This Product
            <ExternalLink size={13} />
          </a>
        )}
        <a
          href="/shop"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-black uppercase tracking-widest text-gray-300 hover:text-white"
        >
          Browse Shop
          <ExternalLink size={13} />
        </a>
        <a
          href="/admin/catalog/products"
          className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-black uppercase tracking-widest text-gray-300 hover:text-white"
        >
          Open in Products
          <ArrowUpRight size={13} />
        </a>
        <button
          type="button"
          onClick={onRestart}
          className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-black uppercase tracking-widest text-gray-300 hover:text-white"
        >
          Create Another Product
          <RefreshCw size={13} />
        </button>
        <Link
          to="/admin"
          className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-black uppercase tracking-widest text-gray-300 hover:text-white"
        >
          Back to Dashboard
          <ArrowLeft size={13} />
        </Link>
      </div>
    </WizardStepFrame>
  );
}

export function ProductWizardPage() {
  const [state, setState] = useState<WizardState>(INITIAL_STATE);
  const [stepIndex, setStepIndex] = useState(0);

  const steps = visibleSteps(state.usePrintify);
  const currentStep = steps[Math.min(stepIndex, steps.length - 1)];

  const goNext = (update?: Partial<WizardState>) => {
    setState((prev) => (update ? { ...prev, ...update } : prev));
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  };
  const goBack = () => setStepIndex((i) => Math.max(i - 1, 0));
  const restart = () => {
    setState(INITIAL_STATE);
    setStepIndex(0);
  };

  const stepProps: StepProps = { state, onNext: goNext, onBack: goBack };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-black uppercase tracking-widest text-white">
            Guided Product Creation
          </h1>
          <p className="mt-1 text-xs text-gray-500">
            One continuous flow through everything a sellable product needs.
          </p>
        </div>
        <Link
          to="/admin"
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-300 hover:text-white"
        >
          <X size={13} />
          Exit to Dashboard
        </Link>
      </div>

      <StepProgress steps={steps} currentIndex={stepIndex} />
      <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">
        Step {stepIndex + 1} of {steps.length}
      </div>

      {currentStep.id === "category" && <CategoryStep {...stepProps} />}
      {currentStep.id === "blueprint" && <BlueprintStep {...stepProps} />}
      {currentStep.id === "template" && <TemplateStep {...stepProps} />}
      {currentStep.id === "parts" && <PartsStep {...stepProps} />}
      {currentStep.id === "mapping" && <MappingStep {...stepProps} />}
      {currentStep.id === "activate-template" && <ActivateTemplateStep {...stepProps} />}
      {currentStep.id === "product" && <ProductStep {...stepProps} />}
      {currentStep.id === "variants" && <VariantsStep {...stepProps} />}
      {currentStep.id === "pricing" && <PricingStep {...stepProps} />}
      {currentStep.id === "activate-product" && <ActivateProductStep {...stepProps} />}
      {currentStep.id === "done" && <DoneStep state={state} onRestart={restart} />}
    </div>
  );
}
