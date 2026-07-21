export type Category = 
  | 'Cyberpunk Metropolis'
  | 'Mecha & Futuristic Machines'
  | 'Cosmic Dreams'
  | 'Dark Fantasy Realms'
  | 'Neon Samurai'
  | 'Mythical Creatures Reimagined'
  | 'Luxury Abstracts'
  | 'AI Fashion & Futuristic Portraits'
  | 'Dreamscapes & Surreal Worlds'
  | 'Anime Cinematics'
  | 'All'
  | string;

export interface Artwork {
  id: string;
  backendArtworkId?: number;
  title: string;
  category: string;
  collectionName?: string;
  collectionSlug?: string;
  description: string;
  tags: string[];
  suitableProducts: string[];
  imageUrl: string;
  thumbnailUrl?: string;
  wallpaperDownloadUrl: string;
  printProductUrl: string;
  price: string;
  isFeatured: boolean;
  isPremium: boolean;
  createdAt: string;
}

export interface CollectionSummary {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export interface VideoClip {
  id: string;
  title: string;
  thumbnailUrl: string;
  videoUrl: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  /** Derived server-side from the cheapest valid (available, priced, product/template-matched)
   * variant — `base_cost + markup`, same formula the cart pricing engine uses. Null when the
   * product has no such variant yet (shouldn't normally be publicly visible in that state, but
   * treat null honestly — e.g. "Currently unavailable" — never show `$0.00` as a fallback). */
  startingPrice: string | null;
  /** True when at least one variant is sellable (available, priced, and matched to this
   * product's template). Mirrors `apps.shop.services.product_has_sellable_variant` on the
   * backend — don't re-derive this from `variants` client-side. */
  isAvailable: boolean;
  availableVariantCount: number;
  totalVariantCount: number;
  imageUrl: string;
  thumbnailUrl?: string;
  description?: string;
  /** The generator.MockupTemplate this storefront product renders through, if it's
   * customizable at all — null/undefined for a plain static listing. */
  mockupTemplateId?: number | null;
  variants?: ProductVariant[];
  availableSizes?: string[];
  availableColors?: string[];
}

/** Envelope shape returned by the paginated `/api/shop/products/` list — see
 * apps.shop.pagination.StandardResultsSetPagination on the backend. Used by the Shop catalogue
 * page; simple callers that just want "all sellable products" keep using `getProducts()`
 * (unwraps this internally). */
export interface PaginatedProducts {
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
  next: string | null;
  previous: string | null;
  results: Product[];
}

/** Query params accepted by the paginated product list — see the backend's whitelisted
 * `ordering` values (name/-name/starting_price/-starting_price/created_at/-created_at) and
 * `product_type` (MockupTemplate.ProductType). `search` matches product name or description. */
export interface ProductSearchParams {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  productType?: string;
  ordering?: string;
}

/** Envelope shape returned by the paginated `/api/gallery/artworks/` list, used by the
 * customization editor's "Choose from Gallery" selector. Mirrors PaginatedProducts. */
export interface PaginatedArtworks {
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
  next: string | null;
  previous: string | null;
  results: Artwork[];
}

export interface ArtworkSearchParams {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  ordering?: string;
}

export interface AvailableMockupProduct {
  templateId?: number;
  productType: string;
  mockupImageUrl: string;
  basePrice: number;
  sizes: string[];
  colours: string[];
  printArea: string;
  isRecommended: boolean;
}

export interface PlacementOverride {
  x: number;
  y: number;
  width: number;
  height: number;
  cornerRadius?: number;
  fit?: 'contain' | 'cover' | string;
  rotation?: number;
  opacity?: number;
}

export interface CropOverride {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface TextElement {
  id: string;
  text: string;
  fontFamily: string;
  color: string;
  fontSize: number;
  x: number;
  y: number;
  rotation: number;
  isBold?: boolean;
  isItalic?: boolean;
  letterSpacing?: number;
  /** Horizontal alignment of multi-line text within its block. Defaults to 'center'. */
  textAlign?: 'left' | 'center' | 'right';
  /** Line spacing as a multiplier of the font's natural line height (e.g. 1.2 = 120%). */
  lineHeight?: number;
  /** True hides this layer from the preview and from checkout renders/print files, without
   * deleting it — the layer's other properties are preserved for when it's unhidden. */
  isHidden?: boolean;
  /** True prevents this layer from being dragged/resized on the preview canvas. */
  isLocked?: boolean;
  /** Optional display name for the layer list — falls back to a truncated `text` when unset. */
  layerName?: string;
}

/** Layer model (MVP, deliberate scope decision — not a limitation to "fix" later without a
 * product decision to do so): each print part has exactly one image layer (`imageUrl` /
 * `sourceArtworkId` / `sourceGeneratedImageId` — a single artwork, never a stack of images) plus
 * any number of independent text layers (`textElements`). There is no unified image+text layer
 * list, no multi-image-layer support, and no plans to add either here — a customer places one
 * artwork per part and annotates it with text. If a future requirement genuinely needs multiple
 * independent images on one part, that's a new data model, not an extension of this one; don't
 * bolt it onto PartCustomization/TextElement. See services.py's equivalent note on the backend.
 *
 * Future work (not started, not scheduled): multiple image layers per part, and a single unified
 * image+text layer stack with shared z-ordering (currently the one image always renders behind
 * every text layer — see `_draw_text_elements`'s call order in `render_mockup_to_image` /
 * `generate_print_file_image`). Either would need a real data-model change (a layer list with a
 * discriminated `type: 'image' | 'text'`, not a bolt-on field here) plus editor UI, undo/redo,
 * and production-signature updates to match — a project-level decision, not a drive-by addition. */
/** Response shape from POST /api/generator/design-assets/upload/ — a private (owner-scoped),
 * server-stored image behind a device upload ("Upload Design") or a persisted AI-generated
 * result ("Generate with AI"). Distinct from `Artwork` (public, admin-owned gallery designs). */
export interface SourceDesignAsset {
  id: number;
  sourceType: 'user_upload' | 'ai_generated' | 'gallery';
  fileUrl: string | null;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  hasTransparency: boolean;
  createdAt: string;
}

export interface PartCustomization {
  sourceArtworkId?: number;
  sourceGeneratedImageId?: number;
  /** An uploaded-file or AI-generated `SourceDesignAsset` id — set only when this part's
   * artwork came from the customization editor's Upload or Generate-with-AI actions (a Gallery
   * selection still uses `sourceArtworkId` above; a SourceDesignAsset is never created for
   * that). See `lib/api.ts`'s `uploadDesignAsset`. */
  sourceAssetId?: number;
  imageUrl?: string;
  userPrompt?: string;
  placementOverride?: PlacementOverride;
  cropOverride?: CropOverride;
  textElements?: TextElement[];
  mockupImageUrl?: string;
  backendRenderId?: number;
  /** True when this part's printable properties (artwork/text/placement/crop/etc.) have
   * changed since its last successful render — used to skip re-rendering unchanged parts
   * before checkout. False/undefined means the existing mockupImageUrl/backendRenderId (if
   * any) are still valid. This governs the mockup PREVIEW render only — see
   * `isPrintFileStale` below for the separate production-file signal. */
  isDirty?: boolean;
  /** The URL of this part's most recently generated PRODUCTION print file (a transparent,
   * full-resolution PNG — see `GeneratedPrintFile` on the backend). Deliberately a distinct
   * field from `mockupImageUrl`: never store a print-file URL there, and never store the
   * mockup preview URL here — the two are rendered in completely different places (the garment
   * preview vs. the "Production Print Files" panel) and must never be interchangeable. */
  printFileUrl?: string;
  /** True when a printable edit has happened on this part since its production file (if any)
   * was last generated — the file at `printFileUrl` may no longer match the current design.
   * Purely a client-side, best-effort hint for the "Production Print Files" panel; the backend
   * remains authoritative (a stale-looking part may still return `reused: true` if its actual
   * content-signature is unchanged — e.g. renaming a text layer marks this true, but layer
   * names aren't part of the backend signature, so generating again just reuses the file). Unset
   * or false means "as far as the editor knows, this still matches the last generated file." */
  isPrintFileStale?: boolean;
}

export interface ActiveCustomization {
  artworkId: string;
  sourceArtworkId?: number;
  sourceGeneratedImageId?: number;
  userPrompt: string;
  imageUrl: string;
  templateId: number;
  templateName?: string;
  productType: string;
  mockupImageUrl: string;
  templateBaseImageUrl?: string | null;
  templateMaskImageUrl?: string | null;
  templateShadowLayerUrl?: string | null;
  templateHighlightLayerUrl?: string | null;
  templateParts?: MockupTemplatePart[];
  /** Display-only "starting estimate" resolved from the matched Product's server-computed
   * `startingPrice` at the moment this customization was entered (see `validateSellableSelection`
   * in Shop.tsx/Generator.tsx) — never a template/hardcoded fallback. Null when no sellable
   * product+variant was resolved (e.g. a template-only preview) — purchase actions must stay
   * disabled in that case, never show $0.00. Always label this "Starting estimate" in the UI;
   * the authoritative price is computed server-side when the item is actually added to an
   * authenticated cart. */
  startingPrice: number | null;
  sizes: string[];
  colours: string[];
  basePlacement: PlacementOverride | null;
  textElements?: TextElement[];
  partsConfig?: Record<string, PartCustomization>;
  designProjectId?: number;
  productId?: number;
  selectedVariantId?: number;
}

export interface GeneratedArtwork {
  id: string;
  sourceArtworkId?: number;
  userPrompt: string;
  imageUrl: string;
  createdAt: string;
  categorySuggestion: string;
  availableProducts: AvailableMockupProduct[];
}

export interface MockupTemplatePart {
  id: number;
  name: string;
  baseImage: string | null;
  maskImage: string | null;
  shadowLayer: string | null;
  highlightLayer: string | null;
  config: Record<string, unknown>;
  /** Required print resolution (pixels per inch) for this print area. */
  dpi: number;
  /** Safe area as {left, top, width, height} percentages within the print area — content
   * outside this zone risks being trimmed. Null when not configured on the template. */
  safeArea: { left: number; top: number; width: number; height: number } | null;
  /** Bleed as {top, right, bottom, left} in pixels beyond the print-area edge. Null when not
   * configured on the template. */
  bleedArea: { top: number; right: number; bottom: number; left: number } | null;
  /** Required print-file pixel dimensions at `dpi`. Null when not configured. */
  printFileWidth: number | null;
  printFileHeight: number | null;
}

export interface MockupTemplate {
  id: number;
  name: string;
  slug: string;
  productType: string;
  productTypeDisplay: string;
  description: string;
  isActive: boolean;
  baseImage: string | null;
  maskImage: string | null;
  shadowLayer: string | null;
  highlightLayer: string | null;
  templateVersion: number;
  config: Record<string, unknown>;
  supportedColors: string[];
  supportedSizes: string[];
  canvasWidth?: number | null;
  canvasHeight?: number | null;
  supportedFileFormats?: string[];
  parts?: MockupTemplatePart[];
  // Deliberately no `variants` here — the backend no longer embeds every variant on the
  // template (payload-size fix). Fetch variants for a specific product/template via
  // getProductVariants({ productId, templateId }) instead.
  updatedAt: string;
}

export interface MockupRender {
  id: number;
  template: MockupTemplate;
  generatedImage: number | null;
  artwork: number | null;
  sourceImageUrl: string;
  sourcePrompt: string;
  variantColor: string;
  variantSize: string;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  cacheKey: string;
  placementOverride?: PlacementOverride | null;
  cropOverride?: CropOverride | null;
  textElements?: TextElement[] | null;
  outputImage: string | null;
  outputImageUrl: string;
  processingNotes: Record<string, unknown>;
  errorMessage: string;
  renderStartedAt: string | null;
  renderCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  id: string;
  generatedArtworkId: string;
  sourceArtworkId?: number;
  productType: string;
  mockupImageUrl: string;
  selectedSize: string;
  selectedColour: string;
  quantity: number;
  /** Guest mode: a provisional estimate only — sourced from the matched Product's server-computed
   * `startingPrice` at add-time (see `validateSellableSelection`), never a template/hardcoded
   * value, and never presented as final (see `computeGuestCartTotals`'s "Not a final price"
   * disclaimer on CartPage.tsx). Authenticated mode: display-only, mapped straight from the
   * backend's own `unit_price` — the backend is what actually charges, this is never sent back
   * as an authoritative price. */
  price: number;
  templateId?: number;
  backendRenderId?: number;
  placementOverride?: PlacementOverride;
  cropOverride?: CropOverride;
  textElements?: TextElement[];
  printProviderProductId?: string;
  printProviderVariantId?: string;
  userPrompt?: string;
  originalImageUrl?: string;
  partsConfig?: Record<string, PartCustomization>;
  designProjectId?: number;
  /** Set when this (guest-mode) item was added from a real, validated `SellableSelection` — as
   * opposed to a synthetic/recommendation item that never went through
   * `validateSellableSelection`. Used at merge-into-account time to resolve the exact variant
   * directly instead of falling back to fuzzy colour/size text matching (see `findMatchingVariant`
   * in `lib/cartMerge.ts`). Guest-only bookkeeping — an authenticated cart item is always
   * resolved server-side from its `designProjectId`, never from these. */
  productId?: number;
  variantId?: number;
  /** The backend CartItem's own primary key — only set once this item has been persisted to
   * the real backend cart (i.e. the user is signed in and this item has synced/merged). Guest
   * (localStorage-only) items never have this. Needed because `id` above is a client-generated
   * string used for both guest and backend-mode React keys/dedup, while removeFromCart/
   * updateCartQuantity need the real numeric backend id to call the cart API. */
  backendCartItemId?: number;
  /** Server-side pricing/availability warnings for this specific item (e.g. no production cost
   * configured, or the variant is no longer available) — see `apps.cart.pricing.price_item()`'s
   * warnings on the backend. Empty/undefined means no known issue. Guest (localStorage-only)
   * items never have this — there's no server-side pricing to validate against. A non-empty
   * list means this item is not checkout-ready; see `computeCartReadiness` in
   * `lib/cartReadiness.ts`. */
  warnings?: string[];
}

/** Server-computed cart totals (TODO.md item 27's pricing engine output) — always trust these
 * over any client-side math. Guest (not-signed-in) carts get an unvalidated ESTIMATE computed
 * the same way locally (see `computeGuestCartTotals` in `lib/cartPricing.ts`), never a real
 * server total, since guest carts are never persisted to the backend. */
export interface CartTotals {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  shippingAmount: number;
  total: number;
  currency: string;
}

// --- Saved design projects (backend-persisted customizations) ---

export type DesignProjectStatus = 'draft' | 'ready' | 'archived';

export interface ProductVariant {
  id: number;
  /** Always numeric — `ProductVariant.product` is a required FK on the backend, never null.
   * If a response is ever missing this, api.ts's mapping fails clearly rather than silently
   * coercing it to 0 or dropping the variant into an orphan-like state — see mapProductVariant. */
  productId: number;
  templateId: number;
  sku: string;
  name: string;
  colorName: string;
  colorHex: string;
  size: string;
  /** Admin reference/display price only — NOT what the cart charges. See `Product.startingPrice`
   * / the cart's server-computed `unit_price` for actual pricing; never use this field to
   * display or compute a charge. */
  price: string | null;
  baseCost?: string | null;
  /** Known physical stock quantity where supplied. Null means genuinely unknown stock (e.g. a
   * print-on-demand variant) — never treat null as zero/out-of-stock; `isSellable` (not this
   * field, and not `isAvailable` alone) is the actual purchasability signal. */
  inventory: number | null;
  /** Provider/catalogue availability only (can Printify/the admin supply this colour+size at
   * all) — NOT the same as purchasable. A variant can be `isAvailable: true` and still not be
   * `isSellable` (e.g. missing production cost). Never infer sellability from this field alone —
   * use `isSellable` (and `validateSellableSelection` for a full product+variant check). */
  isAvailable: boolean;
  /** Full commercial readiness — available AND priced AND matched to the product's template AND
   * validly provider-mapped where a provider is claimed. The one field to check before allowing
   * a purchase action; mirrors the backend's `apps.shop.services.variant_is_sellable`. */
  isSellable: boolean;
  /** Narrower than `isSellable` — specifically whether a production cost (`baseCost`) is
   * configured. Lets the UI show a distinct "Pricing not configured" reason instead of a generic
   * "unavailable" when that's specifically what's missing. Absent (not just false) is treated as
   * NOT ready — see mapProductVariant's conservative fallback. */
  pricingReady?: boolean;
  supportedPrintAreas: string[];
  externalProvider?: string;
  externalVariantId?: string;
  image?: string | null;
  updatedAt?: string;
}

export interface DesignProjectProductSummary {
  id: number;
  name: string;
  slug: string;
  mockupTemplate: number | null;
}

export interface DesignProjectTemplateSummary {
  id: number;
  name: string;
  productType: string;
}

export interface DesignPlacement {
  id?: number;
  partName: string;
  templatePartId?: number | null;
  sourceArtworkId?: number | null;
  sourceGeneratedImageId?: number | null;
  sourceAssetId?: number | null;
  sourceImageUrl?: string;
  sourcePrompt?: string;
  placementOverride: PlacementOverride;
  cropOverride: CropOverride;
  textElements: TextElement[];
  previewRenderId?: number | null;
  previewUrl?: string;
  printFileUrl?: string;
  metadata?: Record<string, unknown>;
}

/** Lightweight summary shape returned by the design-projects list endpoint (no nested placements). */
export interface DesignProjectSummary {
  id: number;
  name: string;
  status: DesignProjectStatus;
  product: DesignProjectProductSummary | null;
  template: DesignProjectTemplateSummary;
  selectedVariant: ProductVariant | null;
  selectedColor: string;
  selectedSize: string;
  thumbnailUrl: string | null;
  /** The one authoritative thumbnail to render — already resolved server-side through the full
   * fallback chain (uploaded thumbnail -> thumbnailUrl -> front preview -> any preview ->
   * template image -> empty). Use this directly; don't re-derive a fallback client-side. */
  displayThumbnailUrl: string;
  placementCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Full detail shape returned by the design-project detail endpoint (and after create/update). */
export interface DesignProject {
  id: number;
  name: string;
  status: DesignProjectStatus;
  product: DesignProjectProductSummary | null;
  mockupTemplate: MockupTemplate;
  selectedVariant: ProductVariant | null;
  selectedColor: string;
  selectedSize: string;
  sourceArtworkId?: number | null;
  sourceGeneratedImageId?: number | null;
  sourceImageUrl?: string;
  sourcePrompt?: string;
  thumbnail: string | null;
  thumbnailUrl: string | null;
  metadata: Record<string, unknown>;
  placements: DesignPlacement[];
  createdAt: string;
  updatedAt: string;
}

/** Status of one part's production print-file generation attempt. Deliberately a distinct type
 * from any mockup-preview status — a print file is the transparent-background, production-
 * resolution artwork+text-only asset a paid order would need, never the on-screen preview
 * render, so the two must never be labelled with the same status value in the UI. */
export interface PrintFileResult {
  partName: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  printFileUrl?: string | null;
  width?: number | null;
  height?: number | null;
  dpi?: number | null;
  /** True when this result reused an already-generated file because nothing printable had
   * changed since the last generation, rather than rendering a fresh one. */
  reused?: boolean;
  error?: string | null;
}

/** Response shape from both the generate and status print-file endpoints. */
export interface PrintFileBatchResult {
  projectId: number;
  status: 'completed' | 'failed';
  parts: PrintFileResult[];
}
