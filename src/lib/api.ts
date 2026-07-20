import type {
  Artwork,
  ArtworkSearchParams,
  CartItem,
  CartTotals,
  CollectionSummary,
  CropOverride,
  DesignPlacement,
  DesignProject,
  DesignProjectProductSummary,
  DesignProjectStatus,
  DesignProjectSummary,
  DesignProjectTemplateSummary,
  MockupRender,
  MockupTemplate,
  MockupTemplatePart,
  PaginatedArtworks,
  PaginatedProducts,
  PlacementOverride,
  PrintFileBatchResult,
  PrintFileResult,
  Product,
  ProductSearchParams,
  ProductVariant,
  SourceDesignAsset,
  TextElement,
  VideoClip,
} from "../types.ts";

/** Envelope shape shared by every paginated list endpoint — see
 * apps.shop.pagination.StandardResultsSetPagination on the backend. */
interface BackendPaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  page: number;
  page_size: number;
  total_pages: number;
  results: T[];
}

function mapPaginationMeta<T>(response: BackendPaginatedResponse<T>) {
  return {
    count: response.count,
    page: response.page,
    pageSize: response.page_size,
    totalPages: response.total_pages,
    next: response.next,
    previous: response.previous,
  };
}

interface BackendCategory {
  id: number;
  name: string;
  slug: string;
}

interface BackendCollection {
  id: number;
  name: string;
  slug: string;
  description: string;
}

interface BackendArtwork {
  id: number;
  title: string;
  slug: string;
  category: BackendCategory;
  collection: BackendCollection | null;
  description: string;
  image: string | null;
  thumbnail: string | null;
  image_url: string;
  is_featured: boolean;
  created_at: string;
}

interface BackendVideoClip {
  id: number;
  title: string;
  slug: string;
  thumbnail_url: string;
  video_url: string;
  created_at: string;
}

interface BackendProduct {
  id: number;
  name: string;
  slug: string;
  category: BackendCategory;
  description: string;
  starting_price: string | null;
  is_available: boolean;
  available_variant_count: number;
  total_variant_count: number;
  image: string | null;
  thumbnail: string | null;
  image_url: string;
  is_active: boolean;
  mockup_template_id: number | null;
  variants: BackendProductVariant[];
  available_sizes: string[];
  available_colors: string[];
}

interface BackendSourceDesignAsset {
  id: number;
  source_type: "user_upload" | "ai_generated" | "gallery";
  file_url: string | null;
  thumbnail_url: string | null;
  width: number | null;
  height: number | null;
  has_transparency: boolean;
  created_at: string;
}

function mapSourceDesignAsset(asset: BackendSourceDesignAsset): SourceDesignAsset {
  return {
    id: asset.id,
    sourceType: asset.source_type,
    fileUrl: resolveAssetUrl(asset.file_url) || null,
    thumbnailUrl: resolveAssetUrl(asset.thumbnail_url) || null,
    width: asset.width,
    height: asset.height,
    hasTransparency: asset.has_transparency,
    createdAt: asset.created_at,
  };
}

interface BackendMockupTemplatePart {
  id: number;
  name: string;
  base_image: string | null;
  mask_image: string | null;
  displacement_map: string | null;
  shadow_layer: string | null;
  highlight_layer: string | null;
  config: Record<string, unknown>;
  dpi: number;
  safe_area: { left: number; top: number; width: number; height: number } | Record<string, never>;
  bleed_area: { top: number; right: number; bottom: number; left: number } | Record<string, never>;
  print_file_width: number | null;
  print_file_height: number | null;
}

interface BackendProductVariant {
  id: number;
  // Always numeric — ProductVariant.product is a required FK on the backend. Typed as
  // `number | null` anyway (rather than just `number`) because this is untrusted wire data: a
  // malformed/legacy response could still send null, and mapProductVariant()'s job is to catch
  // that explicitly rather than let TypeScript's static type paper over a real runtime check.
  product_id: number | null;
  template_id: number;
  sku: string;
  name: string;
  color_name: string;
  color_hex: string;
  size: string;
  price: string | null;
  base_cost: string | null;
  inventory: number | null;
  is_available: boolean;
  is_sellable: boolean;
  pricing_ready: boolean;
  supported_print_areas: string[];
  external_provider: string;
  external_variant_id: string;
  image: string | null;
  updated_at: string;
}

interface BackendMockupTemplate {
  id: number;
  name: string;
  slug: string;
  product_type: string;
  product_type_display: string;
  description: string;
  is_active: boolean;
  base_image: string | null;
  mask_image: string | null;
  shadow_layer: string | null;
  highlight_layer: string | null;
  template_version: number;
  config: Record<string, unknown>;
  supported_colors: string[];
  supported_sizes: string[];
  canvas_width: number | null;
  canvas_height: number | null;
  supported_file_formats: string[];
  parts?: BackendMockupTemplatePart[];
  // No `variants` here on purpose — see MockupTemplateSerializer's docstring on the backend.
  updated_at: string;
}

interface BackendMockupRender {
  id: number;
  template: BackendMockupTemplate;
  generated_image: number | null;
  artwork: number | null;
  source_image_url: string;
  source_prompt: string;
  variant_color: string;
  variant_size: string;
  placement_override?: PlacementOverride | null;
  crop_override?: {
    left?: number;
    top?: number;
    width?: number;
    height?: number;
  } | null;
  text_elements?: any[] | null;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  cache_key: string;
  output_image: string | null;
  output_image_url: string;
  processing_notes: Record<string, unknown>;
  error_message: string;
  render_started_at: string | null;
  render_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface MaintenanceStatusResponse {
  maintenance_mode: boolean;
  access_granted: boolean;
  maintenance_message?: string;
}

interface MaintenanceAccessResponse extends MaintenanceStatusResponse {
  token?: string;
  detail?: string;
}

export interface BackendAuthenticatedUser {
  id: number;
  username: string;
  email: string;
  display_name: string;
  avatar: string;
  is_artist: boolean;
}

interface GoogleLoginResponse {
  access: string;
  refresh: string;
  user: BackendAuthenticatedUser;
}

interface BackendFavorite {
  id: number;
  artwork: BackendArtwork;
  created_at: string;
}

interface MockupRenderMutationResponse {
  created: boolean;
  render: BackendMockupRender;
  message: string;
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:8000/api";
const ACCESS_TOKEN_STORAGE_KEY = "artverse_backend_access_token";
const REFRESH_TOKEN_STORAGE_KEY = "artverse_backend_refresh_token";

export class ApiError extends Error {
  status: number;
  fieldErrors: Record<string, unknown>;

  constructor(message: string, status: number, fieldErrors: Record<string, unknown> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

function formatFieldErrors(data: Record<string, unknown>): string {
  const parts: string[] = [];

  const describe = (field: string, value: unknown) => {
    const messages = Array.isArray(value) ? value : [value];
    for (const message of messages) {
      if (typeof message === "string") {
        parts.push(field === "non_field_errors" ? message : `${field}: ${message}`);
      } else if (message && typeof message === "object") {
        for (const [nestedField, nestedMessage] of Object.entries(message as Record<string, unknown>)) {
          describe(`${field}.${nestedField}`, nestedMessage);
        }
      }
    }
  };

  for (const [field, value] of Object.entries(data)) {
    if (field === "detail") continue;
    describe(field, value);
  }

  return parts.join(" ");
}

function getApiOrigin() {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return window.location.origin;
  }
}

function resolveAssetUrl(url: string | null | undefined) {
  if (!url) {
    return "";
  }

  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }

  return new URL(url, getApiOrigin()).toString();
}

export function getBackendAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
}

function getBackendRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
}

export function setBackendAuthTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
}

export function clearBackendAuthTokens() {
  localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
}

async function refreshBackendAccessToken() {
  const refreshToken = getBackendRefreshToken();
  if (!refreshToken) {
    return null;
  }

  const response = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh: refreshToken }),
  });

  if (!response.ok) {
    clearBackendAuthTokens();
    return null;
  }

  const data = (await response.json()) as { access?: string };
  if (!data.access) {
    clearBackendAuthTokens();
    return null;
  }

  setBackendAuthTokens(data.access, refreshToken);
  return data.access;
}

async function requestJson<T>(path: string, init?: RequestInit, retryOn401 = true): Promise<T> {
  const headers = new Headers(init?.headers);
  // A FormData body (file uploads) must NOT get a manually-set Content-Type — fetch/the browser
  // sets `multipart/form-data; boundary=...` automatically, and a boundary-less
  // `application/json` override here would make the server unable to parse the multipart body.
  if (!headers.has("Content-Type") && init?.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const accessToken = getBackendAccessToken();
  if (accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
    });
  } catch {
    throw new ApiError("Network error — could not reach the server. Check your connection and try again.", 0);
  }
  const data = (await response.json().catch(() => ({}))) as T & { detail?: string };

  if (response.status === 401 && retryOn401 && getBackendRefreshToken()) {
    const nextAccessToken = await refreshBackendAccessToken();
    if (nextAccessToken) {
      const retryHeaders = new Headers(init?.headers);
      if (!retryHeaders.has("Content-Type") && init?.body && !(init.body instanceof FormData)) {
        retryHeaders.set("Content-Type", "application/json");
      }
      retryHeaders.set("Authorization", `Bearer ${nextAccessToken}`);
      return requestJson<T>(
        path,
        {
          ...init,
          headers: retryHeaders,
        },
        false,
      );
    }
  }

  if (!response.ok) {
    const message =
      data.detail ||
      formatFieldErrors(data as unknown as Record<string, unknown>) ||
      (response.status === 401
        ? "Your session has expired. Please sign in again."
        : response.status === 403
          ? "You don't have permission to do that."
          : response.status === 404
            ? "That item could not be found."
            : `Request failed with status ${response.status}`);
    throw new ApiError(message, response.status, data as unknown as Record<string, unknown>);
  }

  return data as T;
}

async function fetchJson<T>(path: string): Promise<T> {
  return requestJson<T>(path);
}

async function sendJson<T>(path: string, init?: RequestInit): Promise<T> {
  return requestJson<T>(path, init);
}

function mapArtwork(artwork: BackendArtwork): Artwork {
  const imageUrl = resolveAssetUrl(artwork.image) || artwork.image_url;
  const thumbnailUrl = resolveAssetUrl(artwork.thumbnail) || imageUrl;
  return {
    id: String(artwork.id),
    backendArtworkId: artwork.id,
    title: artwork.title,
    category: artwork.category.name,
    collectionName: artwork.collection?.name,
    collectionSlug: artwork.collection?.slug,
    description: artwork.description,
    tags: [],
    suitableProducts: ['Wallpaper', 'Canvas', 'Poster', 'Digital Download'],
    imageUrl,
    thumbnailUrl,
    wallpaperDownloadUrl: imageUrl,
    printProductUrl: '/shop',
    price: artwork.is_featured ? '$49.99' : '$29.99',
    isFeatured: artwork.is_featured,
    isPremium: artwork.is_featured,
    createdAt: artwork.created_at,
  };
}

function mapCollection(collection: BackendCollection): CollectionSummary {
  return {
    id: String(collection.id),
    name: collection.name,
    slug: collection.slug,
    description: collection.description,
  };
}

function mapVideoClip(video: BackendVideoClip): VideoClip {
  return {
    id: String(video.id),
    title: video.title,
    thumbnailUrl: resolveAssetUrl(video.thumbnail_url),
    videoUrl: resolveAssetUrl(video.video_url),
  };
}

function mapProduct(product: BackendProduct): Product {
  const imageUrl = resolveAssetUrl(product.image) || product.image_url;
  const thumbnailUrl = resolveAssetUrl(product.thumbnail) || imageUrl;
  return {
    id: String(product.id),
    name: product.name,
    category: product.category.name,
    startingPrice: product.starting_price,
    isAvailable: product.is_available,
    availableVariantCount: product.available_variant_count,
    totalVariantCount: product.total_variant_count,
    imageUrl,
    thumbnailUrl,
    description: product.description,
    mockupTemplateId: product.mockup_template_id,
    variants: (product.variants || [])
      .map(mapProductVariant)
      .filter((variant): variant is ProductVariant => variant !== null),
    availableSizes: product.available_sizes,
    availableColors: product.available_colors,
  };
}

function mapMockupTemplatePart(part: BackendMockupTemplatePart): MockupTemplatePart {
  return {
    id: part.id,
    name: part.name,
    baseImage: resolveAssetUrl(part.base_image),
    maskImage: resolveAssetUrl(part.mask_image),
    shadowLayer: resolveAssetUrl(part.shadow_layer),
    highlightLayer: resolveAssetUrl(part.highlight_layer),
    config: part.config,
    dpi: part.dpi,
    safeArea:
      part.safe_area && 'left' in part.safe_area
        ? {
            left: part.safe_area.left,
            top: part.safe_area.top,
            width: part.safe_area.width,
            height: part.safe_area.height,
          }
        : null,
    bleedArea:
      part.bleed_area && 'top' in part.bleed_area
        ? {
            top: part.bleed_area.top,
            right: part.bleed_area.right,
            bottom: part.bleed_area.bottom,
            left: part.bleed_area.left,
          }
        : null,
    printFileWidth: part.print_file_width,
    printFileHeight: part.print_file_height,
  };
}

/** ProductVariant.product is a required FK on the backend — a response with no product_id is a
 * malformed/unexpected payload, not a valid "orphan" variant. Fails clearly (returns null,
 * logs a warning) instead of silently coercing it to 0 and letting an unpurchasable, ownerless
 * variant slip into customer-facing selection. Every call site below excludes nulls from
 * customer-facing lists rather than trying to render them. */
export function mapProductVariant(variant: BackendProductVariant): ProductVariant | null {
  if (variant.product_id === null || variant.product_id === undefined) {
    console.warn(`ProductVariant ${variant.id} has no product_id — excluding it from selection.`);
    return null;
  }

  return {
    id: variant.id,
    productId: variant.product_id,
    templateId: variant.template_id,
    sku: variant.sku,
    name: variant.name,
    colorName: variant.color_name,
    colorHex: variant.color_hex,
    size: variant.size,
    price: variant.price,
    baseCost: variant.base_cost,
    inventory: variant.inventory,
    isAvailable: variant.is_available,
    // Absent (not just false) is treated as NOT sellable — a conservative fallback so an older
    // backend/cached response missing this field never accidentally enables a purchase action.
    isSellable: variant.is_sellable === true,
    pricingReady: variant.pricing_ready,
    supportedPrintAreas: variant.supported_print_areas,
    externalProvider: variant.external_provider,
    externalVariantId: variant.external_variant_id,
    image: resolveAssetUrl(variant.image) || null,
    updatedAt: variant.updated_at,
  };
}

function mapMockupTemplate(template: BackendMockupTemplate): MockupTemplate {
  return {
    id: template.id,
    name: template.name,
    slug: template.slug,
    productType: template.product_type,
    productTypeDisplay: template.product_type_display,
    description: template.description,
    isActive: template.is_active,
    baseImage: resolveAssetUrl(template.base_image),
    maskImage: resolveAssetUrl(template.mask_image),
    shadowLayer: resolveAssetUrl(template.shadow_layer),
    highlightLayer: resolveAssetUrl(template.highlight_layer),
    templateVersion: template.template_version,
    config: template.config,
    supportedColors: template.supported_colors,
    supportedSizes: template.supported_sizes,
    canvasWidth: template.canvas_width,
    canvasHeight: template.canvas_height,
    supportedFileFormats: template.supported_file_formats,
    parts: (template.parts || []).map(mapMockupTemplatePart),
    updatedAt: template.updated_at,
  };
}

function mapMockupRender(render: BackendMockupRender): MockupRender {
  const rawPlacement = render.placement_override as
    | (PlacementOverride & { corner_radius?: number; cornerRadius?: number })
    | null
    | undefined;
  const placementOverride: PlacementOverride | null = render.placement_override
    ? {
        ...render.placement_override,
        cornerRadius: Number(rawPlacement?.corner_radius ?? rawPlacement?.cornerRadius ?? 0),
      }
    : null;

  const cropOverride: CropOverride | null = render.crop_override
    ? {
        left: Number(render.crop_override.left ?? 0),
        top: Number(render.crop_override.top ?? 0),
        width: Number(render.crop_override.width ?? 100),
        height: Number(render.crop_override.height ?? 100),
      }
    : null;

  const textElements: TextElement[] | null = render.text_elements
    ? render.text_elements.map((t: any) => ({
        id: String(t.id),
        text: String(t.text),
        fontFamily: String(t.fontFamily),
        color: String(t.color),
        fontSize: Number(t.fontSize),
        x: Number(t.x),
        y: Number(t.y),
        rotation: Number(t.rotation || 0),
      }))
    : null;

  return {
    id: render.id,
    template: mapMockupTemplate(render.template),
    generatedImage: render.generated_image,
    artwork: render.artwork,
    sourceImageUrl: render.source_image_url,
    sourcePrompt: render.source_prompt,
    variantColor: render.variant_color,
    variantSize: render.variant_size,
    placementOverride,
    cropOverride,
    textElements,
    status: render.status,
    cacheKey: render.cache_key,
    outputImage: resolveAssetUrl(render.output_image),
    outputImageUrl: resolveAssetUrl(render.output_image_url),
    processingNotes: render.processing_notes,
    errorMessage: render.error_message,
    renderStartedAt: render.render_started_at,
    renderCompletedAt: render.render_completed_at,
    createdAt: render.created_at,
    updatedAt: render.updated_at,
  };
}

export async function getGalleryCategories() {
  const categories = await fetchJson<BackendCategory[]>("/gallery/categories/");
  return ["All", ...categories.map((category) => category.name)];
}

export async function getCollections() {
  const collections = await fetchJson<BackendCollection[]>("/gallery/collections/");
  return collections.map(mapCollection);
}

// /gallery/artworks/ and /shop/products/ are paginated (see BackendPaginatedResponse) — these
// two simple helpers request a large page_size and flatten `.results`, for the many existing
// callers (Home.tsx, Favorites.tsx, CollectionDetail.tsx, Generator.tsx, etc.) that just want
// "give me everything," not a specific page. The Shop catalogue page and the customization
// editor's gallery selector use getProductsPage()/getArtworksPage() (below) instead, for real
// pagination.
export async function getArtworks(options?: { collectionSlug?: string }) {
  const params = new URLSearchParams({ page_size: "100" });
  if (options?.collectionSlug) params.set("collection", options.collectionSlug);
  const response = await fetchJson<BackendPaginatedResponse<BackendArtwork>>(`/gallery/artworks/?${params.toString()}`);
  return response.results.map(mapArtwork);
}

export async function getFeaturedArtworks() {
  const response = await fetchJson<BackendPaginatedResponse<BackendArtwork>>(
    "/gallery/artworks/?featured=true&page_size=100"
  );
  return response.results.map(mapArtwork);
}

/** Paginated gallery listing for the customization editor's "Choose from Gallery" selector —
 * never fetches the whole catalogue at once. */
export async function getArtworksPage(params: ArtworkSearchParams = {}): Promise<PaginatedArtworks> {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("page_size", String(params.pageSize));
  if (params.search) search.set("search", params.search);
  if (params.category) search.set("category", params.category);
  if (params.ordering) search.set("ordering", params.ordering);
  const query = search.toString();
  const response = await fetchJson<BackendPaginatedResponse<BackendArtwork>>(
    `/gallery/artworks/${query ? `?${query}` : ""}`
  );
  return { ...mapPaginationMeta(response), results: response.results.map(mapArtwork) };
}

export async function getFavorites() {
  const favorites = await fetchJson<BackendFavorite[]>("/gallery/favorites/");
  return favorites.map((favorite) => ({
    id: String(favorite.id),
    artwork: mapArtwork(favorite.artwork),
    createdAt: favorite.created_at,
  }));
}

export async function toggleFavoriteBackend(artworkId: number) {
  return sendJson<{ favorited: boolean }>("/gallery/favorites/toggle/", {
    method: "POST",
    body: JSON.stringify({ artwork_id: artworkId }),
  });
}

export async function getVideos() {
  const videos = await fetchJson<BackendVideoClip[]>("/gallery/videos/");
  return videos.map(mapVideoClip);
}

export async function getProductCategories() {
  const categories = await fetchJson<BackendCategory[]>("/shop/categories/");
  return ["All", ...categories.map((category) => category.name)];
}

/** Full category objects (id/name/slug) — the Shop catalogue's category filter needs the slug
 * (what `?category=` on the product list actually filters by; `getProductCategories()` above
 * discards it and returns display names only, fine for its own callers but not usable here). */
export async function getShopCategories(): Promise<CollectionSummary[]> {
  const categories = await fetchJson<BackendCategory[]>("/shop/categories/");
  return categories.map((category) => ({ id: String(category.id), name: category.name, slug: category.slug }));
}

export async function getProducts() {
  const response = await fetchJson<BackendPaginatedResponse<BackendProduct>>("/shop/products/?page_size=100");
  return response.results.map(mapProduct);
}

/** Paginated, searchable/filterable/sortable product catalogue — used by the Shop page. */
export async function getProductsPage(params: ProductSearchParams = {}): Promise<PaginatedProducts> {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("page_size", String(params.pageSize));
  if (params.search) search.set("search", params.search);
  if (params.category) search.set("category", params.category);
  if (params.productType) search.set("product_type", params.productType);
  if (params.ordering) search.set("ordering", params.ordering);
  const query = search.toString();
  const response = await fetchJson<BackendPaginatedResponse<BackendProduct>>(
    `/shop/products/${query ? `?${query}` : ""}`
  );
  return { ...mapPaginationMeta(response), results: response.results.map(mapProduct) };
}

/** POST /api/generator/design-assets/upload/ — the shared entry point for a device file upload
 * ("Upload Design") and persisting a client-generated AI image ("Generate with AI") as a
 * private SourceDesignAsset. `file` may be any browser File/Blob (a canvas-generated AI result
 * is converted to a File by the caller first — see lib/aiGeneration.ts). */
export async function uploadDesignAsset(
  file: File | Blob,
  sourceType: "user_upload" | "ai_generated" = "user_upload",
  title?: string
): Promise<SourceDesignAsset> {
  const formData = new FormData();
  formData.append("file", file, file instanceof File ? file.name : "upload.png");
  formData.append("source_type", sourceType);
  if (title) {
    formData.append("title", title);
  }

  const response = await requestJson<BackendSourceDesignAsset>("/generator/design-assets/upload/", {
    method: "POST",
    body: formData,
  });
  return mapSourceDesignAsset(response);
}

export async function getMockupTemplates(productType?: string) {
  const search = productType ? `?product_type=${encodeURIComponent(productType)}` : "";
  const templates = await fetchJson<BackendMockupTemplate[]>(`/generator/mockup-templates/${search}`);
  return templates.map(mapMockupTemplate);
}

export async function getProductVariants(filter: { productId?: number; templateId?: number } = {}) {
  const params = new URLSearchParams();
  if (filter.productId !== undefined) params.set("product_id", String(filter.productId));
  if (filter.templateId !== undefined) params.set("template_id", String(filter.templateId));
  const search = params.toString() ? `?${params.toString()}` : "";
  const variants = await fetchJson<BackendProductVariant[]>(`/generator/product-variants/${search}`);
  return variants.map(mapProductVariant).filter((variant): variant is ProductVariant => variant !== null);
}

export async function createMockupRender(input: {
  generatedImageId?: number;
  artworkId?: number;
  sourceImageUrl?: string;
  sourcePrompt?: string;
  templateId: number;
  variantColor?: string;
  variantSize?: string;
  placementOverride?: PlacementOverride;
  cropOverride?: CropOverride;
  textElements?: TextElement[];
  partName?: string;
}) {
  const placementOverride = input.placementOverride
    ? {
        x: input.placementOverride.x,
        y: input.placementOverride.y,
        width: input.placementOverride.width,
        height: input.placementOverride.height,
        corner_radius: input.placementOverride.cornerRadius,
        fit: input.placementOverride.fit,
        rotation: input.placementOverride.rotation,
        opacity: input.placementOverride.opacity,
      }
    : undefined;

  const response = await sendJson<MockupRenderMutationResponse>("/generator/mockup-renders/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      generated_image_id: input.generatedImageId,
      artwork_id: input.artworkId,
      source_image_url: input.sourceImageUrl,
      source_prompt: input.sourcePrompt,
      template_id: input.templateId,
      variant_color: input.variantColor,
      variant_size: input.variantSize,
      part_name: input.partName,
      placement_override: placementOverride,
      crop_override: input.cropOverride
        ? {
            left: input.cropOverride.left,
            top: input.cropOverride.top,
            width: input.cropOverride.width,
            height: input.cropOverride.height,
          }
        : undefined,
      text_elements: input.textElements,
    }),
  });

  return {
    created: response.created,
    message: response.message,
    render: mapMockupRender(response.render),
  };
}

export async function getMockupRender(id: number) {
  const response = await fetchJson<BackendMockupRender>(`/generator/mockup-renders/${id}/`);
  return mapMockupRender(response);
}

export async function getMaintenanceStatus(token?: string) {
  return sendJson<MaintenanceStatusResponse>("/auth/maintenance-status/", {
    cache: "no-store",
    headers: token ? { "X-Maintenance-Token": token } : undefined,
  });
}

export async function requestMaintenanceAccess(accessKey: string) {
  return sendJson<MaintenanceAccessResponse>("/auth/maintenance-access/", {
    method: "POST",
    body: JSON.stringify({ access_key: accessKey }),
  });
}

export async function loginWithGoogleBackend(idToken: string) {
  return sendJson<GoogleLoginResponse>("/auth/google-login/", {
    method: "POST",
    body: JSON.stringify({ id_token: idToken }),
  });
}

// --- Saved design projects ---

interface BackendDesignPlacement {
  id: number;
  part_name: string;
  template_part_id: number | null;
  source_artwork_id: number | null;
  source_generated_image_id: number | null;
  source_asset_id: number | null;
  source_image_url: string;
  source_prompt: string;
  placement_override: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    opacity: number;
    corner_radius: number;
    fit: string;
  };
  crop_override: { left: number; top: number; width: number; height: number };
  text_elements: Array<Record<string, unknown>>;
  preview_render_id: number | null;
  preview_url: string;
  print_file_url: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface BackendDesignProjectProductSummary {
  id: number;
  name: string;
  slug: string;
  mockup_template: number | null;
}

interface BackendDesignProjectTemplateSummary {
  id: number;
  name: string;
  product_type: string;
}

interface BackendDesignProjectSummary {
  id: number;
  name: string;
  status: DesignProjectStatus;
  product: BackendDesignProjectProductSummary | null;
  template: BackendDesignProjectTemplateSummary;
  selected_variant: BackendProductVariant | null;
  selected_color: string;
  selected_size: string;
  thumbnail_url: string | null;
  display_thumbnail_url?: string | null;
  placement_count: number;
  created_at: string;
  updated_at: string;
}

interface BackendDesignProject {
  id: number;
  name: string;
  status: DesignProjectStatus;
  product: BackendDesignProjectProductSummary | null;
  mockup_template: BackendMockupTemplate;
  selected_variant: BackendProductVariant | null;
  selected_color: string;
  selected_size: string;
  source_artwork_id: number | null;
  source_generated_image_id: number | null;
  source_image_url: string;
  source_prompt: string;
  thumbnail: string | null;
  thumbnail_url: string | null;
  metadata: Record<string, unknown>;
  placements: BackendDesignPlacement[];
  created_at: string;
  updated_at: string;
}

function mapDesignPlacement(placement: BackendDesignPlacement): DesignPlacement {
  return {
    id: placement.id,
    partName: placement.part_name,
    templatePartId: placement.template_part_id,
    sourceArtworkId: placement.source_artwork_id,
    sourceGeneratedImageId: placement.source_generated_image_id,
    sourceAssetId: placement.source_asset_id,
    sourceImageUrl: placement.source_image_url,
    sourcePrompt: placement.source_prompt,
    placementOverride: {
      x: placement.placement_override.x,
      y: placement.placement_override.y,
      width: placement.placement_override.width,
      height: placement.placement_override.height,
      rotation: placement.placement_override.rotation,
      opacity: placement.placement_override.opacity,
      cornerRadius: placement.placement_override.corner_radius,
      fit: placement.placement_override.fit,
    },
    cropOverride: {
      left: placement.crop_override.left,
      top: placement.crop_override.top,
      width: placement.crop_override.width,
      height: placement.crop_override.height,
    },
    textElements: (placement.text_elements || []).map((element) => ({
      id: String(element.id ?? `text-${Math.random().toString(36).slice(2)}`),
      text: String(element.text ?? ""),
      fontFamily: String(element.fontFamily ?? "Roboto"),
      color: String(element.color ?? "#ffffff"),
      fontSize: Number(element.fontSize ?? 48),
      x: Number(element.x ?? 0),
      y: Number(element.y ?? 0),
      rotation: Number(element.rotation ?? 0),
      isBold: Boolean(element.isBold),
      isItalic: Boolean(element.isItalic),
      letterSpacing: element.letterSpacing !== undefined ? Number(element.letterSpacing) : undefined,
    })),
    previewRenderId: placement.preview_render_id,
    previewUrl: resolveAssetUrl(placement.preview_url) || placement.preview_url,
    printFileUrl: placement.print_file_url,
    metadata: placement.metadata,
  };
}

function mapDesignProjectProductSummary(
  product: BackendDesignProjectProductSummary | null,
): DesignProjectProductSummary | null {
  if (!product) return null;
  return { id: product.id, name: product.name, slug: product.slug, mockupTemplate: product.mockup_template };
}

function mapDesignProjectSummary(project: BackendDesignProjectSummary): DesignProjectSummary {
  return {
    id: project.id,
    name: project.name,
    status: project.status,
    product: mapDesignProjectProductSummary(project.product),
    template: {
      id: project.template.id,
      name: project.template.name,
      productType: project.template.product_type,
    },
    selectedVariant: project.selected_variant ? mapProductVariant(project.selected_variant) : null,
    selectedColor: project.selected_color,
    selectedSize: project.selected_size,
    thumbnailUrl: project.thumbnail_url ? resolveAssetUrl(project.thumbnail_url) : null,
    // Backend already resolves the full fallback chain into display_thumbnail_url (including
    // thumbnail_url as one of its own fallback levels), so this `?? thumbnail_url` is
    // defense-in-depth only — it protects against a backend that hasn't rolled the field out
    // yet, not a path that should normally trigger.
    displayThumbnailUrl: resolveAssetUrl(project.display_thumbnail_url ?? project.thumbnail_url ?? '') || '',
    placementCount: project.placement_count,
    createdAt: project.created_at,
    updatedAt: project.updated_at,
  };
}

function mapDesignProject(project: BackendDesignProject): DesignProject {
  return {
    id: project.id,
    name: project.name,
    status: project.status,
    product: mapDesignProjectProductSummary(project.product),
    mockupTemplate: mapMockupTemplate(project.mockup_template),
    selectedVariant: project.selected_variant ? mapProductVariant(project.selected_variant) : null,
    selectedColor: project.selected_color,
    selectedSize: project.selected_size,
    sourceArtworkId: project.source_artwork_id,
    sourceGeneratedImageId: project.source_generated_image_id,
    sourceImageUrl: project.source_image_url,
    sourcePrompt: project.source_prompt,
    thumbnail: project.thumbnail ? resolveAssetUrl(project.thumbnail) : null,
    thumbnailUrl: project.thumbnail_url ? resolveAssetUrl(project.thumbnail_url) : null,
    metadata: project.metadata,
    placements: (project.placements || []).map(mapDesignPlacement),
    createdAt: project.created_at,
    updatedAt: project.updated_at,
  };
}

function mapPlacementToBackendPayload(placement: DesignPlacement) {
  return {
    part_name: placement.partName,
    source_artwork_id: placement.sourceArtworkId ?? null,
    source_generated_image_id: placement.sourceGeneratedImageId ?? null,
    source_asset_id: placement.sourceAssetId ?? null,
    source_image_url: placement.sourceImageUrl ?? "",
    source_prompt: placement.sourcePrompt ?? "",
    placement_override: {
      x: placement.placementOverride?.x ?? 0,
      y: placement.placementOverride?.y ?? 0,
      width: placement.placementOverride?.width ?? 0,
      height: placement.placementOverride?.height ?? 0,
      rotation: placement.placementOverride?.rotation ?? 0,
      opacity: placement.placementOverride?.opacity ?? 1,
      corner_radius: placement.placementOverride?.cornerRadius ?? 0,
      fit: placement.placementOverride?.fit ?? "contain",
    },
    crop_override: {
      left: placement.cropOverride?.left ?? 0,
      top: placement.cropOverride?.top ?? 0,
      width: placement.cropOverride?.width ?? 100,
      height: placement.cropOverride?.height ?? 100,
    },
    text_elements: placement.textElements ?? [],
    preview_render_id: placement.previewRenderId ?? null,
    preview_url: placement.previewUrl ?? "",
    print_file_url: placement.printFileUrl ?? "",
    metadata: placement.metadata ?? {},
  };
}

export interface DesignProjectWriteInput {
  name?: string;
  productId?: number | null;
  mockupTemplateId?: number;
  selectedVariantId?: number | null;
  selectedColor?: string;
  selectedSize?: string;
  sourceArtworkId?: number | null;
  sourceGeneratedImageId?: number | null;
  sourceImageUrl?: string;
  sourcePrompt?: string;
  thumbnailUrl?: string;
  metadata?: Record<string, unknown>;
  placements?: DesignPlacement[];
}

function mapDesignProjectWriteInputToBackendPayload(input: DesignProjectWriteInput): Record<string, unknown> {
  // Only include a key when the caller actually supplied it, so a partial (PATCH) update
  // doesn't accidentally overwrite fields the caller didn't mean to touch — the backend
  // distinguishes "key absent" (leave alone) from "key present" (apply), see
  // DesignProjectWriteSerializer.validate() on the backend.
  const payload: Record<string, unknown> = {};
  if (input.name !== undefined) payload.name = input.name;
  if (input.productId !== undefined) payload.product_id = input.productId;
  if (input.mockupTemplateId !== undefined) payload.mockup_template_id = input.mockupTemplateId;
  if (input.selectedVariantId !== undefined) payload.selected_variant_id = input.selectedVariantId;
  if (input.selectedColor !== undefined) payload.selected_color = input.selectedColor;
  if (input.selectedSize !== undefined) payload.selected_size = input.selectedSize;
  if (input.sourceArtworkId !== undefined) payload.source_artwork_id = input.sourceArtworkId;
  if (input.sourceGeneratedImageId !== undefined) payload.source_generated_image_id = input.sourceGeneratedImageId;
  if (input.sourceImageUrl !== undefined) payload.source_image_url = input.sourceImageUrl;
  if (input.sourcePrompt !== undefined) payload.source_prompt = input.sourcePrompt;
  if (input.thumbnailUrl !== undefined) payload.thumbnail_url = input.thumbnailUrl;
  if (input.metadata !== undefined) payload.metadata = input.metadata;
  if (input.placements !== undefined) payload.placements = input.placements.map(mapPlacementToBackendPayload);
  return payload;
}

export interface DesignProjectListParams {
  status?: DesignProjectStatus;
  search?: string;
  product?: number;
  template?: number;
  ordering?: "updated_at" | "-updated_at" | "created_at" | "-created_at" | "name" | "-name";
}

export async function listDesignProjects(params: DesignProjectListParams = {}) {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.search) search.set("search", params.search);
  if (params.product !== undefined) search.set("product", String(params.product));
  if (params.template !== undefined) search.set("template", String(params.template));
  if (params.ordering) search.set("ordering", params.ordering);
  const query = search.toString() ? `?${search.toString()}` : "";
  const projects = await fetchJson<BackendDesignProjectSummary[]>(`/generator/design-projects/${query}`);
  return projects.map(mapDesignProjectSummary);
}

export async function getDesignProject(id: number) {
  const project = await fetchJson<BackendDesignProject>(`/generator/design-projects/${id}/`);
  return mapDesignProject(project);
}

export async function createDesignProject(input: DesignProjectWriteInput) {
  const project = await sendJson<BackendDesignProject>("/generator/design-projects/", {
    method: "POST",
    body: JSON.stringify(mapDesignProjectWriteInputToBackendPayload(input)),
  });
  return mapDesignProject(project);
}

/** Full replace: `input.placements` (and every other field) is treated as the complete,
 * authoritative state — placements for parts omitted from it are deleted. Use this for the
 * main "Save Design" action and before adding to cart, where the caller always has the
 * complete current editor state, never a partial one. */
export async function replaceDesignProject(id: number, input: DesignProjectWriteInput) {
  const project = await sendJson<BackendDesignProject>(`/generator/design-projects/${id}/`, {
    method: "PUT",
    body: JSON.stringify(mapDesignProjectWriteInputToBackendPayload(input)),
  });
  return mapDesignProject(project);
}

/** Partial update: only the fields present in `input` are touched; placements are upserted,
 * never deleted for being omitted. Use this for targeted changes — renaming from Saved
 * Designs, changing just the status, etc. Never pass a full editor-state snapshot here. */
export async function patchDesignProject(id: number, input: DesignProjectWriteInput) {
  const project = await sendJson<BackendDesignProject>(`/generator/design-projects/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(mapDesignProjectWriteInputToBackendPayload(input)),
  });
  return mapDesignProject(project);
}

export async function deleteDesignProject(id: number) {
  await requestJson<Record<string, never>>(`/generator/design-projects/${id}/`, { method: "DELETE" });
}

export async function duplicateDesignProject(id: number) {
  const project = await sendJson<BackendDesignProject>(`/generator/design-projects/${id}/duplicate/`, {
    method: "POST",
  });
  return mapDesignProject(project);
}

interface BackendPrintFileResult {
  part_name: string;
  status: "queued" | "processing" | "completed" | "failed";
  print_file_url: string | null;
  width: number | null;
  height: number | null;
  dpi: number | null;
  reused: boolean;
  error: string | null;
}

interface BackendPrintFileBatchResult {
  project_id: number;
  status: "completed" | "failed";
  parts: BackendPrintFileResult[];
}

function mapPrintFileResult(part: BackendPrintFileResult): PrintFileResult {
  return {
    partName: part.part_name,
    status: part.status,
    printFileUrl: part.print_file_url ? resolveAssetUrl(part.print_file_url) : null,
    width: part.width,
    height: part.height,
    dpi: part.dpi,
    reused: part.reused,
    error: part.error,
  };
}

function mapPrintFileBatchResult(result: BackendPrintFileBatchResult): PrintFileBatchResult {
  return {
    projectId: result.project_id,
    status: result.status,
    parts: result.parts.map(mapPrintFileResult),
  };
}

/** Triggers production print-file generation (or signature-based reuse) for every configured,
 * printable part of a saved design project — never a preview render. This is deliberately a
 * separate, explicit action from normal editing: production files are only generated when the
 * caller asks for them (e.g. a "Generate Print Files" / final-validation action), not on every
 * autosave or preview refresh. Does not create a Printify product or submit anything for
 * fulfilment — that remains out of scope here. */
export async function generatePrintFiles(projectId: number) {
  const result = await sendJson<BackendPrintFileBatchResult>(
    `/generator/design-projects/${projectId}/generate-print-files/`,
    { method: "POST" },
  );
  return mapPrintFileBatchResult(result);
}

/** Read-only status of each configured part's most recent print-file generation attempt,
 * without triggering a new one. */
export async function getPrintFiles(projectId: number) {
  const result = await fetchJson<BackendPrintFileBatchResult>(`/generator/design-projects/${projectId}/print-files/`);
  return mapPrintFileBatchResult(result);
}

// --- Backend-persisted cart (TODO.md items 25-29) ---
//
// Only ever used once a user is signed in — guest carts stay entirely client-side in
// localStorage (see CartContext.tsx) and never call any of these. `unit_price`/the cart totals
// below are always server-computed by apps.cart.pricing; nothing here ever sends a price to
// the backend, only IDs/quantities.

interface BackendCartItemProduct {
  id: number;
  name: string;
  slug: string;
  image_url: string;
}

interface BackendCartItem {
  id: number;
  design_project: BackendDesignProjectSummary;
  product: BackendCartItemProduct;
  variant_id: number | null;
  size: string;
  colour: string;
  quantity: number;
  unit_price: string;
  currency: string;
  preview_image_url: string;
  line_total: string;
  pricing_breakdown: Record<string, unknown>;
  warnings: string[];
  created_at: string;
  updated_at: string;
}

interface BackendCartCoupon {
  code: string;
  discount_type: string;
  amount: string;
}

interface BackendCart {
  id: number;
  currency: string;
  items: BackendCartItem[];
  coupon: BackendCartCoupon | null;
  subtotal: string;
  discount_amount: string;
  tax_amount: string;
  shipping_amount: string;
  total: string;
  is_checkout_ready: boolean;
  updated_at: string;
}

export interface CartCouponSummary {
  code: string;
  discountType: string;
  amount: string;
}

export interface CartApiResult {
  items: CartItem[];
  totals: CartTotals;
  coupon: CartCouponSummary | null;
  /** False whenever any item has a pricing/availability warning (see `CartItem.warnings`) —
   * distinct from whether checkout is actually *implemented* at all (it isn't yet; see
   * `lib/cartReadiness.ts`). This only ever reflects the backend's own validation. */
  isCheckoutReady: boolean;
}

function mapBackendCartItem(item: BackendCartItem): CartItem {
  const projectSummary = mapDesignProjectSummary(item.design_project);
  return {
    id: `backend-${item.id}`,
    backendCartItemId: item.id,
    designProjectId: projectSummary.id,
    // Guest-mode items key upsell/dedup logic off a generated-artwork id; a backend item has no
    // such concept, so the design project's own id doubles as a stable per-item key here.
    generatedArtworkId: String(projectSummary.id),
    productType: item.product.name,
    mockupImageUrl: projectSummary.displayThumbnailUrl || resolveAssetUrl(item.preview_image_url) || item.product.image_url,
    selectedSize: item.size,
    selectedColour: item.colour,
    quantity: item.quantity,
    price: Number(item.unit_price),
    warnings: item.warnings,
  };
}

function mapCart(cart: BackendCart): CartApiResult {
  return {
    items: cart.items.map(mapBackendCartItem),
    totals: {
      subtotal: Number(cart.subtotal),
      discountAmount: Number(cart.discount_amount),
      taxAmount: Number(cart.tax_amount),
      shippingAmount: Number(cart.shipping_amount),
      total: Number(cart.total),
      currency: cart.currency,
    },
    coupon: cart.coupon
      ? { code: cart.coupon.code, discountType: cart.coupon.discount_type, amount: cart.coupon.amount }
      : null,
    isCheckoutReady: cart.is_checkout_ready,
  };
}

export async function getCart() {
  return mapCart(await fetchJson<BackendCart>("/cart/"));
}

export async function addCartItem(input: { designProjectId: number; quantity?: number }) {
  return mapCart(
    await sendJson<BackendCart>("/cart/items/", {
      method: "POST",
      body: JSON.stringify({ design_project_id: input.designProjectId, quantity: input.quantity ?? 1 }),
    })
  );
}

export async function updateCartItemQuantity(itemId: number, quantity: number) {
  return mapCart(
    await sendJson<BackendCart>(`/cart/items/${itemId}/`, {
      method: "PATCH",
      body: JSON.stringify({ quantity }),
    })
  );
}

export async function removeCartItem(itemId: number) {
  return mapCart(await sendJson<BackendCart>(`/cart/items/${itemId}/`, { method: "DELETE" }));
}

export async function applyCoupon(code: string) {
  return mapCart(await sendJson<BackendCart>("/cart/coupon/", { method: "POST", body: JSON.stringify({ code }) }));
}

export async function removeCoupon() {
  return mapCart(await sendJson<BackendCart>("/cart/coupon/", { method: "DELETE" }));
}

interface MergeGuestCartResult {
  merged: number;
  errors: { design_project_id: number | null; error: string }[];
  cart: CartApiResult;
}

/** Called once, right after login, with the guest cart's already-resolved
 * {designProjectId, quantity} entries — see cartMerge.ts for how a guest item (which never has
 * a real backend DesignProject) gets one created for it before this is called. */
export async function mergeGuestCart(entries: { designProjectId: number; quantity: number }[]): Promise<MergeGuestCartResult> {
  const response = await sendJson<{ merged: number; errors: { design_project_id: number | null; error: string }[]; cart: BackendCart }>(
    "/cart/merge/",
    {
      method: "POST",
      body: JSON.stringify({ items: entries.map((entry) => ({ design_project_id: entry.designProjectId, quantity: entry.quantity })) }),
    }
  );
  return { merged: response.merged, errors: response.errors, cart: mapCart(response.cart) };
}
