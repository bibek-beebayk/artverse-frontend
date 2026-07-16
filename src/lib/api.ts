import type { Artwork, CollectionSummary, CropOverride, MockupRender, MockupTemplate, MockupTemplatePart, PlacementOverride, Product, TextElement, VideoClip } from "../types.ts";

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
  price: string;
  image: string | null;
  thumbnail: string | null;
  image_url: string;
  inventory: number;
  is_active: boolean;
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
  parts?: BackendMockupTemplatePart[];
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
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }

  const accessToken = getBackendAccessToken();
  if (accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });
  const data = (await response.json().catch(() => ({}))) as T & { detail?: string };

  if (response.status === 401 && retryOn401 && getBackendRefreshToken()) {
    const nextAccessToken = await refreshBackendAccessToken();
    if (nextAccessToken) {
      const retryHeaders = new Headers(init?.headers);
      if (!retryHeaders.has("Content-Type") && init?.body) {
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
    throw new Error(data.detail || `Request failed with status ${response.status}`);
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
  const price = Number(product.price);
  const imageUrl = resolveAssetUrl(product.image) || product.image_url;
  const thumbnailUrl = resolveAssetUrl(product.thumbnail) || imageUrl;
  return {
    id: String(product.id),
    name: product.name,
    category: product.category.name,
    price: Number.isNaN(price) ? product.price : `$${price.toFixed(2)}`,
    imageUrl,
    thumbnailUrl,
    description: product.description,
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

export async function getArtworks(options?: { collectionSlug?: string }) {
  const search = options?.collectionSlug
    ? `?collection=${encodeURIComponent(options.collectionSlug)}`
    : "";
  const artworks = await fetchJson<BackendArtwork[]>(`/gallery/artworks/${search}`);
  return artworks.map(mapArtwork);
}

export async function getFeaturedArtworks() {
  const artworks = await fetchJson<BackendArtwork[]>("/gallery/artworks/?featured=true");
  return artworks.map(mapArtwork);
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

export async function getProducts() {
  const products = await fetchJson<BackendProduct[]>("/shop/products/");
  return products.map(mapProduct);
}

export async function getMockupTemplates(productType?: string) {
  const search = productType ? `?product_type=${encodeURIComponent(productType)}` : "";
  const templates = await fetchJson<BackendMockupTemplate[]>(`/generator/mockup-templates/${search}`);
  return templates.map(mapMockupTemplate);
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
