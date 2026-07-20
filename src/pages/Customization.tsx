import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  Layers,
  Check,
  ShoppingBag,
  Maximize2,
  HelpCircle,
  ShieldCheck,
  Truck,
  Sparkles,
  Info,
  Move,
  Crop,
  Type,
  Save,
  Loader2,
  AlertCircle,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Copy as CopyIcon,
  Undo2,
  Redo2,
  FileOutput,
  ExternalLink,
  RefreshCw,
  Image as ImageIcon,
  Upload,
  Wand2,
  Trash2,
  X,
  Search,
} from 'lucide-react';
import { cn } from '../lib/utils.ts';
import { ImageModal, SmartImage } from '../components/Common.tsx';
import { TShirtTemplate } from '../components/TShirtTemplate.tsx';
import {
  ApiError,
  createMockupRender,
  getArtworksPage,
  getDesignProject,
  createDesignProject,
  getMockupTemplates,
  getProductVariants,
  getProducts,
  replaceDesignProject,
  generatePrintFiles,
  getPrintFiles,
  uploadDesignAsset,
} from '../lib/api.ts';
import {
  isPartConfigured,
  mapDesignProjectToActiveCustomization,
  mapEditorStateToDesignProjectWriteInput,
  partNeedsRender,
  withPartUpdate,
} from '../lib/designProjectMapping.ts';
import {
  buildPrintFileDisplayResults,
  derivePrintFileGenerationState,
  printFilePartStatusLabel,
  type PrintFileGenerationState,
  type PrintFilePartDisplayResult,
} from '../lib/printFileHelpers.ts';
import { formatStartingPrice, parseStartingPrice } from '../lib/pricing.ts';
import { describeSellableSelectionReason, validateSellableSelection } from '../lib/sellableSelection.ts';
import { createDefaultArtworkTransform, type FixedPrintArea } from '../lib/artworkTransform.ts';
import type {
  ActiveCustomization,
  Artwork,
  CropOverride,
  PartCustomization,
  PlacementOverride,
  Product,
  ProductVariant,
  TextElement,
} from '../types.ts';

type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

const MIN_CROP_SIZE = 12;
const CROP_HANDLE_SIZE = 18;
const MIN_PLACEMENT_SIZE = 80;
type CropHandle =
  | 'move'
  | 'n'
  | 's'
  | 'e'
  | 'w'
  | 'ne'
  | 'nw'
  | 'se'
  | 'sw';
type PlacementHandle = 'move' | 'se';

/** One undo/redo step: everything a user-visible editing action can change. Deliberately not
 * the *entire* component state (e.g. save/UI-open flags aren't part of "did the design change"). */
interface EditorSnapshot {
  activePart: string;
  partsConfig: Record<string, PartCustomization>;
  textElements: TextElement[];
  placementDraft: { x: number; y: number; width: number; height: number } | null;
  placementRotationDraft: number | null;
  appliedCropOverride: CropOverride | null;
  cornerRadius: number;
  selectedColour: string;
  selectedSize: string;
}
const MAX_HISTORY_ENTRIES = 50;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizePlacement(placement: ActiveCustomization['basePlacement']): PlacementOverride | null {
  if (!placement) {
    return null;
  }

  const x = Number(placement.x);
  const y = Number(placement.y);
  const width = Number(placement.width);
  const height = Number(placement.height);
  const cornerRadius = Number(
    (placement as PlacementOverride & { corner_radius?: number }).corner_radius ??
      placement.cornerRadius ??
      0
  );

  if ([x, y, width, height].some((value) => Number.isNaN(value))) {
    return null;
  }

  return {
    x,
    y,
    width,
    height,
    cornerRadius: Number.isNaN(cornerRadius) ? 0 : cornerRadius,
    fit: typeof placement.fit === 'string' ? placement.fit : undefined,
    rotation:
      typeof placement.rotation === 'number' && !Number.isNaN(placement.rotation)
        ? placement.rotation
        : undefined,
    opacity:
      typeof placement.opacity === 'number' && !Number.isNaN(placement.opacity)
        ? placement.opacity
        : undefined,
  };
}

function extractPlacementFromConfig(config: Record<string, unknown> | undefined | null): PlacementOverride | null {
  const placement = (config as { placement?: unknown } | null | undefined)?.placement;
  if (!placement || typeof placement !== 'object') {
    return null;
  }
  return normalizePlacement(placement as ActiveCustomization['basePlacement']);
}

export function Customization() {
  const { activeCustomization, addToCart, setActiveCustomization } = useCart();
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const routeCustomization = (location.state as { customization?: ActiveCustomization } | null)?.customization;
  const customization = useMemo(() => {
    const candidate = activeCustomization ?? routeCustomization ?? null;
    if (!candidate) {
      return null;
    }

    return {
      ...candidate,
      basePlacement: normalizePlacement(candidate.basePlacement),
    };
  }, [activeCustomization, routeCustomization]);

  const [activePart, setActivePart] = useState<string>('front');
  const [partsConfig, setPartsConfig] = useState<Record<string, PartCustomization>>({});
  const [selectedColour, setSelectedColour] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [productVariants, setProductVariants] = useState<ProductVariant[]>([]);
  const [quantity, setQuantity] = useState<number>(1);
  const [isAdding, setIsAdding] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isRealisticPreviewOpen, setIsRealisticPreviewOpen] = useState(false);
  const [realisticPreviewUrl, setRealisticPreviewUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewRenderId, setPreviewRenderId] = useState<number | undefined>(undefined);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [isPreviewAssetLoading, setIsPreviewAssetLoading] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [designDimensions, setDesignDimensions] = useState<{ width: number; height: number } | null>(null);
  const [designHasOpaqueBackground, setDesignHasOpaqueBackground] = useState(false);

  // Image-quality check: does the source artwork look like it has a solid (non-transparent)
  // background? Sampled via a downscaled offscreen canvas rather than full-resolution pixel
  // analysis — a fast heuristic (corner alpha), not a precise transparency detector.
  useEffect(() => {
    const imageUrl = customization?.imageUrl;
    if (!imageUrl) {
      setDesignHasOpaqueBackground(false);
      return;
    }
    let cancelled = false;
    const image = new window.Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      if (cancelled) return;
      try {
        const canvas = document.createElement('canvas');
        const sampleSize = 8;
        canvas.width = sampleSize;
        canvas.height = sampleSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(image, 0, 0, sampleSize, sampleSize);
        const { data } = ctx.getImageData(0, 0, sampleSize, sampleSize);
        const corners = [0, (sampleSize - 1) * 4, sampleSize * (sampleSize - 1) * 4, (sampleSize * sampleSize - 1) * 4];
        const allOpaque = corners.every((offset) => data[offset + 3] >= 250);
        if (!cancelled) setDesignHasOpaqueBackground(allOpaque);
      } catch {
        // Cross-origin image served without permissive CORS headers taints the canvas —
        // pixels can't be read in that case. Fail open (no warning) rather than crash.
        if (!cancelled) setDesignHasOpaqueBackground(false);
      }
    };
    image.onerror = () => {
      if (!cancelled) setDesignHasOpaqueBackground(false);
    };
    image.src = imageUrl;
    return () => {
      cancelled = true;
    };
  }, [customization?.imageUrl]);
  const [placementDraft, setPlacementDraft] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [cornerRadius, setCornerRadius] = useState(0);
  const [isPlacementDragging, setIsPlacementDragging] = useState(false);
  const [snapGuides, setSnapGuides] = useState<{ vertical: 'left' | 'center' | 'right' | null; horizontal: 'top' | 'center' | 'bottom' | null }>({
    vertical: null,
    horizontal: null,
  });
  const [isCropStudioOpen, setIsCropStudioOpen] = useState(false);
  const [isCropDragging, setIsCropDragging] = useState(false);
  const [appliedCropOverride, setAppliedCropOverride] = useState<CropOverride | null>(null);
  const [draftCropRect, setDraftCropRect] = useState<CropOverride>({
    left: 0,
    top: 0,
    width: 100,
    height: 100,
  });
  const [cropStudioImageDimensions, setCropStudioImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [templateDimensions, setTemplateDimensions] = useState<{ width: number; height: number } | null>(null);
  const previewStageRef = useRef<HTMLDivElement | null>(null);
  const cropStageRef = useRef<HTMLDivElement | null>(null);
  const draftCropRectRef = useRef<CropOverride>({
    left: 0,
    top: 0,
    width: 100,
    height: 100,
  });
  const cropAnimationFrameRef = useRef<number | null>(null);
  const placementDragState = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    handle: PlacementHandle;
    originPlacement: { x: number; y: number; width: number; height: number };
    width: number;
    height: number;
  } | null>(null);
  const cropDragState = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    handle: CropHandle;
    originRect: CropOverride;
    width: number;
    height: number;
  } | null>(null);

  // Placement rotation was previously only ever a static pass-through of the template's base
  // rotation — nothing in the UI could actually change it. Two-finger pinch/twist (below) is the
  // first control that does, so it gets its own draft state alongside placementDraft.
  const [placementRotationDraft, setPlacementRotationDraft] = useState<number | null>(null);
  const pinchState = useRef<{
    initialDistance: number;
    initialAngle: number;
    originWidth: number;
    originHeight: number;
    originRotation: number;
    originX: number;
    originY: number;
  } | null>(null);

  const [textElements, setTextElements] = useState<TextElement[]>([]);
  const [activeTextId, setActiveTextId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'design' | 'text'>('design');
  const textDragState = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    id: string;
    originX: number;
    originY: number;
    width: number;
    height: number;
  } | null>(null);

  // --- Saved design project: loading, naming, save status ---
  const projectIdParam = searchParams.get('project');
  // /customize/product/:productId — the Shop-catalogue entry point (section 1/16 of the
  // Shop-to-Customization redesign). Distinct from `projectIdParam` above (reopening a saved
  // project) and from the plain `/customize` + CartContext.setActiveCustomization state path
  // (still used by Generator.tsx's own, unrelated design-first flow) — these three modes are
  // never mixed: whichever populates `activeCustomization`/`routeCustomization` first, for a
  // given navigation, is authoritative.
  const routeProductId = useParams<{ productId?: string }>().productId;
  const [currentProjectId, setCurrentProjectId] = useState<number | undefined>(undefined);
  const [projectName, setProjectName] = useState('');
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [projectLoadError, setProjectLoadError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [finalizationStage, setFinalizationStage] = useState<string | null>(null);
  // Production print-file generation — deliberately its own state, never the mockup-preview
  // save/render status above, so the two can never be conflated in the UI (see the "Mockup
  // Preview" vs "Production Print Files" labelling on the panel that uses these).
  const [printFileGenerationState, setPrintFileGenerationState] = useState<PrintFileGenerationState>('idle');
  const [printFileResults, setPrintFileResults] = useState<PrintFilePartDisplayResult[]>([]);
  const [printFileGenerationError, setPrintFileGenerationError] = useState<string | null>(null);
  const skipNextDirtyRef = useRef(false);
  const skipNextPartDirtyRef = useRef(false);
  // Separate from skipNextPartDirtyRef: that ref gets consumed (reset to false) by the
  // placement/crop/text effect, which runs in the same commit as this one whenever
  // restoreEditorSnapshot (undo/redo) changes everything at once — sharing one ref between two
  // effects declared in sequence means the first to run would silently swallow it before the
  // second ever sees it. Its own ref avoids that ordering hazard.
  const skipNextVariantStaleRef = useRef(true);
  const pendingSaveAfterLoginRef = useRef(false);
  const loadedProjectIdRef = useRef<number | undefined>(undefined);
  const loadedProductIdRef = useRef<string | undefined>(undefined);

  // --- Undo/redo: one history entry per *gesture* (a whole drag, not every pointermove), and
  // one per discrete action (add/remove text, colour/size change, part switch). Kept as a ref
  // (not state) since the stacks themselves don't need to trigger re-renders — only a small
  // "how many entries are there" counter does, for enabling/disabling the undo/redo buttons.
  const historyRef = useRef<{ past: EditorSnapshot[]; future: EditorSnapshot[] }>({ past: [], future: [] });
  const [historyCounts, setHistoryCounts] = useState({ past: 0, future: 0 });

  useEffect(() => {
    const idFromUrl = projectIdParam ? Number(projectIdParam) : undefined;
    if (!idFromUrl || Number.isNaN(idFromUrl) || loadedProjectIdRef.current === idFromUrl) {
      return;
    }

    let isCancelled = false;
    loadedProjectIdRef.current = idFromUrl;
    setIsLoadingProject(true);
    setProjectLoadError(null);
    // Clear whatever customization is currently showing (a different, previously-loaded
    // project or product — including one restored from localStorage on mount) BEFORE fetching
    // the new one. Without this, `customization` (activeCustomization ?? routeCustomization)
    // stays truthy with the OLD data for the whole fetch, so the "Loading customization" state
    // never shows and the screen looks like it's stuck on the wrong project/template instead of
    // loading — the actual fetch below is fast; the stale screen was the bug, not slowness.
    setActiveCustomization(null);

    // Resolved from the real Product's server-computed starting price (never the template's
    // config, which is preview-only and no longer treated as a selling price — see
    // lib/pricing.ts / lib/sellableSelection.ts). getProducts() only ever returns
    // active+sellable products, so a restored project's product not appearing here (e.g. it was
    // deactivated, or its only variant became unsellable, since this project was last saved)
    // legitimately resolves to null — the colour/size picker below independently detects and
    // blocks on that case via productVariants' own is_available/is_sellable flags.
    Promise.all([getDesignProject(idFromUrl), getProducts().catch(() => [] as Product[])])
      .then(([project, products]) => {
        if (isCancelled) return;
        const matchedProduct = project.product
          ? products.find((candidate) => Number(candidate.id) === project.product!.id)
          : undefined;
        const nextCustomization = mapDesignProjectToActiveCustomization(project, {
          startingPrice: matchedProduct ? parseStartingPrice(matchedProduct.startingPrice) : null,
          sizes: project.mockupTemplate.supportedSizes,
          colours: project.mockupTemplate.supportedColors,
        });
        skipNextDirtyRef.current = true;
        skipNextPartDirtyRef.current = true;
        setActiveCustomization(nextCustomization);
        setCurrentProjectId(project.id);
        setProjectName(project.name);
        setSaveStatus('idle');
      })
      .catch((error) => {
        if (isCancelled) return;
        loadedProjectIdRef.current = undefined;
        setProjectLoadError(error instanceof Error ? error.message : 'Could not load this saved design.');
      })
      .finally(() => {
        if (!isCancelled) setIsLoadingProject(false);
      });

    return () => {
      isCancelled = true;
      // React 18 StrictMode double-invokes effects in development: mount -> cleanup -> mount
      // again. Without this reset, the *first* invocation's cleanup fires (marking its own
      // isCancelled true) before the fetch resolves, but the guard above still sees
      // loadedProjectIdRef.current === idFromUrl on the second invocation and skips re-fetching
      // — so the one in-flight request that actually exists is permanently ignored by its own
      // `if (isCancelled) return` checks, and the screen is stuck loading forever. Resetting the
      // ref here (only if nothing else has already claimed it) lets the next invocation retry.
      if (loadedProjectIdRef.current === idFromUrl) {
        loadedProjectIdRef.current = undefined;
      }
    };
  }, [projectIdParam, setActiveCustomization]);

  // /customize/product/:productId — opens a BLANK customization for a real, sellable product:
  // its first sellable variant is pre-selected, but no artwork/placement exists yet (section 1/5
  // of the Shop-to-Customization redesign — "choose artwork inside the customization screen,"
  // never before). Never runs if a saved project is being loaded via ?project= above (that
  // effect and this one are mutually exclusive per navigation, guarded by their own ref).
  useEffect(() => {
    if (!routeProductId || loadedProductIdRef.current === routeProductId) {
      return;
    }

    let isCancelled = false;
    loadedProductIdRef.current = routeProductId;
    setIsLoadingProject(true);
    setProjectLoadError(null);
    // See the identical comment on the ?project= loader above — clear stale customization
    // (a different product/project, or one restored from localStorage) before fetching, so a
    // product-to-product navigation doesn't keep showing the previous product's template while
    // this resolves.
    setActiveCustomization(null);

    Promise.all([getProducts(), getMockupTemplates()])
      .then(([products, templates]) => {
        if (isCancelled) return;

        const product = products.find((candidate) => candidate.id === routeProductId);
        if (!product) {
          setProjectLoadError('This product is no longer available.');
          return;
        }

        const defaultVariant = product.variants?.find((variant) => variant.isAvailable && variant.isSellable) ?? null;
        const sellable = validateSellableSelection(product, defaultVariant);
        if (!sellable.selection) {
          setProjectLoadError(
            describeSellableSelectionReason(sellable.reason) ?? 'This product is not currently available for customization.'
          );
          return;
        }

        const template = templates.find((candidate) => candidate.id === product.mockupTemplateId);
        if (!template) {
          setProjectLoadError('This product is not linked to a customizable template.');
          return;
        }

        const blankCustomization: ActiveCustomization = {
          artworkId: '',
          userPrompt: '',
          imageUrl: '',
          templateId: template.id,
          templateName: template.name,
          productType: template.productTypeDisplay,
          productId: Number(product.id),
          selectedVariantId: sellable.selection.variant.id,
          mockupImageUrl: template.baseImage || '',
          templateBaseImageUrl: template.baseImage,
          templateMaskImageUrl: template.maskImage,
          templateShadowLayerUrl: template.shadowLayer,
          templateHighlightLayerUrl: template.highlightLayer,
          templateParts: template.parts,
          startingPrice: sellable.selection.startingPrice,
          sizes: product.availableSizes && product.availableSizes.length > 0 ? product.availableSizes : [...template.supportedSizes],
          colours:
            product.availableColors && product.availableColors.length > 0 ? product.availableColors : [...template.supportedColors],
          basePlacement: null,
          textElements: [],
          partsConfig: {},
        };

        skipNextDirtyRef.current = true;
        skipNextPartDirtyRef.current = true;
        setActiveCustomization(blankCustomization);
        setCurrentProjectId(undefined);
        setProjectName('');
        setSaveStatus('idle');
      })
      .catch((error) => {
        if (isCancelled) return;
        loadedProductIdRef.current = undefined;
        setProjectLoadError(error instanceof Error ? error.message : 'Could not load this product.');
      })
      .finally(() => {
        if (!isCancelled) setIsLoadingProject(false);
      });

    return () => {
      isCancelled = true;
      // See the identical comment on the ?project= loader above — without this reset, React 18
      // StrictMode's dev-mode double-invoke leaves the one real in-flight request permanently
      // ignored by its own isCancelled checks, and the guard blocks the second invocation from
      // retrying, so the screen never leaves the loading state.
      if (loadedProductIdRef.current === routeProductId) {
        loadedProductIdRef.current = undefined;
      }
    };
  }, [routeProductId, setActiveCustomization]);

  // Mark the project dirty on any change that would need saving — but not on the render
  // right after we just loaded or saved (skipNextDirtyRef swallows exactly one run).
  useEffect(() => {
    if (skipNextDirtyRef.current) {
      skipNextDirtyRef.current = false;
      return;
    }
    setSaveStatus((current) => (current === 'saving' ? current : 'dirty'));
    // placementRotationDraft: rotation (set via the pinch/twist gesture) previously wasn't in
    // this dependency list at all — a rotation-only edit silently left the project marked
    // clean/saved even though the resolved placement had actually changed. Fixed here since an
    // un-flagged rotation change is exactly the kind of edit that must also invalidate a
    // part's production print file (see the per-part effect below).
  }, [partsConfig, projectName, selectedColour, selectedSize, textElements, placementDraft, placementRotationDraft, appliedCropOverride, cornerRadius]);

  // Mark only the ACTIVE part dirty (mockup preview) AND its production print file stale when
  // its printable properties change (placement, rotation, crop, text, corner radius — fit/
  // opacity live inside placementOverride once resolved). Deliberately narrower than the effect
  // above: project name/colour/size are project-level, not part-level (see the colour/size
  // effect further below, which invalidates every part instead) — switching tabs or opening/
  // closing a panel must not dirty a part — handlePartChange sets skipNextPartDirtyRef before
  // restoring the newly-active part's saved values, so the resulting state change here is
  // swallowed instead of misread as an edit.
  useEffect(() => {
    if (skipNextPartDirtyRef.current) {
      skipNextPartDirtyRef.current = false;
      return;
    }
    setPartsConfig((prev) => {
      if (prev[activePart]?.isDirty && prev[activePart]?.isPrintFileStale) {
        return prev;
      }
      return { ...prev, [activePart]: { ...prev[activePart], isDirty: true, isPrintFileStale: true } };
    });
  }, [placementDraft, placementRotationDraft, appliedCropOverride, textElements, cornerRadius]);

  // A colour/size (variant) change can change which parts are printable at all, or their
  // required production dimensions (a different variant can map to a different template/part
  // config) — invalidate every configured part's production file, not just the active one,
  // since parts other than the active tab could be affected without the user ever touching them
  // directly. Guarded by its own ref (see skipNextVariantStaleRef's declaration) rather than
  // skipNextPartDirtyRef, so a fresh project load or an undo/redo that also happens to change
  // colour/size doesn't get misread as the user actually picking a different colour/size.
  useEffect(() => {
    if (skipNextVariantStaleRef.current) {
      skipNextVariantStaleRef.current = false;
      return;
    }
    setPartsConfig((prev) => {
      let changed = false;
      const next: Record<string, PartCustomization> = {};
      for (const [partName, part] of Object.entries(prev)) {
        if (part.isPrintFileStale || !isPartConfigured(part)) {
          next[partName] = part;
          continue;
        }
        changed = true;
        next[partName] = { ...part, isPrintFileStale: true };
      }
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedColour, selectedSize]);

  // Centralized part-state updater (section 6): route part edits through here instead of
  // scattering `setPartsConfig` + manual `isDirty` bookkeeping across handlers — this and the
  // checkout finalization loop both delegate the actual merge/isDirty logic to the same pure
  // `withPartUpdate` helper, so there's exactly one place that decides how a change affects
  // dirtiness rather than two copies that could drift.
  const updatePartCustomization = (
    partName: string,
    changes: Partial<PartCustomization>,
    options?: { markDirty?: boolean }
  ) => {
    setPartsConfig((prev) => withPartUpdate(prev, partName, changes, options));
  };

  // --- Artwork action menu: Choose from Gallery / Upload Design / Generate with AI / Remove ---
  // (section 6-13 of the Shop-to-Customization redesign). Every source funnels through
  // applyArtworkToActivePart so there's one place that decides the default placement, clears
  // any previous source (a part has exactly one artwork source at a time — gallery XOR upload
  // XOR AI), and marks the part dirty/print-file-stale — never three slightly different copies.
  const [isGallerySelectorOpen, setIsGallerySelectorOpen] = useState(false);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const applyArtworkToActivePart = (source: {
    sourceArtworkId?: number;
    sourceGeneratedImageId?: number;
    sourceAssetId?: number;
    imageUrl: string;
    width?: number | null;
    height?: number | null;
  }) => {
    const printArea: FixedPrintArea = activeFixedPrintArea ?? { x: 0, y: 0, width: 800, height: 800 };
    const transform =
      source.width && source.height
        ? createDefaultArtworkTransform(source.width, source.height, printArea)
        : { x: printArea.x, y: printArea.y, width: printArea.width, height: printArea.height };

    const placementOverride: PlacementOverride = {
      x: transform.x,
      y: transform.y,
      width: transform.width,
      height: transform.height,
      fit: 'contain',
      rotation: 0,
      opacity: 1,
      cornerRadius: 0,
    };

    pushHistorySnapshot();
    // Explicitly clears whichever of the three source-id fields this call didn't set — a part
    // has exactly one artwork source at a time, switching from e.g. a Gallery pick to an Upload
    // must not leave the old sourceArtworkId dangling alongside the new sourceAssetId.
    updatePartCustomization(activePart, {
      sourceArtworkId: source.sourceArtworkId,
      sourceGeneratedImageId: source.sourceGeneratedImageId,
      sourceAssetId: source.sourceAssetId,
      imageUrl: source.imageUrl,
      userPrompt: undefined,
      placementOverride,
      cropOverride: undefined,
    });

    setPlacementDraft({ x: transform.x, y: transform.y, width: transform.width, height: transform.height });
    setPlacementRotationDraft(0);
    setCornerRadius(0);
    setAppliedCropOverride(null);
    setDraftCropRect({ left: 0, top: 0, width: 100, height: 100 });
    setDesignDimensions(source.width && source.height ? { width: source.width, height: source.height } : null);
    setIsPreviewAssetLoading(true);
  };

  const removeActivePartArtwork = () => {
    pushHistorySnapshot();
    updatePartCustomization(activePart, {
      sourceArtworkId: undefined,
      sourceGeneratedImageId: undefined,
      sourceAssetId: undefined,
      imageUrl: undefined,
      userPrompt: undefined,
    });
    setDesignDimensions(null);
  };

  const handleGallerySelect = async (artwork: Artwork) => {
    const dimensions = await readImageDimensions(artwork.imageUrl);
    applyArtworkToActivePart({
      sourceArtworkId: artwork.backendArtworkId,
      imageUrl: artwork.imageUrl,
      width: dimensions?.width,
      height: dimensions?.height,
    });
    setIsGallerySelectorOpen(false);
  };

  const readImageDimensions = (url: string): Promise<{ width: number; height: number } | null> =>
    new Promise((resolve) => {
      const probe = new Image();
      probe.onload = () => resolve({ width: probe.naturalWidth, height: probe.naturalHeight });
      probe.onerror = () => resolve(null);
      probe.src = url;
    });

  const handleFileSelected = async (file: File | null) => {
    if (!file) return;
    setUploadError(null);

    const allowedTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);
    if (!allowedTypes.has(file.type)) {
      setUploadError('Unsupported file type. Please upload a PNG, JPEG, or WEBP image.');
      return;
    }
    const maxSizeBytes = 15 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setUploadError('File is too large. Maximum is 15MB.');
      return;
    }

    setIsUploading(true);
    try {
      const asset = await uploadDesignAsset(file, 'user_upload');
      if (!asset.fileUrl) {
        throw new Error('Upload succeeded but no file was returned.');
      }
      applyArtworkToActivePart({
        sourceAssetId: asset.id,
        imageUrl: asset.fileUrl,
        width: asset.width,
        height: asset.height,
      });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Could not upload this file. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // "Generate with AI" — a self-contained, minimal reproduction of Generator.tsx's own
  // client-side Gemini call (prompt + aspect ratio -> data: URL), embedded directly in the
  // customization action menu rather than navigating away (section 12). Deliberately NOT a
  // shared hook with Generator.tsx: that page's generation flow has its own unrelated
  // state/Firestore-save behaviour, and duplicating this one, stable, ~20-line API call is
  // lower-risk than refactoring two pages to share it.
  const AI_ASPECT_RATIO_OPTIONS = [
    { value: '1:1', label: 'Square' },
    { value: '4:3', label: 'Classic' },
    { value: '3:4', label: 'Portrait' },
    { value: '16:9', label: 'Cinematic' },
    { value: '9:16', label: 'Story' },
  ] as const;
  const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiAspectRatio, setAiAspectRatio] = useState<(typeof AI_ASPECT_RATIO_OPTIONS)[number]['value']>('1:1');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiApplying, setAiApplying] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiGeneratedImage, setAiGeneratedImage] = useState<string | null>(null);

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    if (!geminiApiKey) {
      setAiError('AI generation is not configured for this environment.');
      return;
    }
    setAiGenerating(true);
    setAiError(null);
    setAiGeneratedImage(null);
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: `Digital art, cyberpunk style, neon lights, highly detailed, futuristic: ${aiPrompt}` }] },
        config: { imageConfig: { aspectRatio: aiAspectRatio } },
      });

      const parts = response.candidates?.[0]?.content?.parts ?? [];
      const imagePart = parts.find((part) => part.inlineData?.data);
      if (!imagePart?.inlineData?.data) {
        throw new Error('No image was returned. Try a different prompt.');
      }
      setAiGeneratedImage(`data:image/png;base64,${imagePart.inlineData.data}`);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'Image generation failed. Please try again.');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleAiSelectGenerated = async () => {
    if (!aiGeneratedImage) return;
    setAiApplying(true);
    setAiError(null);
    try {
      const blob = await fetch(aiGeneratedImage).then((response) => response.blob());
      const asset = await uploadDesignAsset(blob, 'ai_generated', aiPrompt.trim().slice(0, 255));
      if (!asset.fileUrl) {
        throw new Error('Generation succeeded but the image could not be saved.');
      }
      applyArtworkToActivePart({
        sourceAssetId: asset.id,
        imageUrl: asset.fileUrl,
        width: asset.width,
        height: asset.height,
      });
      setIsAiPanelOpen(false);
      setAiPrompt('');
      setAiGeneratedImage(null);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'Could not save this generated image. Please try again.');
    } finally {
      setAiApplying(false);
    }
  };

  // --- Gallery selector: paginated, searchable admin-uploaded designs (section 7) ---
  const [galleryArtworks, setGalleryArtworks] = useState<Artwork[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [gallerySearchInput, setGallerySearchInput] = useState('');
  const [gallerySearch, setGallerySearch] = useState('');
  const [galleryPage, setGalleryPage] = useState(1);
  const [galleryTotalPages, setGalleryTotalPages] = useState(1);

  useEffect(() => {
    if (!isGallerySelectorOpen) return;
    const debounce = setTimeout(() => {
      setGallerySearch(gallerySearchInput);
      setGalleryPage(1);
    }, 400);
    return () => clearTimeout(debounce);
  }, [gallerySearchInput, isGallerySelectorOpen]);

  useEffect(() => {
    if (!isGallerySelectorOpen) return;
    let isCancelled = false;
    setGalleryLoading(true);
    setGalleryError(null);

    getArtworksPage({ page: galleryPage, pageSize: 20, search: gallerySearch || undefined })
      .then((response) => {
        if (isCancelled) return;
        setGalleryArtworks(response.results);
        setGalleryTotalPages(response.totalPages);
      })
      .catch((error) => {
        if (isCancelled) return;
        setGalleryError(error instanceof Error ? error.message : 'Could not load the gallery.');
        setGalleryArtworks([]);
      })
      .finally(() => {
        if (!isCancelled) setGalleryLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [isGallerySelectorOpen, galleryPage, gallerySearch]);

  useEffect(() => {
    if (!activeCustomization && routeCustomization) {
      setActiveCustomization(routeCustomization);
    }
  }, [activeCustomization, routeCustomization, setActiveCustomization]);

  useEffect(() => {
    draftCropRectRef.current = draftCropRect;
  }, [draftCropRect]);

  useEffect(() => {
    return () => {
      if (cropAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(cropAnimationFrameRef.current);
      }
    };
  }, []);

  // Initialize selected defaults from active customization
  useEffect(() => {
    if (customization) {
      // The colour/size defaults set below are initialization, not the user picking a
      // different variant — don't let the colour/size stale-marking effect misread them.
      skipNextVariantStaleRef.current = true;
      setPreviewRenderId(undefined);
      setPreviewLoading(false);
      setIsPreviewAssetLoading(true);
      setPreviewError(null);
      setDesignDimensions(null);
      setTemplateDimensions(null);
      setCropStudioImageDimensions(null);
      setPlacementDraft(null);
      setPlacementRotationDraft(null);
      setCornerRadius(0);
      setIsCropStudioOpen(false);
      setAppliedCropOverride(null);
      setDraftCropRect({ left: 0, top: 0, width: 100, height: 100 });
      if (customization.colours && customization.colours.length > 0) {
        setSelectedColour(customization.colours[0]);
      }
      if (customization.sizes && customization.sizes.length > 0) {
        setSelectedSize(customization.sizes[0]);
      }
      setTextElements(customization.textElements || []);
      setActiveTextId(null);
      setActiveTab('design');
      setPartsConfig(customization.partsConfig ? { ...customization.partsConfig } : {});
      setActivePart('front');
      historyRef.current = { past: [], future: [] };
      setHistoryCounts({ past: 0, future: 0 });
    }
  }, [customization]);

  const activeTemplatePart = useMemo(() => {
    if (!customization?.templateParts) {
      return null;
    }
    return customization.templateParts.find((part) => part.name === activePart) ?? null;
  }, [customization, activePart]);

  // Product-view system: which print areas does the currently selected colour/size actually
  // support? Only fetched for real storefront products (productId set) — template-only flows
  // (no linked Product yet) have no variant-level restriction to enforce.
  useEffect(() => {
    if (!customization?.productId) {
      setProductVariants([]);
      return;
    }
    let cancelled = false;
    getProductVariants({ productId: customization.productId })
      .then((variants) => {
        if (!cancelled) setProductVariants(variants);
      })
      .catch(() => {
        if (!cancelled) setProductVariants([]);
      });
    return () => {
      cancelled = true;
    };
  }, [customization?.productId]);

  const selectedVariant = useMemo(() => {
    if (productVariants.length === 0) return null;
    return (
      productVariants.find(
        (variant) => variant.colorName === selectedColour && variant.size === selectedSize
      ) ?? null
    );
  }, [productVariants, selectedColour, selectedSize]);

  const sellableVariants = useMemo(
    () => productVariants.filter((variant) => variant.isAvailable && variant.isSellable),
    [productVariants]
  );

  // A restored saved design (opened via /customize?project=<id>) vs. a fresh customization
  // entered from Shop/Generator — governs whether an unsellable current selection gets silently
  // corrected (fresh) or surfaced as a blocking "no longer available" state instead (restored;
  // see section 16 — never silently swap a restored design's variant out from under the user).
  const isRestoredProject = customization?.designProjectId !== undefined;

  // Fresh customization only: once real variant data has loaded, if the naive default (first
  // colour/size from the template/product lists — set by the initialization effect above, before
  // sellability is known) isn't actually sellable, switch to the first variant that is. Never
  // touches a restored project's selection — see restoredVariantIsInvalid below for that case.
  useEffect(() => {
    if (isRestoredProject || sellableVariants.length === 0) {
      return;
    }
    const currentIsSellable = sellableVariants.some(
      (variant) => variant.colorName === selectedColour && variant.size === selectedSize
    );
    if (currentIsSellable) {
      return;
    }
    const firstSellable = sellableVariants[0];
    // This is a corrective default, not the user picking a different variant — don't let it
    // falsely mark every configured part's production file stale.
    skipNextVariantStaleRef.current = true;
    setSelectedColour(firstSellable.colorName);
    setSelectedSize(firstSellable.size);
    // Deliberately not depending on selectedColour/selectedSize — this effect corrects an
    // out-of-date default exactly once per variant-data load, it must not fight the user's own
    // subsequent colour/size picks (which may legitimately be a different, still-sellable variant).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellableVariants, isRestoredProject]);

  // Restored project only: the saved colour/size no longer resolves to a sellable variant (the
  // admin marked it unavailable/missing-cost, or discontinued it, since this project was saved).
  // Blocking, not silently corrected — see the "This product option is no longer available"
  // banner near the colour/size picker below.
  const restoredVariantIsInvalid = useMemo(() => {
    if (!isRestoredProject || !customization?.productId || productVariants.length === 0) {
      return false;
    }
    const current = productVariants.find(
      (variant) => variant.colorName === selectedColour && variant.size === selectedSize
    );
    return !current || !(current.isAvailable && current.isSellable);
  }, [isRestoredProject, customization?.productId, productVariants, selectedColour, selectedSize]);

  // A minimal Product-shaped object for validateSellableSelection() — Customization.tsx never
  // fetches a full Product record of its own; `startingPrice` is passed through unchanged from
  // wherever this customization was entered (Shop.tsx/Generator.tsx's own validated selection, or
  // the restored-project loader above), never recomputed here (the true starting price depends on
  // server-side markup rules this page has no access to). availability/counts, unlike price, ARE
  // accurately derivable client-side from productVariants' own is_available/is_sellable flags.
  const productForSellabilityGuard: Product | null = useMemo(() => {
    if (!customization?.productId) {
      return null;
    }
    return {
      id: String(customization.productId),
      name: customization.templateName ?? customization.productType,
      category: '',
      startingPrice:
        customization.startingPrice !== null && customization.startingPrice !== undefined
          ? String(customization.startingPrice)
          : null,
      isAvailable: sellableVariants.length > 0,
      availableVariantCount: sellableVariants.length,
      totalVariantCount: productVariants.length,
      imageUrl: customization.mockupImageUrl,
      variants: productVariants,
    };
  }, [customization, productVariants, sellableVariants.length]);

  /** The one guard for every purchasable action on this page (enabling "Add to Cart", the price
   * display below) — see lib/sellableSelection.ts. `selection` is non-null only when there's a
   * real product AND the currently selected colour/size resolves to a sellable variant. */
  const sellableSelection = useMemo(
    () => validateSellableSelection(productForSellabilityGuard, selectedVariant),
    [productForSellabilityGuard, selectedVariant]
  );

  /** Per-value (not per-combo — colour and size are independent selectors in this UI, not a
   * combined grid) disabled state + reason for the colour/size pickers below. No variant data at
   * all (productVariants.length === 0 — template-only preview, or not loaded yet) never disables
   * anything — that's the existing "no restriction known" behaviour, unchanged. A colour/size
   * IS disabled only once real variant data shows every matching row is unavailable/unsellable. */
  const describeOptionSellability = (kind: 'colour' | 'size', value: string): { disabled: boolean; reason: string | null } => {
    if (productVariants.length === 0) {
      return { disabled: false, reason: null };
    }
    const matches = productVariants.filter((variant) =>
      kind === 'colour' ? variant.colorName === value : variant.size === value
    );
    if (matches.length === 0) {
      // The template lists this as an option but no variant backs it at all — nothing to
      // disable against (matches this page's existing template-fallback behaviour).
      return { disabled: false, reason: null };
    }
    if (matches.some((variant) => variant.isAvailable && variant.isSellable)) {
      return { disabled: false, reason: null };
    }
    if (matches.every((variant) => !variant.isAvailable)) {
      return { disabled: true, reason: 'Unavailable' };
    }
    if (matches.some((variant) => variant.isAvailable && !variant.pricingReady)) {
      return { disabled: true, reason: 'Pricing not configured' };
    }
    return { disabled: true, reason: 'Not supported' };
  };

  /** Print areas the current colour/size can actually print on — null means "no restriction
   * known" (no variant resolved yet, or the resolved variant declares no restriction), which
   * callers should treat as "everything's available", not as "nothing's available". */
  const supportedPrintAreas = useMemo(() => {
    if (!selectedVariant || selectedVariant.supportedPrintAreas.length === 0) {
      return null;
    }
    return new Set(selectedVariant.supportedPrintAreas);
  }, [selectedVariant]);

  // If switching colour/size drops support for the currently active part, jump to the first
  // part that's still printable rather than leaving the editor showing a disabled tab.
  useEffect(() => {
    if (!supportedPrintAreas || supportedPrintAreas.has(activePart)) {
      return;
    }
    const firstSupported = customization?.templateParts?.find((part) => supportedPrintAreas.has(part.name));
    if (firstSupported) {
      handlePartChange(firstSupported.name);
    }
    // handlePartChange is stable across renders for this purpose; omitting it avoids re-running
    // this effect on every keystroke elsewhere in the editor that happens to redefine it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supportedPrintAreas, activePart, customization?.templateParts]);

  /** The admin-configured, non-draggable print boundary for the active part — derived purely
   * from `activeTemplatePart.config.placement` (falling back to the template's top-level
   * basePlacement when the part has no explicit config), never from `placementDraft`. Dragging,
   * resizing, or switching the active design only ever changes `placementDraft` — this stays
   * fixed regardless, which is what makes it the reference clamp/snap boundary for the
   * draggable artwork box rather than the whole garment canvas. Mirrors the backend's
   * get_fixed_print_area() so the editor and the production-file pipeline agree on where the
   * printable region actually is. */
  const activeFixedPrintArea = useMemo(() => {
    const configuredArea = extractPlacementFromConfig(activeTemplatePart?.config) ?? customization?.basePlacement ?? null;
    if (!configuredArea) {
      return null;
    }
    return {
      x: configuredArea.x,
      y: configuredArea.y,
      width: configuredArea.width,
      height: configuredArea.height,
    };
  }, [activeTemplatePart, customization?.basePlacement]);

  const previewResolvedPlacement = useMemo(() => {
    // `customization.basePlacement` is only ever populated for the legacy single-image flow
    // (opened straight from the Generator with a design already placed). The blank
    // Shop-to-Customization flow opens with it explicitly `null` — the per-part
    // `activeFixedPrintArea` (admin-configured print area, or a sane default) is the real
    // source of truth for where a freshly-applied design's box starts out. `placementDraft`,
    // once set (by picking/dragging/resizing artwork), always wins over either fallback.
    const fallbackPlacement = customization?.basePlacement ?? activeFixedPrintArea;
    if (!placementDraft && !fallbackPlacement) {
      return null;
    }

    const activePlacement = placementDraft ?? {
      x: fallbackPlacement!.x,
      y: fallbackPlacement!.y,
      width: fallbackPlacement!.width,
      height: fallbackPlacement!.height,
    };

    return {
      x: Math.round(activePlacement.x),
      y: Math.round(activePlacement.y),
      width: Math.max(MIN_PLACEMENT_SIZE, Math.round(activePlacement.width)),
      height: Math.max(MIN_PLACEMENT_SIZE, Math.round(activePlacement.height)),
      cornerRadius: Math.max(0, Math.round(cornerRadius)),
      fit: customization?.basePlacement?.fit ?? 'contain',
      rotation: placementRotationDraft ?? customization?.basePlacement?.rotation ?? 0,
      opacity: customization?.basePlacement?.opacity ?? 1,
    };
  }, [activeFixedPrintArea, cornerRadius, customization, placementDraft, placementRotationDraft]);

  const previewFixedPrintAreaStyle = useMemo(() => {
    if (!activeFixedPrintArea || !templateDimensions) {
      return null;
    }
    return {
      left: `${(activeFixedPrintArea.x / templateDimensions.width) * 100}%`,
      top: `${(activeFixedPrintArea.y / templateDimensions.height) * 100}%`,
      width: `${(activeFixedPrintArea.width / templateDimensions.width) * 100}%`,
      height: `${(activeFixedPrintArea.height / templateDimensions.height) * 100}%`,
    };
  }, [activeFixedPrintArea, templateDimensions]);

  const previewPlacementStyle = useMemo(() => {
    if (!previewResolvedPlacement || !templateDimensions) {
      return null;
    }

    return {
      left: `${(previewResolvedPlacement.x / templateDimensions.width) * 100}%`,
      top: `${(previewResolvedPlacement.y / templateDimensions.height) * 100}%`,
      width: `${(previewResolvedPlacement.width / templateDimensions.width) * 100}%`,
      height: `${(previewResolvedPlacement.height / templateDimensions.height) * 100}%`,
    };
  }, [previewResolvedPlacement, templateDimensions]);

  // Safe area is expressed as percentages *within the fixed print area* (not the whole canvas,
  // and deliberately not the draggable artwork box either — see activeFixedPrintArea's
  // docstring) — resolve it against the fixed area's own pixel bounds, then convert to
  // canvas-relative percentages so it can be rendered as a sibling of the artwork box and stay
  // in place while the artwork is dragged or resized.
  const previewSafeAreaStyle = useMemo(() => {
    const safeArea = activeTemplatePart?.safeArea;
    if (!safeArea || !activeFixedPrintArea || !templateDimensions) return null;
    const areaLeftPx = activeFixedPrintArea.x + (safeArea.left / 100) * activeFixedPrintArea.width;
    const areaTopPx = activeFixedPrintArea.y + (safeArea.top / 100) * activeFixedPrintArea.height;
    const areaWidthPx = (safeArea.width / 100) * activeFixedPrintArea.width;
    const areaHeightPx = (safeArea.height / 100) * activeFixedPrintArea.height;
    return {
      left: `${(areaLeftPx / templateDimensions.width) * 100}%`,
      top: `${(areaTopPx / templateDimensions.height) * 100}%`,
      width: `${(areaWidthPx / templateDimensions.width) * 100}%`,
      height: `${(areaHeightPx / templateDimensions.height) * 100}%`,
    };
  }, [activeTemplatePart, activeFixedPrintArea, templateDimensions]);

  // Bleed is pixels *beyond the fixed print area's edge* — expand outward from the fixed area
  // (not the moving artwork box), so it also stays put while the artwork is dragged or resized.
  const previewBleedAreaStyle = useMemo(() => {
    const bleedArea = activeTemplatePart?.bleedArea;
    if (!bleedArea || !activeFixedPrintArea || !templateDimensions) return null;
    const bleedLeftPct = (bleedArea.left / templateDimensions.width) * 100;
    const bleedRightPct = (bleedArea.right / templateDimensions.width) * 100;
    const bleedTopPct = (bleedArea.top / templateDimensions.height) * 100;
    const bleedBottomPct = (bleedArea.bottom / templateDimensions.height) * 100;
    const leftPct = (activeFixedPrintArea.x / templateDimensions.width) * 100 - bleedLeftPct;
    const topPct = (activeFixedPrintArea.y / templateDimensions.height) * 100 - bleedTopPct;
    const widthPct = (activeFixedPrintArea.width / templateDimensions.width) * 100 + bleedLeftPct + bleedRightPct;
    const heightPct = (activeFixedPrintArea.height / templateDimensions.height) * 100 + bleedTopPct + bleedBottomPct;
    return {
      left: `${leftPct}%`,
      top: `${topPct}%`,
      width: `${widthPct}%`,
      height: `${heightPct}%`,
    };
  }, [activeTemplatePart, activeFixedPrintArea, templateDimensions]);

  const imageQualityWarnings = useMemo(() => {
    const warnings: string[] = [];
    if (!isPartConfigured(partsConfig[activePart]) && !customization?.imageUrl) {
      return warnings;
    }

    if (designHasOpaqueBackground) {
      warnings.push(
        'This image looks like it has a solid background rather than a transparent one — it may print with an unwanted coloured box around it.'
      );
    }

    if (designDimensions && previewResolvedPlacement && templateDimensions && activeTemplatePart?.printFileWidth) {
      // Estimate: how many source pixels does the print area need per canvas pixel at the
      // template's required print resolution, then check whether the source image has enough
      // native pixels to fill the placement box at that density. An estimate, not an exact DPI
      // calculation — the mockup canvas and the real print file aren't guaranteed to be
      // pixel-proportional, but this catches the common case (a small web image stretched large).
      const requiredSourcePxPerCanvasPx = activeTemplatePart.printFileWidth / templateDimensions.width;
      const requiredSourceWidth = previewResolvedPlacement.width * requiredSourcePxPerCanvasPx;
      if (designDimensions.width < requiredSourceWidth * 0.6) {
        warnings.push('This image is quite small for the area it covers — the print may look blurry or pixelated.');
      } else if (designDimensions.width < requiredSourceWidth * 0.9) {
        warnings.push('This image is a little low-resolution for how large it\'s displayed — consider a higher-resolution source.');
      }
    } else if (designDimensions && (designDimensions.width < 500 || designDimensions.height < 500)) {
      // No template print-file target to compare against yet — fall back to a flat minimum.
      warnings.push('This image is quite low-resolution — it may look blurry when printed.');
    }

    return warnings;
  }, [designHasOpaqueBackground, designDimensions, previewResolvedPlacement, templateDimensions, activeTemplatePart, partsConfig, activePart, customization?.imageUrl]);

  const captureEditorSnapshot = (): EditorSnapshot => ({
    activePart,
    partsConfig,
    textElements,
    placementDraft,
    placementRotationDraft,
    appliedCropOverride,
    cornerRadius,
    selectedColour,
    selectedSize,
  });

  const restoreEditorSnapshot = (snapshot: EditorSnapshot) => {
    skipNextDirtyRef.current = true;
    skipNextPartDirtyRef.current = true;
    // Undo/redo already restores partsConfig verbatim (including each part's own
    // isPrintFileStale from the snapshot) — don't let the colour/size effect additionally
    // stomp every part's stale flag just because selectedColour/selectedSize also moved.
    skipNextVariantStaleRef.current = true;
    setActivePart(snapshot.activePart);
    setPartsConfig(snapshot.partsConfig);
    setTextElements(snapshot.textElements);
    setPlacementDraft(snapshot.placementDraft);
    setPlacementRotationDraft(snapshot.placementRotationDraft);
    setAppliedCropOverride(snapshot.appliedCropOverride);
    setCornerRadius(snapshot.cornerRadius);
    setSelectedColour(snapshot.selectedColour);
    setSelectedSize(snapshot.selectedSize);
  };

  /** Call *before* starting a gesture or committing a discrete action, so the snapshot captures
   * the "before" state — one history entry per user-visible action, not per pixel of a drag. */
  const pushHistorySnapshot = () => {
    const { past } = historyRef.current;
    past.push(captureEditorSnapshot());
    if (past.length > MAX_HISTORY_ENTRIES) {
      past.shift();
    }
    historyRef.current = { past, future: [] };
    setHistoryCounts({ past: past.length, future: 0 });
  };

  const undo = () => {
    const { past, future } = historyRef.current;
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const remainingPast = past.slice(0, -1);
    future.push(captureEditorSnapshot());
    historyRef.current = { past: remainingPast, future };
    setHistoryCounts({ past: remainingPast.length, future: future.length });
    restoreEditorSnapshot(previous);
  };

  const redo = () => {
    const { past, future } = historyRef.current;
    if (future.length === 0) return;
    const next = future[future.length - 1];
    const remainingFuture = future.slice(0, -1);
    past.push(captureEditorSnapshot());
    historyRef.current = { past, future: remainingFuture };
    setHistoryCounts({ past: past.length, future: remainingFuture.length });
    restoreEditorSnapshot(next);
  };

  // Guards a continuous interaction (dragging a slider, typing in a field, dragging the native
  // colour picker) to a single history entry: the first pointerdown/focus of the interaction
  // pushes one snapshot, every change during the interaction is applied without recording a new
  // one, and pointerup/blur clears the guard so the next interaction starts its own snapshot.
  const continuousEditActiveRef = useRef(false);

  const beginContinuousEdit = () => {
    if (continuousEditActiveRef.current) return;
    continuousEditActiveRef.current = true;
    pushHistorySnapshot();
  };

  const endContinuousEdit = () => {
    continuousEditActiveRef.current = false;
  };

  /** The single place every text-layer property change goes through. `recordHistory: false`
   * (used for continuous interactions already snapshotted by beginContinuousEdit) applies the
   * change without pushing another history entry. */
  const updateTextLayer = (
    id: string,
    changes: Partial<TextElement>,
    options?: { recordHistory?: boolean }
  ) => {
    if (options?.recordHistory !== false) {
      pushHistorySnapshot();
    }
    setTextElements((prev) => prev.map((t) => (t.id === id ? { ...t, ...changes } : t)));
  };

  const addTextLayer = () => {
    pushHistorySnapshot();
    const newId = `text-${Date.now()}`;
    setTextElements((prev) => [
      ...prev,
      {
        id: newId,
        text: 'New Text',
        fontFamily: 'Roboto',
        color: '#ffffff',
        fontSize: 48,
        x: templateDimensions ? templateDimensions.width / 2 : 500,
        y: templateDimensions ? templateDimensions.height / 2 : 500,
        rotation: 0,
        isBold: false,
        isItalic: false,
        textAlign: 'center',
        lineHeight: 1.2,
        isHidden: false,
        isLocked: false,
      },
    ]);
    setActiveTextId(newId);
  };

  const duplicateTextLayer = (id: string) => {
    pushHistorySnapshot();
    const duplicateId = `text-${Date.now()}`;
    setTextElements((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      if (idx === -1) return prev;
      const clone: TextElement = {
        ...prev[idx],
        id: duplicateId,
        x: prev[idx].x + 24,
        y: prev[idx].y + 24,
        layerName: prev[idx].layerName ? `${prev[idx].layerName} Copy` : undefined,
      };
      const next = [...prev];
      next.splice(idx + 1, 0, clone);
      return next;
    });
    setActiveTextId(duplicateId);
  };

  const deleteTextLayer = (id: string) => {
    pushHistorySnapshot();
    setTextElements((prev) => prev.filter((t) => t.id !== id));
  };

  const moveTextLayerUp = (id: string) => {
    pushHistorySnapshot();
    setTextElements((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      if (idx === -1 || idx === prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  };

  const moveTextLayerDown = (id: string) => {
    pushHistorySnapshot();
    setTextElements((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  };

  const toggleTextLayerVisibility = (id: string) => {
    pushHistorySnapshot();
    setTextElements((prev) => prev.map((t) => (t.id === id ? { ...t, isHidden: !t.isHidden } : t)));
  };

  const toggleTextLayerLock = (id: string) => {
    pushHistorySnapshot();
    setTextElements((prev) => prev.map((t) => (t.id === id ? { ...t, isLocked: !t.isLocked } : t)));
  };

  const renameTextLayer = (id: string, name: string) => {
    updateTextLayer(id, { layerName: name }, { recordHistory: false });
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isModifierPressed = event.metaKey || event.ctrlKey;
      if (!isModifierPressed || event.key.toLowerCase() !== 'z') return;
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      event.preventDefault();
      if (event.shiftKey) {
        redo();
      } else {
        undo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePart, partsConfig, textElements, placementDraft, placementRotationDraft, appliedCropOverride, cornerRadius, selectedColour, selectedSize]);

  const cropOverride = appliedCropOverride;
  const hasAppliedCrop = Boolean(
    appliedCropOverride &&
    (
      appliedCropOverride.left !== 0 ||
      appliedCropOverride.top !== 0 ||
      appliedCropOverride.width !== 100 ||
      appliedCropOverride.height !== 100
    )
  );

  const previewDesignImageStyle = useMemo(() => {
    if (!appliedCropOverride) {
      return undefined;
    }

    return {
      width: `${100 / (appliedCropOverride.width / 100)}%`,
      height: `${100 / (appliedCropOverride.height / 100)}%`,
      left: `-${(appliedCropOverride.left / appliedCropOverride.width) * 100}%`,
      top: `-${(appliedCropOverride.top / appliedCropOverride.height) * 100}%`,
    };
  }, [appliedCropOverride]);

  const appliedCropAspectRatio = useMemo(() => {
    if (!appliedCropOverride || !cropStudioImageDimensions) {
      return null;
    }

    const croppedWidth = cropStudioImageDimensions.width * (appliedCropOverride.width / 100);
    const croppedHeight = cropStudioImageDimensions.height * (appliedCropOverride.height / 100);
    if (croppedWidth <= 0 || croppedHeight <= 0) {
      return null;
    }

    return croppedWidth / croppedHeight;
  }, [appliedCropOverride, cropStudioImageDimensions]);

  const previewCropFrameStyle = useMemo(() => {
    if (!hasAppliedCrop || !previewResolvedPlacement || !appliedCropAspectRatio) {
      return null;
    }

    const placementAspectRatio = previewResolvedPlacement.width / previewResolvedPlacement.height;

    if (appliedCropAspectRatio >= placementAspectRatio) {
      return {
        width: '100%',
        aspectRatio: String(appliedCropAspectRatio),
      };
    }

    return {
      height: '100%',
      aspectRatio: String(appliedCropAspectRatio),
    };
  }, [appliedCropAspectRatio, hasAppliedCrop, previewResolvedPlacement]);

  const draftCropPreviewStyle = useMemo(() => ({
    width: `${100 / (draftCropRect.width / 100)}%`,
    height: `${100 / (draftCropRect.height / 100)}%`,
    left: `-${(draftCropRect.left / draftCropRect.width) * 100}%`,
    top: `-${(draftCropRect.top / draftCropRect.height) * 100}%`,
  }), [draftCropRect]);

  const cropStudioAspectRatio = useMemo(() => {
    if (cropStudioImageDimensions) {
      return `${cropStudioImageDimensions.width} / ${cropStudioImageDimensions.height}`;
    }

    return '1 / 1';
  }, [cropStudioImageDimensions]);

  const handlePlacementPointerDown = (
    event: React.PointerEvent<HTMLElement>,
    handle: PlacementHandle
  ) => {
    if (!previewResolvedPlacement || !previewStageRef.current || pinchState.current) {
      return;
    }

    pushHistorySnapshot();
    const rect = previewStageRef.current.getBoundingClientRect();
    placementDragState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      handle,
      originPlacement: {
        x: previewResolvedPlacement.x,
        y: previewResolvedPlacement.y,
        width: previewResolvedPlacement.width,
        height: previewResolvedPlacement.height,
      },
      width: rect.width || 1,
      height: rect.height || 1,
    };
    setIsPlacementDragging(true);
    previewStageRef.current.setPointerCapture(event.pointerId);
  };

  const handlePlacementPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const activeDrag = placementDragState.current;
    if (
      !activeDrag ||
      activeDrag.pointerId !== event.pointerId ||
      !templateDimensions
    ) {
      return;
    }

    const deltaX = ((event.clientX - activeDrag.startX) / activeDrag.width) * templateDimensions.width;
    const deltaY = ((event.clientY - activeDrag.startY) / activeDrag.height) * templateDimensions.height;

    // Clamp/snap against the fixed print area (the admin-configured printable region), not the
    // full garment canvas — falls back to the whole canvas only if this part has no configured
    // boundary at all, so parts without one keep their previous (pre-fixed-area) behavior.
    const bounds = activeFixedPrintArea ?? { x: 0, y: 0, width: templateDimensions.width, height: templateDimensions.height };

    if (activeDrag.handle === 'move') {
      const { width, height } = activeDrag.originPlacement;
      let nextX = clamp(Math.round(activeDrag.originPlacement.x + deltaX), bounds.x, bounds.x + bounds.width - width);
      let nextY = clamp(Math.round(activeDrag.originPlacement.y + deltaY), bounds.y, bounds.y + bounds.height - height);

      // Centre/edge snapping: within a small threshold of a guide position, snap exactly to it
      // and report which guide lit up so the preview can draw an alignment line.
      const snapThresholdX = Math.max(6, templateDimensions.width * 0.012);
      const snapThresholdY = Math.max(6, templateDimensions.height * 0.012);
      const centerX = bounds.x + (bounds.width - width) / 2;
      const centerY = bounds.y + (bounds.height - height) / 2;
      const maxX = bounds.x + bounds.width - width;
      const maxY = bounds.y + bounds.height - height;

      let vertical: 'left' | 'center' | 'right' | null = null;
      if (Math.abs(nextX - centerX) <= snapThresholdX) {
        nextX = centerX;
        vertical = 'center';
      } else if (Math.abs(nextX - bounds.x) <= snapThresholdX) {
        nextX = bounds.x;
        vertical = 'left';
      } else if (Math.abs(nextX - maxX) <= snapThresholdX) {
        nextX = maxX;
        vertical = 'right';
      }

      let horizontal: 'top' | 'center' | 'bottom' | null = null;
      if (Math.abs(nextY - centerY) <= snapThresholdY) {
        nextY = centerY;
        horizontal = 'center';
      } else if (Math.abs(nextY - bounds.y) <= snapThresholdY) {
        nextY = bounds.y;
        horizontal = 'top';
      } else if (Math.abs(nextY - maxY) <= snapThresholdY) {
        nextY = maxY;
        horizontal = 'bottom';
      }

      setSnapGuides((prev) => (prev.vertical === vertical && prev.horizontal === horizontal ? prev : { vertical, horizontal }));
      setPlacementDraft({
        x: nextX,
        y: nextY,
        width,
        height,
      });
      return;
    }

    setSnapGuides((prev) => (prev.vertical === null && prev.horizontal === null ? prev : { vertical: null, horizontal: null }));

    const nextWidth = clamp(
      Math.round(activeDrag.originPlacement.width + deltaX),
      MIN_PLACEMENT_SIZE,
      bounds.x + bounds.width - activeDrag.originPlacement.x
    );
    const nextHeight = clamp(
      Math.round(activeDrag.originPlacement.height + deltaY),
      MIN_PLACEMENT_SIZE,
      bounds.y + bounds.height - activeDrag.originPlacement.y
    );

    setPlacementDraft({
      x: activeDrag.originPlacement.x,
      y: activeDrag.originPlacement.y,
      width: nextWidth,
      height: nextHeight,
    });
  };

  const handlePlacementPointerEnd = (event: React.PointerEvent<HTMLElement>) => {
    const activeDrag = placementDragState.current;
    if (activeDrag && activeDrag.pointerId === event.pointerId) {
      placementDragState.current = null;
      setIsPlacementDragging(false);
      setSnapGuides({ vertical: null, horizontal: null });
      if (previewStageRef.current?.hasPointerCapture(event.pointerId)) {
        previewStageRef.current.releasePointerCapture(event.pointerId);
      }
    }
  };

  // Two-finger pinch-to-resize + twist-to-rotate. Pointer Events (above) already unify
  // mouse/single-finger-touch dragging, but a genuine 2-finger gesture needs the native Touch
  // API — Pointer Events fire once per finger independently, which makes coordinating two
  // simultaneous contacts awkward. A single-finger touch still also fires pointerdown/move
  // (browsers implement Pointer Events on top of touch), so each handler here explicitly checks
  // `touches.length === 2` and defers to the single-pointer path otherwise.
  const getTouchDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };
  const getTouchAngle = (touches: React.TouchList) => {
    const dx = touches[1].clientX - touches[0].clientX;
    const dy = touches[1].clientY - touches[0].clientY;
    return (Math.atan2(dy, dx) * 180) / Math.PI;
  };

  const handlePlacementTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    if (event.touches.length !== 2 || !previewResolvedPlacement) return;
    event.preventDefault();
    // A single-finger drag may already be in progress (its pointerdown fired first) — cancel it
    // cleanly so the two gestures don't fight over placementDraft at the same time.
    placementDragState.current = null;
    setIsPlacementDragging(false);
    pushHistorySnapshot();
    pinchState.current = {
      initialDistance: getTouchDistance(event.touches),
      initialAngle: getTouchAngle(event.touches),
      originWidth: previewResolvedPlacement.width,
      originHeight: previewResolvedPlacement.height,
      originRotation: previewResolvedPlacement.rotation ?? 0,
      originX: previewResolvedPlacement.x,
      originY: previewResolvedPlacement.y,
    };
  };

  const handlePlacementTouchMove = (event: React.TouchEvent<HTMLElement>) => {
    const state = pinchState.current;
    if (!state || event.touches.length !== 2 || !templateDimensions) return;
    event.preventDefault();

    // Clamp against the fixed print area, same boundary the mouse-drag path uses — falls back
    // to the full canvas only when this part has no configured print-area boundary.
    const bounds = activeFixedPrintArea ?? { x: 0, y: 0, width: templateDimensions.width, height: templateDimensions.height };

    const scale = getTouchDistance(event.touches) / state.initialDistance;
    const nextWidth = clamp(Math.round(state.originWidth * scale), MIN_PLACEMENT_SIZE, bounds.width);
    const nextHeight = clamp(Math.round(state.originHeight * scale), MIN_PLACEMENT_SIZE, bounds.height);

    // Resize around the gesture's original centre point rather than the top-left corner, so
    // pinching feels like it's scaling "in place" the way it would on a native photo app.
    const centerX = state.originX + state.originWidth / 2;
    const centerY = state.originY + state.originHeight / 2;
    const nextX = clamp(Math.round(centerX - nextWidth / 2), bounds.x, bounds.x + bounds.width - nextWidth);
    const nextY = clamp(Math.round(centerY - nextHeight / 2), bounds.y, bounds.y + bounds.height - nextHeight);

    setPlacementDraft({ x: nextX, y: nextY, width: nextWidth, height: nextHeight });
    setPlacementRotationDraft(state.originRotation + (getTouchAngle(event.touches) - state.initialAngle));
  };

  const handlePlacementTouchEnd = () => {
    pinchState.current = null;
  };

  const handleCropPointerDown = (event: React.PointerEvent<HTMLElement>, handle: CropHandle) => {
    event.preventDefault();
    const rect = cropStageRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    pushHistorySnapshot();
    cropDragState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      handle,
      originRect: draftCropRect,
      width: rect.width || 1,
      height: rect.height || 1,
    };
    setIsCropDragging(true);
    cropStageRef.current?.setPointerCapture(event.pointerId);
  };

  const queueCropRectUpdate = (nextRect: CropOverride) => {
    draftCropRectRef.current = nextRect;
    if (cropAnimationFrameRef.current !== null) {
      return;
    }

    cropAnimationFrameRef.current = window.requestAnimationFrame(() => {
      cropAnimationFrameRef.current = null;
      setDraftCropRect(draftCropRectRef.current);
    });
  };

  const handleCropPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const activeDrag = cropDragState.current;
    if (!activeDrag || activeDrag.pointerId !== event.pointerId) {
      return;
    }
    event.preventDefault();

    const deltaX = ((event.clientX - activeDrag.startX) / activeDrag.width) * 100;
    const deltaY = ((event.clientY - activeDrag.startY) / activeDrag.height) * 100;
    const { originRect, handle } = activeDrag;
    let nextLeft = originRect.left;
    let nextTop = originRect.top;
    let nextWidth = originRect.width;
    let nextHeight = originRect.height;

    if (handle === 'move') {
      nextLeft = clamp(originRect.left + deltaX, 0, 100 - originRect.width);
      nextTop = clamp(originRect.top + deltaY, 0, 100 - originRect.height);
    } else {
      if (handle.includes('e')) {
        nextWidth = clamp(originRect.width + deltaX, MIN_CROP_SIZE, 100 - originRect.left);
      }
      if (handle.includes('s')) {
        nextHeight = clamp(originRect.height + deltaY, MIN_CROP_SIZE, 100 - originRect.top);
      }
      if (handle.includes('w')) {
        nextLeft = clamp(originRect.left + deltaX, 0, originRect.left + originRect.width - MIN_CROP_SIZE);
        nextWidth = originRect.width - (nextLeft - originRect.left);
      }
      if (handle.includes('n')) {
        nextTop = clamp(originRect.top + deltaY, 0, originRect.top + originRect.height - MIN_CROP_SIZE);
        nextHeight = originRect.height - (nextTop - originRect.top);
      }

      nextWidth = clamp(nextWidth, MIN_CROP_SIZE, 100 - nextLeft);
      nextHeight = clamp(nextHeight, MIN_CROP_SIZE, 100 - nextTop);
    }

    queueCropRectUpdate({
      left: nextLeft,
      top: nextTop,
      width: nextWidth,
      height: nextHeight,
    });
  };

  const handleCropPointerEnd = (event: React.PointerEvent<HTMLElement>) => {
    const activeDrag = cropDragState.current;
    if (activeDrag && activeDrag.pointerId === event.pointerId) {
      cropDragState.current = null;
      setIsCropDragging(false);
      if (cropStageRef.current?.hasPointerCapture(event.pointerId)) {
        cropStageRef.current.releasePointerCapture(event.pointerId);
      }
      if (cropAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(cropAnimationFrameRef.current);
        cropAnimationFrameRef.current = null;
      }
      setDraftCropRect(draftCropRectRef.current);
    }
  };

  const getDefaultPlacementForPart = (partName: string): PlacementOverride | null => {
    const templatePart = customization?.templateParts?.find((part) => part.name === partName);
    return extractPlacementFromConfig(templatePart?.config) ?? customization?.basePlacement ?? null;
  };

  const handlePartChange = (nextPart: string) => {
    if (nextPart === activePart) {
      return;
    }

    // Restoring the incoming part's saved placement/crop/text below will change the same
    // state the part-dirty effect watches — swallow that one resulting tick so switching tabs
    // never marks the newly-active part dirty on its own.
    skipNextPartDirtyRef.current = true;

    const outgoingPartState: PartCustomization = {
      ...partsConfig[activePart],
      placementOverride: previewResolvedPlacement ?? undefined,
      cropOverride: appliedCropOverride ?? undefined,
      textElements,
    };

    const nextPartsConfig = { ...partsConfig, [activePart]: outgoingPartState };
    setPartsConfig(nextPartsConfig);

    const savedPart = nextPartsConfig[nextPart];
    const nextPlacement = savedPart?.placementOverride ?? getDefaultPlacementForPart(nextPart);

    setPlacementDraft(
      nextPlacement
        ? {
            x: nextPlacement.x,
            y: nextPlacement.y,
            width: nextPlacement.width,
            height: nextPlacement.height,
          }
        : null
    );
    setCornerRadius(nextPlacement?.cornerRadius ?? 0);
    setAppliedCropOverride(savedPart?.cropOverride ?? null);
    setDraftCropRect(savedPart?.cropOverride ?? { left: 0, top: 0, width: 100, height: 100 });
    setTextElements(savedPart?.textElements ?? []);
    setActiveTextId(null);
    setTemplateDimensions(null);
    setIsPreviewAssetLoading(true);
    setActivePart(nextPart);
  };

  const handleTextPointerDown = (event: React.PointerEvent<HTMLElement>, textId: string) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (!templateDimensions || !previewStageRef.current) return;
    
    const textEl = textElements.find(t => t.id === textId);
    if (!textEl) return;

    setActiveTextId(textId);
    pushHistorySnapshot();

    const rect = previewStageRef.current.getBoundingClientRect();
    textDragState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      id: textId,
      originX: textEl.x,
      originY: textEl.y,
      width: rect.width || 1,
      height: rect.height || 1,
    };
    
    previewStageRef.current.setPointerCapture(event.pointerId);
  };

  const handleTextPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const activeDrag = textDragState.current;
    if (!activeDrag || activeDrag.pointerId !== event.pointerId || !templateDimensions) {
      return;
    }

    const deltaX = ((event.clientX - activeDrag.startX) / activeDrag.width) * templateDimensions.width;
    const deltaY = ((event.clientY - activeDrag.startY) / activeDrag.height) * templateDimensions.height;

    setTextElements(prev => prev.map(t => {
      if (t.id === activeDrag.id) {
        return {
          ...t,
          x: activeDrag.originX + deltaX,
          y: activeDrag.originY + deltaY,
        };
      }
      return t;
    }));
  };

  const handleTextPointerEnd = (event: React.PointerEvent<HTMLElement>) => {
    const activeDrag = textDragState.current;
    if (activeDrag && activeDrag.pointerId === event.pointerId) {
      textDragState.current = null;
      if (previewStageRef.current?.hasPointerCapture(event.pointerId)) {
        previewStageRef.current.releasePointerCapture(event.pointerId);
      }
    }
  };

  // Hooks below must run on every render regardless of whether `customization` has resolved
  // yet (React's Rules of Hooks) — they used to live after the `if (!customization)` early
  // return further down, which meant the loading render called fewer hooks than the loaded
  // render and crashed with "Rendered more hooks than during the previous render." Each one
  // already null-guards `customization` internally, so hoisting them here is safe.
  const previewTemplateUrl =
    activeTemplatePart?.baseImage || customization?.templateBaseImageUrl || customization?.mockupImageUrl;
  // The design image actually showing on the active part right now — each part has its own
  // independent artwork (see partsConfig), so this must never be the fixed, load-time-only
  // `customization.imageUrl` alone. Falls back to it only for the legacy single-image flow
  // (opened straight from the Generator) where a part may not have its own entry yet.
  const activePartImageUrl = partsConfig[activePart]?.imageUrl || customization?.imageUrl || undefined;

  useEffect(() => {
    if (!customization?.basePlacement || !designDimensions) {
      return;
    }

    const basePlacement = customization.basePlacement;
    const designAspectRatio = designDimensions.width / designDimensions.height;
    const placementAspectRatio = basePlacement.width / basePlacement.height;

    let nextWidth = basePlacement.width;
    let nextHeight = basePlacement.height;

    if (designAspectRatio >= placementAspectRatio) {
      nextHeight = Math.max(
        MIN_PLACEMENT_SIZE,
        Math.round(basePlacement.width / Math.max(designAspectRatio, 0.01))
      );
    } else {
      nextWidth = Math.max(
        MIN_PLACEMENT_SIZE,
        Math.round(basePlacement.height * designAspectRatio)
      );
    }

    nextWidth = Math.min(nextWidth, basePlacement.width);
    nextHeight = Math.min(nextHeight, basePlacement.height);

    const centeredX = Math.round(basePlacement.x + (basePlacement.width - nextWidth) / 2);
    const centeredY = Math.round(basePlacement.y + (basePlacement.height - nextHeight) / 2);

    setPlacementDraft((current) => {
      if (
        current &&
        current.x === centeredX &&
        current.y === centeredY &&
        current.width === nextWidth &&
        current.height === nextHeight
      ) {
        return current;
      }

      return {
        x: centeredX,
        y: centeredY,
        width: nextWidth,
        height: nextHeight,
      };
    });
  }, [customization, designDimensions]);

  useEffect(() => {
    if (!customization) {
      setIsPreviewAssetLoading(false);
      return;
    }

    const assetUrls = Array.from(
      new Set(
        [previewTemplateUrl, activePartImageUrl].filter(
          (value): value is string => Boolean(value && value.trim())
        )
      )
    );

    if (customization.productType === 'tshirt' && !previewTemplateUrl) {
      setTemplateDimensions({ width: 1000, height: 1000 });
      setIsPreviewAssetLoading(false);
      return;
    }

    if (assetUrls.length === 0) {
      setIsPreviewAssetLoading(false);
      return;
    }

    let isCancelled = false;
    let remaining = assetUrls.length;
    setIsPreviewAssetLoading(true);

    const finish = () => {
      remaining -= 1;
      if (!isCancelled && remaining <= 0) {
        setIsPreviewAssetLoading(false);
      }
    };

    assetUrls.forEach((assetUrl) => {
      const image = new window.Image();
      image.onload = () => {
        if (
          !isCancelled &&
          assetUrl === activePartImageUrl &&
          image.naturalWidth > 0 &&
          image.naturalHeight > 0
        ) {
          setDesignDimensions((current) => {
            if (
              current?.width === image.naturalWidth &&
              current?.height === image.naturalHeight
            ) {
              return current;
            }

            return { width: image.naturalWidth, height: image.naturalHeight };
          });
        }
        if (
          !isCancelled &&
          assetUrl === previewTemplateUrl &&
          image.naturalWidth > 0 &&
          image.naturalHeight > 0
        ) {
          setTemplateDimensions((current) => {
            if (
              current?.width === image.naturalWidth &&
              current?.height === image.naturalHeight
            ) {
              return current;
            }

            return { width: image.naturalWidth, height: image.naturalHeight };
          });
        }
        finish();
      };
      image.onerror = finish;
      image.src = assetUrl;
    });

    return () => {
      isCancelled = true;
    };
  }, [customization, previewTemplateUrl, activePartImageUrl]);

  // If a save/finalize attempt hit a 401 (expired session) and the user re-authenticated,
  // automatically retry instead of making them click Save again and lose the moment.
  useEffect(() => {
    if (user && pendingSaveAfterLoginRef.current) {
      pendingSaveAfterLoginRef.current = false;
      void handleSaveDesign();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!customization) {
    // A /customize/product/:productId or /customize?project=<id> navigation is actively
    // resolving — show that instead of the generic "nothing selected" screen, which would
    // otherwise flash (or persist, on error) in front of what's actually the primary entry
    // point into this page now (Shop.tsx's "Customize" button).
    if (routeProductId || projectIdParam) {
      if (projectLoadError) {
        return (
          <div className="max-w-7xl mx-auto px-6 py-32 text-center text-white">
            <h2 className="text-3xl font-display font-black text-white uppercase tracking-widest mb-4">
              Could Not Open Customization
            </h2>
            <p className="text-gray-500 mb-8 max-w-sm mx-auto uppercase tracking-wider text-xs">{projectLoadError}</p>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 px-8 py-4 bg-neon-purple text-white font-bold uppercase tracking-widest rounded-full hover:neon-glow-purple transition-all"
            >
              Back to Shop
            </Link>
          </div>
        );
      }
      return (
        <div className="max-w-7xl mx-auto px-6 py-32 text-center text-white">
          <Loader2 size={28} className="mx-auto mb-4 animate-spin text-neon-pink" />
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-gray-500">Loading customization</p>
        </div>
      );
    }

    return (
      <div className="max-w-7xl mx-auto px-6 py-32 text-center text-white">
        <h2 className="text-3xl font-display font-black text-white uppercase tracking-widest mb-4">No Customization Selected</h2>
        <p className="text-gray-500 mb-8 max-w-sm mx-auto uppercase tracking-wider text-xs">Generate an artwork on the Dream page to kickstart custom product wrapping, or pick a product from the Shop.</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link to="/generator" className="inline-flex items-center gap-2 px-8 py-4 bg-neon-purple text-white font-bold uppercase tracking-widest rounded-full hover:neon-glow-purple transition-all">
            Launch Dream Machine
          </Link>
          <Link to="/shop" className="inline-flex items-center gap-2 px-8 py-4 border border-white/15 text-white font-bold uppercase tracking-widest rounded-full hover:border-white transition-all">
            Browse Shop
          </Link>
        </div>
      </div>
    );
  }

  // Render product preview configuration based on choices. Deliberately sourced from the
  // validated sellable selection (never customization.startingPrice directly) — if the currently
  // selected colour/size isn't actually sellable, there's no honest per-unit price to multiply,
  // and the UI must say so rather than showing a stale/misleading number.
  const unitStartingPrice = sellableSelection.selection?.startingPrice ?? null;
  const totalPrice = unitStartingPrice !== null ? (unitStartingPrice * quantity).toFixed(2) : null;
  const previewShadowLayerUrl = activeTemplatePart?.shadowLayer || customization.templateShadowLayerUrl;
  const previewHighlightLayerUrl = activeTemplatePart?.highlightLayer || customization.templateHighlightLayerUrl;
  const supportsLiveTemplatePreview = Boolean(previewTemplateUrl && previewResolvedPlacement);
  const showPreviewLoading = previewLoading || isPreviewAssetLoading;

  // Whether the ACTIVE part currently has an image artwork attached — deliberately excludes
  // text-only parts (section 13: the empty state is about "no design image," not "nothing at
  // all"). Drives the empty-state overlay and which artwork-specific controls stay enabled.
  const activePartHasImage = Boolean(
    partsConfig[activePart]?.sourceArtworkId ||
      partsConfig[activePart]?.sourceGeneratedImageId ||
      partsConfig[activePart]?.sourceAssetId ||
      partsConfig[activePart]?.imageUrl
  );

  const handleGenerateRealisticPreview = async () => {
    setIsPreviewAssetLoading(true);
    try {
      const response = await createMockupRender({
        templateId: customization.templateId,
        artworkId: partsConfig[activePart]?.sourceArtworkId ?? customization.sourceArtworkId,
        sourceImageUrl: activePartImageUrl,
        sourcePrompt: partsConfig[activePart]?.userPrompt ?? customization.userPrompt,
        variantColor: selectedColour,
        variantSize: selectedSize,
        placementOverride: previewResolvedPlacement ?? undefined,
        cropOverride: appliedCropOverride,
        textElements,
        partName: activePart,
      });
      const renderedUrl = response.render.outputImage || response.render.outputImageUrl || customization.mockupImageUrl;
      setRealisticPreviewUrl(renderedUrl);
      setIsRealisticPreviewOpen(true);
      // This was a real render of the active part's current state — record it so a later
      // Add to Cart doesn't re-render this same part again if nothing changes before then.
      updatePartCustomization(
        activePart,
        {
          placementOverride: previewResolvedPlacement ?? undefined,
          cropOverride: appliedCropOverride ?? undefined,
          textElements,
          mockupImageUrl: renderedUrl,
          backendRenderId: response.render.id,
        },
        { markDirty: false }
      );
    } catch (error) {
      console.error('Failed to generate preview:', error);
      alert('Failed to generate realistic preview.');
    } finally {
      setIsPreviewAssetLoading(false);
    }
  };

  // The active part's live-drafted placement/crop/text lives in top-level state, separate
  // from partsConfig, until a part switch folds it in (see handlePartChange). Saving or
  // adding to cart needs the FULL current state, so fold the active part in here too.
  const captureCurrentPartsConfig = (): Record<string, PartCustomization> => ({
    ...partsConfig,
    [activePart]: {
      ...partsConfig[activePart],
      placementOverride: previewResolvedPlacement ?? undefined,
      cropOverride: appliedCropOverride ?? undefined,
      textElements,
    },
  });

  const persistDesignProject = async (partsConfigToSave: Record<string, PartCustomization>) => {
    const input = mapEditorStateToDesignProjectWriteInput({
      name: projectName,
      mockupTemplateId: customization.templateId,
      productId: customization.productId,
      // The variant actually resolved from the CURRENTLY selected colour/size — not
      // customization.selectedVariantId, which is only ever the value the customization was
      // first opened/loaded with and never updates as the user changes colour/size in the
      // editor. Falls back to that original value only if no live variant has resolved yet
      // (e.g. productVariants hasn't loaded).
      selectedVariantId: selectedVariant?.id ?? customization.selectedVariantId,
      selectedColor: selectedColour,
      selectedSize,
      sourceArtworkId: customization.sourceArtworkId,
      sourceGeneratedImageId: customization.sourceGeneratedImageId,
      sourceImageUrl: customization.imageUrl,
      sourcePrompt: customization.userPrompt,
      partsConfig: partsConfigToSave,
    });

    // The editor always hands this function its COMPLETE current partsConfig (see
    // captureCurrentPartsConfig), never a partial one — so an existing project is always a
    // full replace (PUT), not a partial patch. A part the user removed from the editor (e.g.
    // deleted the sleeve design) must actually disappear from the saved project too.
    if (currentProjectId) {
      return replaceDesignProject(currentProjectId, input);
    }

    const created = await createDesignProject(input);
    setCurrentProjectId(created.id);
    loadedProjectIdRef.current = created.id;
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.set('project', String(created.id));
        return next;
      },
      { replace: true }
    );
    return created;
  };

  const handleSaveDesign = async () => {
    if (!customization) return;

    if (!user) {
      // /customize already requires sign-in to view at all, so this path mainly covers a
      // session that expired mid-edit rather than a truly anonymous visitor (see the 401
      // branch below, which is the more realistic trigger for the same recovery flow).
      pendingSaveAfterLoginRef.current = true;
      void signIn();
      return;
    }

    setSaveStatus('saving');
    setSaveError(null);
    try {
      const merged = captureCurrentPartsConfig();
      setPartsConfig(merged);
      // Explicit return value, not `currentProjectId` state (which wouldn't have committed
      // yet if this is the first save) — persistDesignProject's resolved value is the single
      // source of truth for "which project did we just save."
      const savedProject = await persistDesignProject(merged);
      void savedProject;
      skipNextDirtyRef.current = true;
      setSaveStatus('saved');
      window.setTimeout(() => {
        setSaveStatus((current) => (current === 'saved' ? 'idle' : current));
      }, 3000);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        pendingSaveAfterLoginRef.current = true;
        void signIn();
        return;
      }
      setSaveStatus('error');
      setSaveError(error instanceof Error ? error.message : 'Could not save this design.');
    }
  };

  /** Development/admin action: save the complete current design, then generate (or reuse)
   * production print files for it — see the "Production Print Files" panel. Never touches the
   * cart and never contacts Printify; this is generation only. Steps 1-4 below mirror the task's
   * own suggested shape: capture -> save/replace -> use the RETURNED id -> call the print-file
   * endpoint. The returned id is used directly (never `currentProjectId` state, which for a
   * brand-new design wouldn't have committed yet when this function needs it) so this doesn't
   * depend on React having already re-rendered with the new project id. */
  const handleGeneratePrintFiles = async () => {
    if (!customization) return;

    if (!user) {
      void signIn();
      return;
    }

    setPrintFileGenerationError(null);
    setPrintFileGenerationState('saving');

    let savedProjectId: number;
    try {
      const merged = captureCurrentPartsConfig();
      setPartsConfig(merged);
      const savedProject = await persistDesignProject(merged);
      savedProjectId = savedProject.id;
      skipNextDirtyRef.current = true;
      setSaveStatus('saved');
      window.setTimeout(() => {
        setSaveStatus((current) => (current === 'saved' ? 'idle' : current));
      }, 3000);
    } catch (error) {
      // Saving failed — the print-file endpoint is never called, the editor's current state is
      // untouched (nothing above this point mutated partsConfig/placement/text state), and the
      // user can simply click the action again to retry.
      setPrintFileGenerationState('failed');
      if (error instanceof ApiError && error.status === 401) {
        setPrintFileGenerationError('Your session expired. Please sign in again, then click Generate Print Files once more.');
        void signIn();
      } else {
        setPrintFileGenerationError(error instanceof Error ? error.message : 'Could not save the design before generating print files.');
      }
      return;
    }

    setPrintFileGenerationState('generating');
    try {
      const result = await generatePrintFiles(savedProjectId);
      const displayResults = buildPrintFileDisplayResults({
        templateParts: customization.templateParts,
        supportedPrintAreas,
        apiResults: result.parts,
      });
      setPrintFileResults(displayResults);

      // Only a genuinely completed (not reused, not failed/skipped) part actually changes what
      // printFileUrl points at — a reused part already has the right URL from before, and
      // markDirty:false means this never touches isDirty (the mockup PREVIEW might still be
      // stale even though the production file is now current — the two are independent).
      for (const part of result.parts) {
        if ((part.status === 'completed') && part.printFileUrl) {
          updatePartCustomization(part.partName, { printFileUrl: part.printFileUrl, isPrintFileStale: false }, { markDirty: false });
        }
      }

      setPrintFileGenerationState(derivePrintFileGenerationState(displayResults));
    } catch (error) {
      // Whatever succeeded before the failure (there isn't a partial-throw case with the
      // current synchronous endpoint, but if a future async version introduces one, previously
      // set printFileResults/printFileUrl values are simply left as they were — never cleared).
      setPrintFileGenerationState('failed');
      setPrintFileGenerationError(error instanceof Error ? error.message : 'Print file generation failed.');
    }
  };

  /** Read-only refresh — GET only, never regenerates. Useful after reloading the page or when
   * checking on a generation attempt from an earlier session without re-triggering one. */
  const handleRefreshPrintFileStatus = async () => {
    if (!currentProjectId) return;
    setPrintFileGenerationError(null);
    try {
      const result = await getPrintFiles(currentProjectId);
      const displayResults = buildPrintFileDisplayResults({
        templateParts: customization?.templateParts,
        supportedPrintAreas,
        apiResults: result.parts,
      });
      setPrintFileResults(displayResults);
      if (displayResults.some((r) => r.displayStatus === 'generated' || r.displayStatus === 'reused' || r.displayStatus === 'failed')) {
        setPrintFileGenerationState(derivePrintFileGenerationState(displayResults));
      }
    } catch (error) {
      setPrintFileGenerationError(error instanceof Error ? error.message : 'Could not refresh print file status.');
    }
  };

  const handleConfirmAddToCart = async () => {
    if (!customization) return;
    // Same guard the button's `disabled` state already reflects — re-checked here since this is
    // also the function that actually performs the purchase action (a disabled button is a UI
    // affordance, not the enforcement point).
    if (!sellableSelection.selection) return;
    setIsAdding(true);
    setPreviewLoading(true);
    setPreviewError(null);
    setFinalizationStage(null);

    try {
      let workingPartsConfig = captureCurrentPartsConfig();
      const configuredParts = Object.entries(workingPartsConfig).filter(([, part]) => isPartConfigured(part));
      // Only the dirty/incomplete ones actually get re-rendered; parts already clean (a valid
      // render ID + preview URL, unchanged since) are reused as-is from workingPartsConfig.
      const partsNeedingRender = configuredParts.filter(([, part]) => partNeedsRender(part));
      const skippedParts = configuredParts.filter(([, part]) => !partNeedsRender(part)).map(([partName]) => partName);
      if (skippedParts.length > 0) {
        console.info(`Reusing existing previews for unchanged part(s): ${skippedParts.join(', ')}`);
      }

      if (configuredParts.length === 0) {
        // Non-part product (mug, poster, etc.), or nothing part-specific configured yet —
        // fall back to the original single-render behavior using the active part directly.
        setFinalizationStage('Preparing your design…');
        const response = await createMockupRender({
          templateId: customization.templateId,
          artworkId: customization.sourceArtworkId,
          sourceImageUrl: customization.imageUrl,
          sourcePrompt: customization.userPrompt,
          variantColor: selectedColour,
          variantSize: selectedSize,
          placementOverride: previewResolvedPlacement ?? undefined,
          cropOverride,
          textElements,
          partName: activePart,
        });
        workingPartsConfig = withPartUpdate(
          workingPartsConfig,
          activePart,
          {
            placementOverride: previewResolvedPlacement ?? undefined,
            cropOverride: cropOverride ?? undefined,
            textElements,
            mockupImageUrl: response.render.outputImage || response.render.outputImageUrl || customization.mockupImageUrl,
            backendRenderId: response.render.id,
          },
          { markDirty: false }
        );
      } else {
        for (const [partName, part] of partsNeedingRender) {
          setFinalizationStage(`Preparing ${partName.replace(/_/g, ' ')}…`);
          let response;
          try {
            response = await createMockupRender({
              templateId: customization.templateId,
              artworkId: part.sourceArtworkId ?? customization.sourceArtworkId,
              sourceImageUrl: part.imageUrl ?? customization.imageUrl,
              sourcePrompt: part.userPrompt ?? customization.userPrompt,
              variantColor: selectedColour,
              variantSize: selectedSize,
              placementOverride: part.placementOverride,
              cropOverride: part.cropOverride,
              textElements: part.textElements ?? [],
              partName,
            });
          } catch (renderError) {
            // Re-throw the same error type (preserving ApiError.status so the outer catch's
            // 401 re-auth check still fires) with the failing part name prefixed onto the message.
            const reason = renderError instanceof Error ? renderError.message : 'an unknown error';
            const label = `Could not render the ${partName.replace(/_/g, ' ')} design: ${reason}`;
            if (renderError instanceof ApiError) {
              throw new ApiError(label, renderError.status, renderError.fieldErrors);
            }
            throw new Error(label);
          }
          workingPartsConfig = withPartUpdate(
            workingPartsConfig,
            partName,
            {
              mockupImageUrl: response.render.outputImage || response.render.outputImageUrl || part.mockupImageUrl,
              backendRenderId: response.render.id,
            },
            { markDirty: false }
          );
        }
      }

      setPartsConfig(workingPartsConfig);

      // The cart item's designProjectId always comes from persistDesignProject's resolved
      // return value below, never from `currentProjectId` state — that state update from a
      // just-created project wouldn't be guaranteed to have landed yet by the time addToCart
      // runs a few lines down (setState is async), so reading it here would risk attaching no
      // ID (or a stale one) to the cart item.
      let savedProjectId: number | undefined;
      if (user) {
        setFinalizationStage('Saving design…');
        const saved = await persistDesignProject(workingPartsConfig);
        savedProjectId = saved.id;
        skipNextDirtyRef.current = true;
        setSaveStatus('saved');
      }

      const primaryPart = workingPartsConfig[activePart] ?? workingPartsConfig['front'];
      const finalizedMockupUrl = primaryPart?.mockupImageUrl || customization.mockupImageUrl;
      const finalizedRenderId = primaryPart?.backendRenderId ?? previewRenderId;
      setPreviewRenderId(finalizedRenderId);

      const cartItemId = `cart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      addToCart({
        id: cartItemId,
        generatedArtworkId: customization.artworkId,
        sourceArtworkId: customization.sourceArtworkId,
        productType: customization.productType,
        mockupImageUrl: finalizedMockupUrl,
        selectedSize: selectedSize,
        selectedColour: selectedColour,
        quantity: quantity,
        // A provisional guest-mode estimate from the validated sellable selection — never a
        // template/hardcoded value. For a signed-in add (designProjectId set below), the backend
        // recomputes and charges its own server-side unit_price regardless of what's sent here.
        price: sellableSelection.selection.startingPrice,
        productId: sellableSelection.selection.product.id ? Number(sellableSelection.selection.product.id) : undefined,
        variantId: sellableSelection.selection.variant.id,
        templateId: customization.templateId,
        backendRenderId: finalizedRenderId,
        placementOverride: primaryPart?.placementOverride ?? previewResolvedPlacement ?? undefined,
        cropOverride: primaryPart?.cropOverride ?? cropOverride,
        textElements: primaryPart?.textElements ?? textElements,
        userPrompt: customization.userPrompt,
        originalImageUrl: customization.imageUrl,
        partsConfig: workingPartsConfig,
        designProjectId: savedProjectId,
      });

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        navigate('/cart');
      }, 1500);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        pendingSaveAfterLoginRef.current = true;
        void signIn();
        setPreviewError('Please sign in again — retrying automatically once you do.');
        return;
      }
      console.error('Failed to finalize backend mockup render:', error);
      setPreviewError(
        error instanceof Error ? error.message : 'Could not finalize this mockup right now. Please try again.'
      );
    } finally {
      setFinalizationStage(null);
      setPreviewLoading(false);
      setIsAdding(false);
    }
  };

  return (
    <div className="bg-cyber-black text-white min-h-screen">
      {/* Upper Navigation bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
        <Link 
          to="/generator" 
          className="inline-flex items-center gap-2 text-[10px] sm:text-xs uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
        >
          <ChevronLeft size={16} />
          Back to Dream Workspace
        </Link>
      </div>

      {/* Main product configuration container */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8 sm:py-12 grid grid-cols-1 xl:grid-cols-[minmax(0,1.35fr)_minmax(420px,0.85fr)] gap-8 xl:gap-14 items-start">
        
        {/* Dynamic Display Mockup Box */}
        <section className="space-y-4 lg:space-y-6">
          <div className="sticky top-24 z-20 space-y-3 xl:static xl:space-y-6">
          <div className="rounded-2xl border border-neon-blue/15 bg-neon-blue/5 px-4 py-3 sm:hidden">
            <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-neon-blue">Live Preview</p>
            <p className="mt-1 text-[10px] uppercase tracking-widest text-gray-400">
              Keep adjusting the controls below. Your design updates here instantly.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 px-2">
            <button
              type="button"
              onClick={undo}
              disabled={historyCounts.past === 0}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-gray-300 transition-all hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-white/10 disabled:hover:text-gray-300"
              title="Undo (Ctrl/Cmd+Z)"
            >
              <Undo2 size={13} /> Undo
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={historyCounts.future === 0}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-gray-300 transition-all hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-white/10 disabled:hover:text-gray-300"
              title="Redo (Ctrl/Cmd+Shift+Z)"
            >
              <Redo2 size={13} /> Redo
            </button>
          </div>


          {((customization.templateParts && customization.templateParts.length > 1) ||
            (customization.productType === 'tshirt' && !customization.templateParts)) && (
            <div className="flex gap-4 border-b border-white/10 mb-4 px-2">
              {(customization.templateParts && customization.templateParts.length > 0
                ? customization.templateParts.map((part) => part.name)
                : ['front', 'back', 'left_sleeve', 'right_sleeve']
              ).map(part => {
                // `null` supportedPrintAreas means "no per-variant restriction known" — every
                // configured part stays clickable. A resolved set means this exact colour/size
                // doesn't print everywhere the template supports in general.
                const isSupported = !supportedPrintAreas || supportedPrintAreas.has(part);
                return (
                  <button
                    key={part}
                    onClick={() => {
                      if (!isSupported) return;
                      pushHistorySnapshot();
                      handlePartChange(part);
                    }}
                    disabled={!isSupported}
                    title={
                      isSupported
                        ? undefined
                        : `The selected colour/size doesn't support printing on ${part.replace('_', ' ')}`
                    }
                    className={cn(
                      "pb-2 text-xs uppercase tracking-widest border-b-2 transition-colors",
                      !isSupported
                        ? "border-transparent text-gray-700 cursor-not-allowed opacity-40"
                        : activePart === part
                          ? "border-neon-blue text-neon-blue"
                          : "border-transparent text-gray-500 hover:text-white"
                    )}
                  >
                    {part.replace('_', ' ')}
                  </button>
                );
              })}
            </div>
          )}

          {/* Artwork action menu (section 6) — applies to the active part only. A left toolbar
              on desktop, a wrapping horizontal bar on mobile; never covers the canvas below. */}
          <div className="flex flex-wrap items-center gap-2 px-2" role="toolbar" aria-label="Artwork actions">
            <button
              type="button"
              onClick={() => setIsGallerySelectorOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-gray-200 transition-all hover:border-neon-blue/40 hover:text-white"
            >
              <ImageIcon size={14} /> Choose from Gallery
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-gray-200 transition-all hover:border-neon-blue/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {isUploading ? 'Uploading...' : 'Upload Design'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              aria-label="Upload design artwork"
              className="sr-only"
              onChange={(event) => {
                void handleFileSelected(event.target.files?.[0] ?? null);
              }}
            />
            <button
              type="button"
              onClick={() => setIsAiPanelOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-gray-200 transition-all hover:border-neon-purple/40 hover:text-white"
            >
              <Wand2 size={14} /> Generate with AI
            </button>
            {activePartHasImage && (
              <button
                type="button"
                onClick={removeActivePartArtwork}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 transition-all hover:border-red-400/40 hover:text-red-300"
              >
                <Trash2 size={14} /> Remove Current Design
              </button>
            )}
          </div>
          {uploadError && (
            <div className="mx-2 rounded-xl border border-neon-pink/25 bg-neon-pink/10 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-neon-pink">
              {uploadError}
            </div>
          )}

          <div className="relative min-h-[420px] sm:min-h-[560px] xl:min-h-[760px] rounded-3xl bg-cyber-gray/30 border border-white/5 flex items-center justify-center overflow-hidden p-3 sm:p-6 xl:p-8 group shadow-[0_0_50px_rgba(0,0,0,0.8)]">

            <div className="absolute inset-0 bg-gradient-to-tr from-cyber-black/80 to-white/5 pointer-events-none" />

            {!activePartHasImage && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-cyber-black/55 px-6 text-center backdrop-blur-[1px]">
                <ImageIcon size={32} className="text-gray-500" />
                <div>
                  <p className="text-sm font-bold uppercase tracking-widest text-white">
                    Add a design to start customizing
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-widest text-gray-400">
                    Choose from Gallery, upload your artwork, or generate one with AI.
                  </p>
                </div>
              </div>
            )}
            
            {/* Dynamic Product Renderings with user image nested */}
            {customization.productType === 'Digital Wallpaper' ? (
              <div className="relative w-full aspect-[16/10] bg-cyber-black border-4 border-gray-800 rounded-xl overflow-hidden shadow-2xl flex items-center justify-center">
                <img
                  src={activePartImageUrl}
                  alt="Desktop Wallpaper display"
                  className="absolute w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 py-2 bg-black/80 border-t border-white/10 text-center text-[8px] font-mono tracking-widest text-gray-400">
                  UHD 8K DIGITAL PREVIEW
                </div>
              </div>
            ) : customization.productType === 'Canvas Print' || customization.productType === 'Poster' ? (
              <div 
                className={cn(
                  "relative bg-white shadow-2xl transition-all duration-300 transform rounded-sm border-b-8 border-r-8 border-black/80",
                  customization.productType === 'Poster' ? "w-64 h-80" : "w-72 h-72"
                )}
                style={{
                  boxShadow: '0 30px 60px -12px rgba(0,0,0,0.9), 0 18px 36px -18px rgba(0,0,0,0.9)'
                }}
              >
                <img
                  src={activePartImageUrl}
                  alt="Generated artwork nested inside frame"
                  className="w-full h-full object-cover"
                />
                {customization.productType === 'Poster' && (
                  <div className="absolute inset-0 border-8 border-black/90 pointer-events-none" />
                )}
              </div>
            ) : (
              // Instant local preview for merch templates
              <div className="relative w-full h-full flex items-center justify-center">
                {supportsLiveTemplatePreview ? (
                  <div
                    ref={previewStageRef}
                    className={cn(
                      "relative h-full max-h-full w-full max-w-full selection-none transition-all duration-300",
                      showPreviewLoading && "opacity-60 scale-[0.99]",
                      isPlacementDragging ? "cursor-grabbing" : "cursor-default"
                    )}
                    style={{
                      aspectRatio: templateDimensions
                        ? `${templateDimensions.width}/${templateDimensions.height}`
                        : '1 / 1',
                    }}
                    onPointerMove={(e) => {
                      handlePlacementPointerMove(e);
                      handleTextPointerMove(e);
                    }}
                    onPointerUp={(e) => {
                      handlePlacementPointerEnd(e);
                      handleTextPointerEnd(e);
                    }}
                    onPointerCancel={(e) => {
                      handlePlacementPointerEnd(e);
                      handleTextPointerEnd(e);
                    }}
                  >
                    
                    {customization.productType === 'tshirt' && !previewTemplateUrl ? (
                      <TShirtTemplate activePart={activePart} className="absolute inset-0 w-full h-full pointer-events-none" />
                    ) : (
                      <img
                        src={previewTemplateUrl}
                        alt={customization.templateName || customization.productType}
                        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                        onLoad={(event) => {
                          setIsPreviewAssetLoading(false);
                          const { naturalWidth, naturalHeight } = event.currentTarget;
                          if (naturalWidth > 0 && naturalHeight > 0) {
                            setTemplateDimensions((current) => {
                              if (
                                current?.width === naturalWidth &&
                                current?.height === naturalHeight
                              ) {
                                return current;
                              }
                              return { width: naturalWidth, height: naturalHeight };
                            });
                          }
                        }}
                        onError={() => {
                          setIsPreviewAssetLoading(false);
                        }}
                      />
                    )}


                    {previewPlacementStyle && activePartImageUrl && (
                      <div
                        className={cn(
                          "absolute overflow-hidden flex items-center justify-center",
                          isPlacementDragging ? "cursor-grabbing" : "cursor-grab"
                        )}
                        style={{
                          ...previewPlacementStyle,
                          opacity: 0.96,
                          borderRadius: `${previewResolvedPlacement.cornerRadius ?? 0}px`,
                          transform: previewResolvedPlacement.rotation
                            ? `rotate(${previewResolvedPlacement.rotation}deg)`
                            : undefined,
                          touchAction: 'none',
                          zIndex: 10,
                        }}
                        onPointerDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          handlePlacementPointerDown(event, 'move');
                        }}
                        onTouchStart={handlePlacementTouchStart}
                        onTouchMove={handlePlacementTouchMove}
                        onTouchEnd={handlePlacementTouchEnd}
                        onTouchCancel={handlePlacementTouchEnd}
                      >
                        {hasAppliedCrop && previewCropFrameStyle ? (
                          <div
                            className="relative overflow-hidden"
                            style={previewCropFrameStyle}
                          >
                            <img
                              src={activePartImageUrl}
                              alt={customization.userPrompt}
                              className="absolute pointer-events-none max-w-none"
                              style={previewDesignImageStyle}
                            />
                          </div>
                        ) : (
                          <img
                            src={activePartImageUrl}
                            alt={customization.userPrompt}
                            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                          />
                        )}

                        <div className="pointer-events-none absolute inset-0 rounded-[inherit] border-2 border-neon-blue/80 shadow-[0_0_0_1px_rgba(255,255,255,0.65)_inset]" />
                        <div className="pointer-events-none absolute left-2 top-2 rounded-full bg-cyber-black/75 px-2 py-1 text-[8px] font-black uppercase tracking-[0.25em] text-neon-blue">
                          Drag To Move
                        </div>
                        <button
                          type="button"
                          className="absolute bottom-0 right-0 h-5 w-5 translate-x-1/2 translate-y-1/2 rounded-full border-2 border-white bg-neon-pink shadow-[0_0_0_4px_rgba(0,0,0,0.35)] cursor-nwse-resize"
                          style={{ touchAction: 'none' }}
                          onPointerDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            handlePlacementPointerDown(event, 'se');
                          }}
                          aria-label="Resize design"
                        />
                      </div>
                    )}

                    {/* Fixed print-area boundary — the admin-configured, non-draggable printable
                        region (see activeFixedPrintArea). Positioned relative to the canvas, not
                        the artwork box below, so it never moves when the artwork is dragged,
                        resized, or rotated. Shown alongside the other guides while interacting so
                        the preview stays uncluttered the rest of the time. */}
                    {isPlacementDragging && previewFixedPrintAreaStyle && (
                      <div
                        className="pointer-events-none absolute z-[8] border-2 border-solid border-neon-purple/70"
                        style={previewFixedPrintAreaStyle}
                        title="Print area — the fixed, non-draggable printable region for this part"
                      />
                    )}
                    {/* Design-boundary guides — safe area, bleed zone + centre/edge alignment
                        lines, shown only while actively dragging so the preview stays
                        uncluttered otherwise. Both are anchored to the fixed print area above,
                        not the draggable artwork box, so they stay put while the artwork moves. */}
                    {isPlacementDragging && previewSafeAreaStyle && (
                      <div
                        className="pointer-events-none absolute z-[9] border border-dashed border-emerald-400/70"
                        style={previewSafeAreaStyle}
                        title="Safe area — keep important content inside this zone"
                      />
                    )}
                    {isPlacementDragging && previewBleedAreaStyle && (
                      <div
                        className="pointer-events-none absolute z-[9] border border-dashed border-amber-400/60"
                        style={previewBleedAreaStyle}
                        title="Bleed area — designs may be trimmed slightly beyond the print area, not beyond this line"
                      />
                    )}
                    {isPlacementDragging && snapGuides.vertical && (
                      <div
                        className="pointer-events-none absolute inset-y-0 z-[11] w-px bg-neon-pink shadow-[0_0_6px_rgba(255,0,170,0.8)]"
                        style={{
                          left:
                            snapGuides.vertical === 'center'
                              ? '50%'
                              : snapGuides.vertical === 'left'
                                ? '0%'
                                : '100%',
                        }}
                      />
                    )}
                    {isPlacementDragging && snapGuides.horizontal && (
                      <div
                        className="pointer-events-none absolute inset-x-0 z-[11] h-px bg-neon-pink shadow-[0_0_6px_rgba(255,0,170,0.8)]"
                        style={{
                          top:
                            snapGuides.horizontal === 'center'
                              ? '50%'
                              : snapGuides.horizontal === 'top'
                                ? '0%'
                                : '100%',
                        }}
                      />
                    )}

                    {previewShadowLayerUrl && (
                      <img
                        src={previewShadowLayerUrl}
                        alt=""
                        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                        aria-hidden="true"
                      />
                    )}

                    {previewHighlightLayerUrl && (
                      <img
                        src={previewHighlightLayerUrl}
                        alt=""
                        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                        aria-hidden="true"
                        style={{ zIndex: 30 }}
                      />
                    )}

                    {/* Text Elements */}
                    <div className="absolute inset-0 z-40 pointer-events-none" style={{ containerType: 'inline-size' }}>
                      {textElements.filter((textEl) => !textEl.isHidden).map((textEl) => (
                        <div
                          key={textEl.id}
                          className={cn(
                            "absolute whitespace-pre-line origin-center transition-all",
                            activeTextId === textEl.id ? "outline outline-2 outline-neon-pink outline-offset-2" : "hover:outline hover:outline-1 hover:outline-white/50",
                            textEl.isLocked
                              ? "cursor-not-allowed pointer-events-auto"
                              : textDragState.current?.id === textEl.id
                                ? "cursor-grabbing"
                                : "cursor-grab pointer-events-auto"
                          )}
                          style={{
                            left: `${(textEl.x / templateDimensions.width) * 100}%`,
                            top: `${(textEl.y / templateDimensions.height) * 100}%`,
                            color: textEl.color,
                            fontFamily: textEl.fontFamily,
                            fontWeight: textEl.isBold ? 'bold' : 'normal',
                            fontStyle: textEl.isItalic ? 'italic' : 'normal',
                            fontSize: `${(textEl.fontSize / templateDimensions.width) * 100}cqi`,
                            letterSpacing: `${(textEl.letterSpacing || 0) / templateDimensions.width * 100}cqi`,
                            lineHeight: textEl.lineHeight ?? 1.2,
                            textAlign: textEl.textAlign ?? 'center',
                            transform: `translate(-50%, -50%) rotate(${textEl.rotation || 0}deg)`,
                            touchAction: 'none'
                          }}
                          onPointerDown={(e) => {
                            if (textEl.isLocked) return;
                            handleTextPointerDown(e, textEl.id);
                          }}
                          onClick={() => setActiveTextId(textEl.id)}
                          title={textEl.isLocked ? 'This layer is locked — unlock it in the panel to move it' : undefined}
                        >
                          {textEl.text}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <img 
                    src={customization.mockupImageUrl} 
                    alt={customization.productType} 
                    className={cn(
                      "w-full h-full object-contain selection-none pointer-events-none transition-all duration-500",
                      showPreviewLoading && "opacity-30 scale-[0.985]"
                    )}
                    onLoad={() => setIsPreviewAssetLoading(false)}
                    onError={() => setIsPreviewAssetLoading(false)}
                  />
                )}
              </div>
            )}

            {showPreviewLoading && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-cyber-black/58 backdrop-blur-[2px]">
                <div className="relative h-16 w-16">
                  <div className="absolute inset-0 rounded-full border-2 border-neon-blue/30" />
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-neon-blue border-r-neon-purple animate-spin" />
                  <div className="absolute inset-3 rounded-full border border-transparent border-b-neon-pink animate-spin [animation-direction:reverse] [animation-duration:1.3s]" />
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-white">
                    {previewLoading ? finalizationStage || 'Finalizing Mockup' : 'Loading Preview'}
                  </p>
                  <p className="mt-2 text-[9px] uppercase tracking-widest text-gray-400">
                    {previewLoading
                      ? 'Saving your chosen placement to the backend'
                      : 'Preparing the mockup workspace'}
                  </p>
                </div>
              </div>
            )}

            {/* Quick interactive buttons */}
            <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 flex items-center gap-2">
              <button 
                onClick={() => setIsPreviewOpen(true)}
                className="p-2.5 sm:p-3 rounded-full bg-cyber-black/80 border border-white/5 text-gray-400 hover:text-white transition-colors"
                title="View original high-res"
              >
                <Maximize2 size={16} />
              </button>
            </div>

            <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 bg-cyber-black/80 border border-white/5 rounded-lg px-2.5 sm:px-3 py-1.5 flex items-center gap-2 max-w-[70%]">
              <Layers size={14} className="text-neon-blue animate-pulse" />
              <span className="text-[8px] sm:text-[9px] font-mono tracking-widest text-[#9ca3af] uppercase leading-tight">
                {previewLoading
                  ? 'Finalizing backend render'
                  : isPreviewAssetLoading
                    ? 'Loading preview assets'
                    : 'Live preview mode active'}
              </span>
            </div>
          </div>

          {previewError && (
            <div className="rounded-2xl border border-neon-pink/30 bg-neon-pink/10 px-4 py-3 text-sm text-neon-pink">
              {previewError}
            </div>
          )}

          {customization.basePlacement && (
            <div className="lg:hidden glass-card border-white/10 p-4 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-neon-blue">Live Adjustment Deck</p>
                  <p className="mt-1 text-[10px] uppercase tracking-widest text-gray-500">
                    Drag the print box on the preview to move it. Pull the pink handle to resize it.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    pushHistorySnapshot();
                    setPlacementDraft(
                      customization.basePlacement
                        ? {
                            x: customization.basePlacement.x,
                            y: customization.basePlacement.y,
                            width: customization.basePlacement.width,
                            height: customization.basePlacement.height,
                          }
                        : null
                    );
                    setPlacementRotationDraft(null);
                    setCornerRadius(0);
                    setAppliedCropOverride(null);
                    setDraftCropRect({ left: 0, top: 0, width: 100, height: 100 });
                  }}
                  className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[9px] font-extrabold uppercase tracking-widest text-gray-300 transition-all hover:border-white/20 hover:text-white"
                >
                  Reset
                </button>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start gap-3">
                    <Move size={14} className="mt-0.5 text-neon-blue" />
                    <div>
                      <p className="text-[9px] font-extrabold uppercase tracking-[0.28em] text-white">
                        Direct Placement Mode
                      </p>
                      <p className="mt-2 text-[10px] uppercase tracking-widest text-gray-500">
                        Move and resize the design right on the preview instead of using sliders.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between text-[9px] uppercase tracking-widest text-gray-500">
                    <span className="inline-flex items-center gap-2">
                      <Sparkles size={12} />
                      Corner Radius
                    </span>
                    <span>{cornerRadius}px</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={120}
                    step={2}
                    value={cornerRadius}
                    onPointerDown={beginContinuousEdit}
                    onChange={(event) => {
                      beginContinuousEdit();
                      setCornerRadius(Number(event.target.value));
                    }}
                    onPointerUp={endContinuousEdit}
                    className="w-full accent-[var(--color-neon-blue)]"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-col items-start gap-3">
                  <div>
                    <label className="flex items-center gap-2 text-[8px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-2">
                      <Crop size={12} />
                      Design Crop
                    </label>
                    <p className="text-[9px] uppercase tracking-widest text-gray-500">
                      {hasAppliedCrop
                        ? `Crop applied • ${Math.round(appliedCropOverride?.width ?? 100)} by ${Math.round(appliedCropOverride?.height ?? 100)}`
                        : 'Full design is currently visible'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDraftCropRect(appliedCropOverride ?? { left: 0, top: 0, width: 100, height: 100 });
                        setIsCropStudioOpen(true);
                      }}
                      disabled={!activePartHasImage}
                      title={activePartHasImage ? undefined : 'Add a design to this part first'}
                      className="px-4 py-2 text-[9px] font-extrabold uppercase tracking-widest rounded-lg border border-white/10 bg-white/5 text-gray-300 hover:text-white hover:border-white/20 transition-all disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/10 disabled:hover:text-gray-300"
                    >
                      {hasAppliedCrop ? 'Edit Crop' : 'Open Crop Studio'}
                    </button>
                    {hasAppliedCrop && (
                      <button
                        type="button"
                        onClick={() => {
                          pushHistorySnapshot();
                          setAppliedCropOverride(null);
                          setDraftCropRect({ left: 0, top: 0, width: 100, height: 100 });
                        }}
                        className="px-4 py-2 text-[9px] font-extrabold uppercase tracking-widest rounded-lg border border-neon-pink/30 bg-neon-pink/10 text-neon-pink hover:bg-neon-pink hover:text-white transition-all"
                      >
                        Clear Crop
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="glass-card p-6 border-white/5 text-center flex-col items-center justify-center hidden sm:flex">
             <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping mb-3" />
             <p className="text-xs uppercase tracking-wider font-bold text-white mb-1">Generated by you. Printed for you.</p>
             <p className="text-[10px] text-gray-500 uppercase tracking-widest">Turn your customized neural idea into premium wearable and wall-ready art.</p>
          </div>
          </div>
        </section>

        {/* Configurations Forms sidebar */}
        <section className="flex flex-col h-full justify-between">
          <div>
            <span className="text-[10px] font-mono tracking-[0.4em] text-neon-blue uppercase mb-2 block">
              Configuration Module
            </span>
            <h1 className="text-3xl sm:text-4xl font-display font-black uppercase tracking-widest text-white mb-4">
              {customization.productType} Setup
            </h1>

            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <input
                type="text"
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                placeholder="Untitled Design"
                aria-label="Design project name"
                className="w-full sm:max-w-xs rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-white placeholder:text-gray-500 focus:outline-none focus:border-neon-blue"
              />
              <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest">
                {saveStatus === 'saving' && (
                  <span className="inline-flex items-center gap-1.5 text-gray-400">
                    <Loader2 size={12} className="animate-spin" /> Saving…
                  </span>
                )}
                {saveStatus === 'saved' && (
                  <span className="inline-flex items-center gap-1.5 text-emerald-400">
                    <Check size={12} /> Saved
                  </span>
                )}
                {saveStatus === 'dirty' && (
                  <span className="inline-flex items-center gap-1.5 text-neon-blue">
                    <span className="h-1.5 w-1.5 rounded-full bg-neon-blue" /> Unsaved changes
                  </span>
                )}
                {saveStatus === 'error' && (
                  <span className="inline-flex items-center gap-1.5 text-neon-pink" title={saveError || undefined}>
                    <AlertCircle size={12} /> Save failed
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => void handleSaveDesign()}
                  disabled={saveStatus === 'saving'}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-gray-300 transition-all hover:border-neon-blue hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save size={12} /> Save Design
                </button>
              </div>
            </div>

            {isLoadingProject && (
              <div className="mb-6 rounded-xl border border-neon-blue/20 bg-neon-blue/5 px-4 py-3 text-[10px] uppercase tracking-widest text-neon-blue">
                Loading saved design…
              </div>
            )}
            {projectLoadError && (
              <div className="mb-6 rounded-xl border border-neon-pink/30 bg-neon-pink/10 px-4 py-3 text-[10px] uppercase tracking-widest text-neon-pink">
                {projectLoadError}
              </div>
            )}

            {/* Development/admin action — generates the actual production print files (see
                DEVELOPER_GUIDE.md §2.5b), never a mockup preview. Kept visually and functionally
                separate from the "Mockup Preview" render above: different state, different
                button, different result list, and it never touches the cart or Printify. */}
            <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-neon-purple">
                    Production Print Files <span className="text-gray-500">(development/admin)</span>
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-widest text-gray-500">
                    Transparent, full-resolution files for fulfilment — not the mockup preview above.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleRefreshPrintFileStatus()}
                    disabled={!currentProjectId || printFileGenerationState === 'saving' || printFileGenerationState === 'generating'}
                    title="Check the latest status without generating anything new"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-gray-300 transition-all hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <RefreshCw size={12} /> Refresh Status
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleGeneratePrintFiles()}
                    disabled={
                      !user ||
                      !customization ||
                      printFileGenerationState === 'saving' ||
                      printFileGenerationState === 'generating' ||
                      !(Boolean(customization?.imageUrl) || textElements.length > 0 || Object.values(partsConfig).some(isPartConfigured))
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-neon-purple/40 bg-neon-purple/10 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-neon-purple transition-all hover:bg-neon-purple hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-neon-purple/10 disabled:hover:text-neon-purple"
                  >
                    {printFileGenerationState === 'saving' || printFileGenerationState === 'generating' ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <FileOutput size={12} />
                    )}
                    Generate Print Files
                  </button>
                </div>
              </div>

              {printFileGenerationState === 'saving' && (
                <p className="text-[10px] uppercase tracking-widest text-gray-400">Saving design…</p>
              )}
              {printFileGenerationState === 'generating' && (
                <p className="text-[10px] uppercase tracking-widest text-gray-400">Generating print files…</p>
              )}
              {printFileGenerationState === 'completed' && (
                <p className="text-[10px] uppercase tracking-widest text-emerald-400">Production files up to date.</p>
              )}
              {printFileGenerationState === 'partial' && (
                <p className="text-[10px] uppercase tracking-widest text-amber-400">Production files partially generated — see per-part results below.</p>
              )}
              {printFileGenerationState === 'failed' && (
                <p className="text-[10px] uppercase tracking-widest text-neon-pink">
                  {printFileGenerationError || 'Print file generation failed.'}
                </p>
              )}
              {printFileGenerationState !== 'failed' && printFileGenerationError && (
                <p className="text-[10px] uppercase tracking-widest text-neon-pink">{printFileGenerationError}</p>
              )}

              {printFileResults.length > 0 && (
                <div className="space-y-2 pt-1">
                  {printFileResults.map((result) => {
                    const isStale = partsConfig[result.partName]?.isPrintFileStale === true;
                    const isFailure = result.displayStatus === 'failed';
                    const isSkipped = result.displayStatus === 'skipped-empty' || result.displayStatus === 'skipped-unsupported';
                    return (
                      <div
                        key={result.partName}
                        className={cn(
                          'rounded-xl border px-3 py-2 text-[10px] uppercase tracking-widest',
                          isFailure
                            ? 'border-neon-pink/30 bg-neon-pink/5 text-neon-pink'
                            : isSkipped
                              ? 'border-white/5 bg-white/[0.02] text-gray-500'
                              : 'border-white/10 bg-white/5 text-gray-300'
                        )}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-bold text-white">
                            {result.partName}
                            {isStale && !isSkipped && (
                              <span className="ml-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[8px] font-bold text-amber-300 normal-case tracking-normal">
                                Stale — regenerate to match current design
                              </span>
                            )}
                          </span>
                          <span>{printFilePartStatusLabel(result.displayStatus)}</span>
                        </div>
                        {!isSkipped && !isFailure && (
                          <p className="mt-1 normal-case tracking-normal text-gray-400">
                            {result.width && result.height ? `${result.width} × ${result.height} px` : null}
                            {result.dpi ? ` · ${result.dpi} DPI` : null}
                            {' · Transparent PNG'}
                          </p>
                        )}
                        {isFailure && result.error && (
                          <p className="mt-1 normal-case tracking-normal">{result.error}</p>
                        )}
                        {result.printFileUrl && (
                          <a
                            href={result.printFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-neon-blue normal-case tracking-normal hover:underline"
                          >
                            <ExternalLink size={11} /> Open Print File
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex space-x-2 border-b border-white/10 mb-2">
              <button
                className={cn("px-4 py-3 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all", activeTab === 'design' ? "border-neon-blue text-neon-blue" : "border-transparent text-gray-400 hover:text-white")}
                onClick={() => setActiveTab('design')}
              >
                Design & Options
              </button>
              <button
                className={cn("px-4 py-3 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all flex items-center gap-2", activeTab === 'text' ? "border-neon-pink text-neon-pink" : "border-transparent text-gray-400 hover:text-white")}
                onClick={() => setActiveTab('text')}
              >
                <Type size={14} /> Add Text
              </button>
            </div>

            <div className="space-y-6 sm:space-y-8 py-6 sm:py-8">
              {activeTab === 'design' && (
                <>
                  {imageQualityWarnings.length > 0 && (
                    <div className="space-y-2 rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4">
                      {imageQualityWarnings.map((warning) => (
                        <div key={warning} className="flex items-start gap-2 text-[10px] uppercase tracking-wide text-amber-300">
                          <AlertCircle size={14} className="mt-0.5 shrink-0" />
                          <span className="normal-case tracking-normal">{warning}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {customization.basePlacement && (
                <div className="hidden lg:block space-y-5 sm:space-y-6 border-b border-white/5 pb-6 sm:pb-8">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <label className="flex items-center gap-2 text-[8px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-3">
                      <Move size={12} />
                      Direct Placement
                    </label>
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 leading-relaxed">
                      Drag the print box on the preview to reposition the design. Use the pink corner handle to resize it live.
                    </p>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-[8px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-3">
                      <Sparkles size={12} />
                      Corner Radius
                    </label>
                    <div className="flex items-center justify-between text-[9px] uppercase tracking-widest text-gray-500 mb-2">
                      <span>Rounded Corners</span>
                      <span>{cornerRadius}px</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={120}
                      step={2}
                      value={cornerRadius}
                      onPointerDown={beginContinuousEdit}
                      onChange={(event) => {
                        beginContinuousEdit();
                        setCornerRadius(Number(event.target.value));
                      }}
                      onPointerUp={endContinuousEdit}
                      className="w-full accent-[var(--color-neon-blue)]"
                    />
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <label className="flex items-center gap-2 text-[8px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-2">
                          <Crop size={12} />
                          Design Crop
                        </label>
                        <p className="text-[9px] uppercase tracking-widest text-gray-500">
                          {hasAppliedCrop
                            ? `Crop applied • ${Math.round(appliedCropOverride?.width ?? 100)} by ${Math.round(appliedCropOverride?.height ?? 100)}`
                            : 'Full design is currently visible'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setDraftCropRect(appliedCropOverride ?? { left: 0, top: 0, width: 100, height: 100 });
                            setIsCropStudioOpen(true);
                          }}
                          className="px-4 py-2 text-[9px] font-extrabold uppercase tracking-widest rounded-lg border border-white/10 bg-white/5 text-gray-300 hover:text-white hover:border-white/20 transition-all"
                        >
                          {hasAppliedCrop ? 'Edit Crop' : 'Open Crop Studio'}
                        </button>
                        {hasAppliedCrop && (
                          <button
                            type="button"
                            onClick={() => {
                              setAppliedCropOverride(null);
                              setDraftCropRect({ left: 0, top: 0, width: 100, height: 100 });
                            }}
                            className="px-4 py-2 text-[9px] font-extrabold uppercase tracking-widest rounded-lg border border-neon-pink/30 bg-neon-pink/10 text-neon-pink hover:bg-neon-pink hover:text-white transition-all"
                          >
                            Clear Crop
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      pushHistorySnapshot();
                      setPlacementDraft(
                        customization.basePlacement
                          ? {
                              x: customization.basePlacement.x,
                              y: customization.basePlacement.y,
                              width: customization.basePlacement.width,
                              height: customization.basePlacement.height,
                            }
                          : null
                      );
                      setCornerRadius(0);
                      setAppliedCropOverride(null);
                      setDraftCropRect({ left: 0, top: 0, width: 100, height: 100 });
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 text-[9px] font-extrabold uppercase tracking-widest rounded-lg border border-white/10 bg-white/5 text-gray-300 hover:text-white hover:border-white/20 transition-all"
                  >
                    Reset Placement
                  </button>
                </div>
              )}

              {/* Change Product Colours if available */}
              {customization.colours && customization.colours.length > 0 && (
                <div>
                  <label className="block text-[8px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-3">
                    Select Product Shade
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {customization.colours.map((colour) => {
                      const { disabled, reason } = describeOptionSellability('colour', colour);
                      return (
                        <button
                          key={colour}
                          disabled={disabled}
                          title={reason ?? undefined}
                          onClick={() => {
                            if (disabled || colour === selectedColour) return;
                            pushHistorySnapshot();
                            setSelectedColour(colour);
                          }}
                          className={cn(
                            "px-4 py-2 text-[9px] font-extrabold uppercase tracking-widest rounded-lg border transition-all",
                            disabled
                              ? "bg-white/5 border-white/5 text-gray-600 cursor-not-allowed opacity-50"
                              : selectedColour === colour
                                ? "bg-white text-cyber-black border-white"
                                : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                          )}
                        >
                          {colour}
                          {reason && <span className="ml-1.5 normal-case font-normal text-[8px] opacity-75">({reason})</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Selection Sizes if available */}
              {customization.sizes && customization.sizes.length > 0 && (
                <div>
                  <label className="block text-[8px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-3">
                    Choose Dimensions / Size
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {customization.sizes.map((size) => {
                      const { disabled, reason } = describeOptionSellability('size', size);
                      return (
                        <button
                          key={size}
                          disabled={disabled}
                          title={reason ?? undefined}
                          onClick={() => {
                            if (disabled || size === selectedSize) return;
                            pushHistorySnapshot();
                            setSelectedSize(size);
                          }}
                          className={cn(
                            "px-4 py-2.5 text-[9px] font-extrabold uppercase tracking-widest rounded-lg border transition-all",
                            disabled
                              ? "bg-white/5 border-white/5 text-gray-600 cursor-not-allowed opacity-50"
                              : selectedSize === size
                                ? "bg-neon-purple text-white border-neon-purple neon-glow-purple"
                                : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                          )}
                        >
                          {size}
                          {reason && <span className="ml-1.5 normal-case font-normal text-[8px] opacity-75">({reason})</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity Selector Selector */}
              <div>
                <label className="block text-[8px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-3">
                  Production Quantity
                </label>
                  <div className="inline-flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-1.5">
                  <button 
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="w-10 h-10 rounded-lg hover:bg-white/5 text-lg font-bold flex items-center justify-center transition-colors"
                  >
                    -
                  </button>
                  <span className="w-12 text-center text-sm font-mono font-bold">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(q => q + 1)}
                    className="w-10 h-10 rounded-lg hover:bg-white/5 text-lg font-bold flex items-center justify-center transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            </>
            )}

            {activeTab === 'text' && (
              <div className="space-y-6 border-b border-white/5 pb-6 sm:pb-8">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[10px] uppercase tracking-widest text-gray-500 leading-relaxed mb-4">
                    Add custom text layers. Drag the text on the preview to reposition.
                  </p>
                  <button
                    type="button"
                    onClick={addTextLayer}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/30 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all"
                  >
                    <Type size={14} /> Add New Text Block
                  </button>
                </div>

                {textElements.length > 0 && (
                  <div className="space-y-4">
                    {textElements.map(textEl => (
                      <div
                        key={textEl.id}
                        className={cn(
                          "rounded-2xl border bg-white/5 p-4 transition-all",
                          activeTextId === textEl.id ? "border-neon-pink" : "border-white/10",
                          textEl.isHidden && "opacity-50"
                        )}
                      >
                        <div className="flex items-center justify-between mb-4 gap-2">
                          <input
                            type="text"
                            value={textEl.layerName ?? ''}
                            onFocus={() => {
                              setActiveTextId(textEl.id);
                              beginContinuousEdit();
                            }}
                            onChange={(e) => renameTextLayer(textEl.id, e.target.value)}
                            onBlur={endContinuousEdit}
                            className="bg-transparent border-b border-white/20 text-white focus:outline-none focus:border-neon-pink text-sm w-full mr-2 min-w-0"
                            placeholder={textEl.text.slice(0, 24) || 'Text layer'}
                          />
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => toggleTextLayerLock(textEl.id)}
                              className={cn("p-1.5 rounded transition-colors", textEl.isLocked ? "text-neon-blue" : "text-gray-500 hover:text-white")}
                              title={textEl.isLocked ? "Unlock layer" : "Lock layer (prevents dragging on the preview)"}
                            >
                              {textEl.isLocked ? <Lock size={13} /> : <Unlock size={13} />}
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleTextLayerVisibility(textEl.id)}
                              className={cn("p-1.5 rounded transition-colors", textEl.isHidden ? "text-neon-pink" : "text-gray-500 hover:text-white")}
                              title={textEl.isHidden ? "Show layer" : "Hide layer (kept, just not shown or printed)"}
                            >
                              {textEl.isHidden ? <EyeOff size={13} /> : <Eye size={13} />}
                            </button>
                            <button
                              type="button"
                              onClick={() => duplicateTextLayer(textEl.id)}
                              className="p-1.5 rounded text-gray-500 hover:text-white transition-colors"
                              title="Duplicate layer"
                            >
                              <CopyIcon size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveTextLayerUp(textEl.id)}
                              className="text-gray-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest px-1.5"
                              title="Move Layer Forward"
                            >
                              Up
                            </button>
                            <button
                              type="button"
                              onClick={() => moveTextLayerDown(textEl.id)}
                              className="text-gray-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest px-1.5"
                              title="Move Layer Backward"
                            >
                              Down
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteTextLayer(textEl.id)}
                              className="text-gray-500 hover:text-neon-pink transition-colors text-xs font-bold uppercase tracking-widest pl-1.5"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        {activeTextId === textEl.id && (
                          <div className="space-y-4 pt-4 border-t border-white/10">
                            <div>
                              <label className="block text-[8px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-2">Text</label>
                              <textarea
                                value={textEl.text}
                                onFocus={beginContinuousEdit}
                                onChange={(e) => updateTextLayer(textEl.id, { text: e.target.value }, { recordHistory: false })}
                                onBlur={endContinuousEdit}
                                rows={2}
                                className="w-full resize-y bg-cyber-black border border-white/20 text-white text-sm p-2 rounded outline-none focus:border-neon-pink"
                                placeholder="Type here... (use a new line for multi-line text)"
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-2">Font Size</label>
                              <input
                                type="range"
                                min={12}
                                max={200}
                                value={textEl.fontSize}
                                onPointerDown={beginContinuousEdit}
                                onChange={(e) => updateTextLayer(textEl.id, { fontSize: Number(e.target.value) }, { recordHistory: false })}
                                onPointerUp={endContinuousEdit}
                                className="w-full accent-[var(--color-neon-pink)]"
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-2">Rotation</label>
                              <input
                                type="range"
                                min={-180}
                                max={180}
                                value={textEl.rotation || 0}
                                onPointerDown={beginContinuousEdit}
                                onChange={(e) => updateTextLayer(textEl.id, { rotation: Number(e.target.value) }, { recordHistory: false })}
                                onPointerUp={endContinuousEdit}
                                className="w-full accent-[var(--color-neon-pink)]"
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-2">Letter Spacing</label>
                              <input
                                type="range"
                                min={-20}
                                max={100}
                                value={textEl.letterSpacing || 0}
                                onPointerDown={beginContinuousEdit}
                                onChange={(e) => updateTextLayer(textEl.id, { letterSpacing: Number(e.target.value) }, { recordHistory: false })}
                                onPointerUp={endContinuousEdit}
                                className="w-full accent-[var(--color-neon-pink)]"
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-2">Line Spacing</label>
                              <input
                                type="range"
                                min={0.8}
                                max={2.5}
                                step={0.1}
                                value={textEl.lineHeight ?? 1.2}
                                onPointerDown={beginContinuousEdit}
                                onChange={(e) => updateTextLayer(textEl.id, { lineHeight: Number(e.target.value) }, { recordHistory: false })}
                                onPointerUp={endContinuousEdit}
                                className="w-full accent-[var(--color-neon-pink)]"
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-2">Alignment</label>
                              <div className="flex gap-2">
                                {(['left', 'center', 'right'] as const).map((align) => (
                                  <button
                                    key={align}
                                    type="button"
                                    onClick={() => updateTextLayer(textEl.id, { textAlign: align })}
                                    className={cn(
                                      "flex-1 px-3 py-1.5 rounded border text-[9px] font-bold uppercase tracking-widest transition-colors",
                                      (textEl.textAlign ?? 'center') === align
                                        ? "bg-neon-blue text-cyber-black border-neon-blue"
                                        : "bg-transparent text-gray-400 border-white/20 hover:border-white/50"
                                    )}
                                  >
                                    {align}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[8px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-2">Color</label>
                                <input
                                  type="color"
                                  value={textEl.color}
                                  onFocus={beginContinuousEdit}
                                  onChange={(e) => updateTextLayer(textEl.id, { color: e.target.value }, { recordHistory: false })}
                                  onBlur={endContinuousEdit}
                                  className="w-full h-8 rounded bg-transparent cursor-pointer"
                                />
                              </div>
                              <div>
                                <label className="block text-[8px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-2">Font</label>
                                <select
                                  value={textEl.fontFamily}
                                  onChange={(e) => updateTextLayer(textEl.id, { fontFamily: e.target.value })}
                                  className="w-full bg-cyber-black border border-white/20 text-white text-xs p-1.5 rounded outline-none focus:border-neon-pink"
                                  style={{ fontFamily: textEl.fontFamily }}
                                >
                                  <option value="Roboto" style={{ fontFamily: 'Roboto' }}>Roboto</option>
                                  <option value="Impact" style={{ fontFamily: 'Impact' }}>Impact</option>
                                  <option value="Pacifico" style={{ fontFamily: 'Pacifico' }}>Pacifico</option>
                                  <option value="Orbitron" style={{ fontFamily: 'Orbitron' }}>Orbitron</option>
                                  <option value="Rajdhani" style={{ fontFamily: 'Rajdhani' }}>Rajdhani</option>
                                  <option value="Audiowide" style={{ fontFamily: 'Audiowide' }}>Audiowide</option>
                                </select>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 mt-2">
                              <button
                                type="button"
                                onClick={() => updateTextLayer(textEl.id, { isBold: !textEl.isBold })}
                                className={cn("px-3 py-1.5 rounded border text-xs font-bold transition-colors", textEl.isBold ? "bg-neon-blue text-cyber-black border-neon-blue" : "bg-transparent text-gray-400 border-white/20 hover:border-white/50")}
                              >
                                BOLD
                              </button>
                              <button
                                type="button"
                                onClick={() => updateTextLayer(textEl.id, { isItalic: !textEl.isItalic })}
                                className={cn("px-3 py-1.5 rounded border text-xs italic transition-colors", textEl.isItalic ? "bg-neon-pink text-white border-neon-pink" : "bg-transparent text-gray-400 border-white/20 hover:border-white/50")}
                              >
                                ITALIC
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            </div>

            {/* Production readiness notes — deliberately no shipping/refund promises here.
                Real checkout, shipping and fulfilment aren't built yet (see CartPage.tsx). */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-8 border-b border-white/5">
              <div className="flex items-start gap-3 bg-white/5 p-4 rounded-xl">
                <Truck className="text-neon-blue mt-0.5" size={16} />
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-white">Shipping Coming Soon</p>
                  <p className="text-[8px] text-gray-500 uppercase tracking-widest mt-0.5">Shipping and delivery aren't available yet.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-white/5 p-4 rounded-xl">
                <ShieldCheck className="text-neon-pink mt-0.5" size={16} />
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-white">Production File Ready</p>
                  <p className="text-[8px] text-gray-500 uppercase tracking-widest mt-0.5">Transparent, full-resolution files for future fulfilment.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 sm:pt-8">
            {restoredVariantIsInvalid && (
              <div className="mb-6 rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-amber-100">
                This product option is no longer available. Choose another variant before continuing.
              </div>
            )}
            {!restoredVariantIsInvalid && !sellableSelection.selection && customization.productId && (
              <div className="mb-6 rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-amber-100">
                {describeSellableSelectionReason(sellableSelection.reason) ?? 'This item is not yet available for purchase.'}
              </div>
            )}
            {!customization.productId && (
              <div className="mb-6 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Preview only — this prop isn't linked to a purchasable product yet.
              </div>
            )}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
              <div>
                <span className="text-[10px] text-gray-500 uppercase tracking-widest block">Starting Estimate (VAT inc)</span>
                <span className="text-4xl font-display font-black text-white">
                  {totalPrice !== null ? `$${totalPrice}` : 'Currently unavailable'}
                </span>
              </div>
              <div className="sm:text-right">
                <span className="text-[8px] text-neon-blue uppercase font-bold tracking-widest bg-neon-blue/10 px-2 py-1 rounded">
                  {quantity > 1 ? `${quantity} items synced` : 'Single Run Item'}
                </span>
              </div>
            </div>


            <button
              onClick={handleGenerateRealisticPreview}
              disabled={showPreviewLoading || !activePartHasImage}
              title={activePartHasImage ? undefined : 'Add a design to this part first'}
              className={cn(
                "w-full flex items-center justify-center gap-3 px-8 py-4 mb-4 rounded-full font-bold uppercase tracking-widest text-xs transition-all duration-300 border-2",
                showPreviewLoading || !activePartHasImage
                  ? "border-cyber-gray text-gray-500 cursor-not-allowed"
                  : "border-neon-pink text-neon-pink hover:bg-neon-pink/10 hover:shadow-neon-pink"
              )}
            >
              <Maximize2 size={16} />
              Generate Realistic Preview
            </button>
            <button
              onClick={handleConfirmAddToCart}
              disabled={isAdding || isSuccess || !sellableSelection.selection}
              title={sellableSelection.selection ? undefined : describeSellableSelectionReason(sellableSelection.reason) ?? undefined}
              className={cn(
                "w-full flex items-center justify-center gap-3 py-4 text-xs font-black uppercase tracking-widest text-cyber-black bg-white hover:bg-neon-blue hover:text-white rounded-xl transition-all duration-300",
                isSuccess && "bg-neon-pink text-white neon-glow-pink",
                !sellableSelection.selection && !isSuccess && "opacity-40 cursor-not-allowed hover:bg-white hover:text-cyber-black"
              )}
            >
              {isAdding ? (
                 <>
                   <span className="w-4 h-4 border-2 border-cyber-black border-t-transparent rounded-full animate-spin" />
                   Injecting into Cart Server...
                 </>
              ) : isSuccess ? (
                 <>
                   <Check size={16} />
                   Saved in Cart!
                 </>
              ) : (
                 <>
                   <ShoppingBag size={16} />
                   Save customized item to cart
                 </>
              )}
            </button>
          </div>
        </section>

      </div>

      <AnimatePresence>
        {isCropStudioOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overflow-y-auto bg-cyber-black/85 px-4 sm:px-6 py-4 sm:py-10 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              className="relative my-auto mx-auto w-full max-w-5xl rounded-[2rem] border border-white/10 bg-[#090b10] shadow-[0_30px_120px_rgba(0,0,0,0.6)] max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-5rem)] overflow-y-auto"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-white/10 bg-[#090b10]/95 px-5 sm:px-8 py-5 sm:py-6 backdrop-blur-md">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-neon-blue">Crop Studio</p>
                  <h3 className="mt-2 text-2xl font-display font-black uppercase tracking-widest text-white">
                    Focus The Design
                  </h3>
                  <p className="mt-2 text-[10px] uppercase tracking-widest text-gray-500">
                    Zoom and reposition the artwork. Nothing changes until you apply it.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCropStudioOpen(false)}
                  className="rounded-full border border-white/10 px-4 py-2 text-[9px] font-extrabold uppercase tracking-widest text-gray-300 hover:border-white/20 hover:text-white transition-all"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:gap-8 px-5 sm:px-8 py-5 sm:py-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                <div className="space-y-4">
                  <div className="rounded-[1.75rem] border border-white/10 bg-cyber-black/60 p-6">
                    <div
                      ref={cropStageRef}
                      className={cn(
                        "relative mx-auto w-full max-w-2xl overflow-hidden rounded-[1.5rem] border border-dashed border-neon-blue/35 bg-cyber-gray/20 select-none",
                        isCropDragging ? "cursor-grabbing" : "cursor-default"
                      )}
                      style={{ aspectRatio: cropStudioAspectRatio, touchAction: 'none', overscrollBehavior: 'contain' }}
                      onPointerMove={handleCropPointerMove}
                      onPointerUp={handleCropPointerEnd}
                      onPointerCancel={handleCropPointerEnd}
                    >
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06),transparent_68%)]" />
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:18%_18%] opacity-40" />
                      <img
                        src={activePartImageUrl}
                        alt={`${customization.userPrompt} crop preview`}
                        className="absolute inset-0 h-full w-full object-contain pointer-events-none"
                        onLoad={(event) => {
                          const { naturalWidth, naturalHeight } = event.currentTarget;
                          if (naturalWidth > 0 && naturalHeight > 0) {
                            setCropStudioImageDimensions({ width: naturalWidth, height: naturalHeight });
                          }
                        }}
                      />
                      <div
                        className={cn(
                          "absolute rounded-[1.15rem] border-2 border-white/90 bg-white/[0.04] shadow-[0_0_0_9999px_rgba(0,0,0,0.58)] backdrop-blur-[1px]",
                          isCropDragging ? "cursor-grabbing" : "cursor-move"
                        )}
                        style={{
                          left: `${draftCropRect.left}%`,
                          top: `${draftCropRect.top}%`,
                          width: `${draftCropRect.width}%`,
                          height: `${draftCropRect.height}%`,
                          touchAction: 'none',
                        }}
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          handleCropPointerDown(event, 'move');
                        }}
                      >
                        <img
                          src={activePartImageUrl}
                          alt=""
                          aria-hidden="true"
                          className="absolute pointer-events-none max-w-none"
                          style={draftCropPreviewStyle}
                        />
                        <div className="pointer-events-none absolute inset-0 rounded-[1rem] border border-white/25 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]" />
                        <div className="pointer-events-none absolute left-1/3 top-0 bottom-0 border-l border-white/20" />
                        <div className="pointer-events-none absolute left-2/3 top-0 bottom-0 border-l border-white/20" />
                        <div className="pointer-events-none absolute top-1/3 left-0 right-0 border-t border-white/20" />
                        <div className="pointer-events-none absolute top-2/3 left-0 right-0 border-t border-white/20" />

                        {([
                          ['nw', 'left-0 top-0 cursor-nwse-resize -translate-x-1/2 -translate-y-1/2'],
                          ['n', 'left-1/2 top-0 cursor-ns-resize -translate-x-1/2 -translate-y-1/2'],
                          ['ne', 'right-0 top-0 cursor-nesw-resize translate-x-1/2 -translate-y-1/2'],
                          ['e', 'right-0 top-1/2 cursor-ew-resize translate-x-1/2 -translate-y-1/2'],
                          ['se', 'right-0 bottom-0 cursor-nwse-resize translate-x-1/2 translate-y-1/2'],
                          ['s', 'left-1/2 bottom-0 cursor-ns-resize -translate-x-1/2 translate-y-1/2'],
                          ['sw', 'left-0 bottom-0 cursor-nesw-resize -translate-x-1/2 translate-y-1/2'],
                          ['w', 'left-0 top-1/2 cursor-ew-resize -translate-x-1/2 -translate-y-1/2'],
                        ] as const).map(([handle, className]) => (
                          <button
                            key={handle}
                            type="button"
                            className={cn(
                              "absolute rounded-full border-2 border-white bg-cyber-black shadow-[0_0_0_4px_rgba(0,0,0,0.35)]",
                              className
                            )}
                            style={{ width: `${CROP_HANDLE_SIZE}px`, height: `${CROP_HANDLE_SIZE}px`, touchAction: 'none' }}
                            onPointerDown={(event) => {
                              event.stopPropagation();
                              handleCropPointerDown(event, handle);
                            }}
                          />
                        ))}
                      </div>
                      <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
                        <span className="rounded-full border border-white/10 bg-cyber-black/75 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.3em] text-gray-300">
                          Drag The Box Or Pull A Handle
                        </span>
                      </div>
                      <div className="absolute inset-0 border border-white/10 pointer-events-none" />
                    </div>
                  </div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-500">
                    Resize from any corner or side to change crop size and aspect ratio. Drag inside the box to reposition it over the artwork.
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-gray-300 mb-3">
                      Crop Box Presets
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: 'Full', rect: { left: 0, top: 0, width: 100, height: 100 } },
                        { label: 'Square', rect: { left: 20, top: 20, width: 60, height: 60 } },
                        { label: 'Portrait', rect: { left: 28, top: 8, width: 44, height: 78 } },
                        { label: 'Wide', rect: { left: 10, top: 26, width: 80, height: 48 } },
                      ].map(({ label, rect }) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => setDraftCropRect(rect)}
                          className={cn(
                            "px-3 py-2 text-[9px] font-extrabold uppercase tracking-widest rounded-lg border transition-all",
                            draftCropRect.left === rect.left &&
                            draftCropRect.top === rect.top &&
                            draftCropRect.width === rect.width &&
                            draftCropRect.height === rect.height
                              ? "bg-white text-cyber-black border-white"
                              : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20"
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-gray-300">
                        Crop Metrics
                      </p>
                      <span className="text-[9px] uppercase tracking-widest text-gray-500">
                        {Math.round(draftCropRect.width)}w / {Math.round(draftCropRect.height)}h
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[9px] uppercase tracking-widest text-gray-500">
                      <span>Left: {Math.round(draftCropRect.left)}%</span>
                      <span>Top: {Math.round(draftCropRect.top)}%</span>
                      <span>Width: {Math.round(draftCropRect.width)}%</span>
                      <span>Height: {Math.round(draftCropRect.height)}%</span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-[10px] uppercase tracking-widest text-gray-500">
                    Press <span className="text-white font-bold">Apply Crop</span> to use this crop.
                    Use <span className="text-white font-bold">Reset</span> to go back to the full design before applying.
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setDraftCropRect({ left: 0, top: 0, width: 100, height: 100 });
                      }}
                      className="px-4 py-3 text-[9px] font-extrabold uppercase tracking-widest rounded-xl border border-white/10 bg-white/5 text-gray-300 hover:text-white hover:border-white/20 transition-all"
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        pushHistorySnapshot();
                        setAppliedCropOverride(null);
                        setDraftCropRect({ left: 0, top: 0, width: 100, height: 100 });
                        setIsCropStudioOpen(false);
                      }}
                      className="px-4 py-3 text-[9px] font-extrabold uppercase tracking-widest rounded-xl border border-neon-pink/30 bg-neon-pink/10 text-neon-pink hover:bg-neon-pink hover:text-white transition-all"
                    >
                      Remove Crop
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const nextCrop =
                          draftCropRect.left === 0 &&
                          draftCropRect.top === 0 &&
                          draftCropRect.width === 100 &&
                          draftCropRect.height === 100
                            ? null
                            : draftCropRect;

                        pushHistorySnapshot();
                        setAppliedCropOverride(nextCrop);
                        setIsCropStudioOpen(false);
                      }}
                      className="ml-auto px-5 py-3 text-[9px] font-black uppercase tracking-widest rounded-xl bg-white text-cyber-black hover:bg-neon-blue hover:text-white transition-all"
                    >
                      Apply Crop
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ImageModal 
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        imageUrl={customization.imageUrl}
        title={`Vision: ${customization.userPrompt}`}
        artworkId={customization.artworkId || undefined}
      />
      <ImageModal
        isOpen={isRealisticPreviewOpen}
        onClose={() => setIsRealisticPreviewOpen(false)}
        imageUrl={realisticPreviewUrl || ''}
        title={`Realistic Preview of ${activePart}`}
      />

      {/* Choose from Gallery selector (section 7) — paginated, searchable, admin-uploaded
          designs only. Applying a selection never navigates away from customization. */}
      <AnimatePresence>
        {isGallerySelectorOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-cyber-black/85 px-4 py-8 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="gallery-selector-title"
            onKeyDown={(event) => {
              if (event.key === 'Escape') setIsGallerySelectorOpen(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="glass-card relative flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden border-white/15 p-0"
            >
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                <h3 id="gallery-selector-title" className="text-lg font-display font-black uppercase tracking-widest text-white">
                  Choose from Gallery
                </h3>
                <button
                  type="button"
                  onClick={() => setIsGallerySelectorOpen(false)}
                  aria-label="Close gallery selector"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-300 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="border-b border-white/10 px-6 py-4">
                <div className="relative">
                  <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <label htmlFor="gallery-selector-search" className="sr-only">
                    Search gallery designs
                  </label>
                  <input
                    id="gallery-selector-search"
                    type="search"
                    value={gallerySearchInput}
                    onChange={(event) => setGallerySearchInput(event.target.value)}
                    placeholder="Search designs..."
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-4 text-sm text-white placeholder:text-gray-500 outline-none focus:border-neon-pink/50"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5">
                {galleryLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 size={24} className="animate-spin text-neon-pink" />
                  </div>
                ) : galleryError ? (
                  <div className="flex h-full items-center justify-center text-sm text-neon-pink">{galleryError}</div>
                ) : galleryArtworks.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center text-gray-500">
                    <ImageIcon size={28} className="mb-3" />
                    <p className="text-xs font-bold uppercase tracking-widest">No designs found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                    {galleryArtworks.map((artwork) => (
                      <button
                        key={artwork.id}
                        type="button"
                        onClick={() => void handleGallerySelect(artwork)}
                        className="group overflow-hidden rounded-2xl border border-white/10 bg-white/5 text-left transition-all hover:border-neon-pink/40"
                      >
                        <div className="aspect-square bg-cyber-black/60">
                          <SmartImage
                            src={artwork.thumbnailUrl || artwork.imageUrl}
                            alt={artwork.title}
                            className="w-full h-full"
                            imgClassName="w-full h-full object-cover transition-transform group-hover:scale-105"
                            loading="lazy"
                          />
                        </div>
                        <p className="truncate px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-300">
                          {artwork.title}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {galleryTotalPages > 1 && (
                <div className="flex items-center justify-center gap-3 border-t border-white/10 px-6 py-4">
                  <button
                    type="button"
                    onClick={() => setGalleryPage((page) => Math.max(1, page - 1))}
                    disabled={galleryPage <= 1}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-gray-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500">
                    Page {galleryPage} of {galleryTotalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setGalleryPage((page) => Math.min(galleryTotalPages, page + 1))}
                    disabled={galleryPage >= galleryTotalPages}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-gray-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generate with AI panel (section 12) — embedded, never navigates away. Selecting the
          generated result uploads it (as an ai_generated SourceDesignAsset) and applies it to
          the active part, same as Gallery/Upload. */}
      <AnimatePresence>
        {isAiPanelOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-cyber-black/85 px-4 py-8 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-panel-title"
            onKeyDown={(event) => {
              if (event.key === 'Escape') setIsAiPanelOpen(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="glass-card relative w-full max-w-lg border-white/15 p-6"
            >
              <div className="mb-5 flex items-center justify-between">
                <h3 id="ai-panel-title" className="text-lg font-display font-black uppercase tracking-widest text-white">
                  Generate with AI
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAiPanelOpen(false)}
                  aria-label="Close AI generation panel"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-300 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <label htmlFor="ai-prompt" className="mb-2 block text-[9px] font-bold uppercase tracking-widest text-gray-400">
                Prompt
              </label>
              <textarea
                id="ai-prompt"
                value={aiPrompt}
                onChange={(event) => setAiPrompt(event.target.value)}
                placeholder="Describe the design you want..."
                rows={3}
                className="mb-4 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none focus:border-neon-purple/50"
              />

              <label htmlFor="ai-aspect-ratio" className="mb-2 block text-[9px] font-bold uppercase tracking-widest text-gray-400">
                Aspect Ratio
              </label>
              <select
                id="ai-aspect-ratio"
                value={aiAspectRatio}
                onChange={(event) => setAiAspectRatio(event.target.value as typeof aiAspectRatio)}
                className="mb-5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-neon-purple/50"
              >
                {AI_ASPECT_RATIO_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              {aiError && (
                <div className="mb-4 rounded-xl border border-neon-pink/25 bg-neon-pink/10 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-neon-pink">
                  {aiError}
                </div>
              )}

              {aiGeneratedImage && (
                <div className="mb-5 overflow-hidden rounded-2xl border border-white/10">
                  <img src={aiGeneratedImage} alt="AI generated design preview" className="w-full" />
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleAiGenerate}
                  disabled={aiGenerating || !aiPrompt.trim()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-neon-purple/40 bg-neon-purple/10 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-neon-purple/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {aiGenerating ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                  {aiGenerating ? 'Generating...' : aiGeneratedImage ? 'Regenerate' : 'Generate'}
                </button>
                {aiGeneratedImage && (
                  <button
                    type="button"
                    onClick={handleAiSelectGenerated}
                    disabled={aiApplying}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-[10px] font-black uppercase tracking-widest text-cyber-black transition-all hover:bg-neon-purple hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {aiApplying ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    {aiApplying ? 'Saving...' : 'Use This Design'}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
