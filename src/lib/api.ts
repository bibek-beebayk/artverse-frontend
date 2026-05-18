import type { Artwork, MockupRender, MockupTemplate, PlacementOverride, Product, VideoClip } from "../types.ts";

interface BackendCategory {
  id: number;
  name: string;
  slug: string;
}

interface BackendArtwork {
  id: number;
  title: string;
  slug: string;
  category: BackendCategory;
  description: string;
  image: string | null;
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
  image_url: string;
  inventory: number;
  is_active: boolean;
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

interface MockupRenderMutationResponse {
  created: boolean;
  render: BackendMockupRender;
  message: string;
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:8000/api";

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

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

async function sendJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);
  const data = (await response.json().catch(() => ({}))) as T & { detail?: string };

  if (!response.ok) {
    throw new Error(data.detail || `Request failed with status ${response.status}`);
  }

  return data as T;
}

function mapArtwork(artwork: BackendArtwork): Artwork {
  const imageUrl = resolveAssetUrl(artwork.image) || artwork.image_url;
  return {
    id: String(artwork.id),
    backendArtworkId: artwork.id,
    title: artwork.title,
    category: artwork.category.name,
    description: artwork.description,
    tags: [],
    suitableProducts: ['Wallpaper', 'Canvas', 'Poster', 'Digital Download'],
    imageUrl,
    wallpaperDownloadUrl: imageUrl,
    printProductUrl: '/shop',
    price: artwork.is_featured ? '$49.99' : '$29.99',
    isFeatured: artwork.is_featured,
    isPremium: artwork.is_featured,
    createdAt: artwork.created_at,
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
  return {
    id: String(product.id),
    name: product.name,
    category: product.category.name,
    price: Number.isNaN(price) ? product.price : `$${price.toFixed(2)}`,
    imageUrl: resolveAssetUrl(product.image) || product.image_url,
    description: product.description,
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
    updatedAt: template.updated_at,
  };
}

function mapMockupRender(render: BackendMockupRender): MockupRender {
  return {
    id: render.id,
    template: mapMockupTemplate(render.template),
    generatedImage: render.generated_image,
    artwork: render.artwork,
    sourceImageUrl: render.source_image_url,
    sourcePrompt: render.source_prompt,
    variantColor: render.variant_color,
    variantSize: render.variant_size,
    placementOverride: render.placement_override || null,
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

export async function getArtworks() {
  const artworks = await fetchJson<BackendArtwork[]>("/gallery/artworks/");
  return artworks.map(mapArtwork);
}

export async function getFeaturedArtworks() {
  const artworks = await fetchJson<BackendArtwork[]>("/gallery/artworks/?featured=true");
  return artworks.map(mapArtwork);
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
}) {
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
      placement_override: input.placementOverride,
    }),
  });

  return {
    created: response.created,
    message: response.message,
    render: mapMockupRender(response.render),
  };
}

export async function getMaintenanceStatus(token?: string) {
  return sendJson<MaintenanceStatusResponse>("/auth/maintenance-status/", {
    headers: token ? { "X-Maintenance-Token": token } : undefined,
  });
}

export async function requestMaintenanceAccess(accessKey: string) {
  return sendJson<MaintenanceAccessResponse>("/auth/maintenance-access/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ access_key: accessKey }),
  });
}
