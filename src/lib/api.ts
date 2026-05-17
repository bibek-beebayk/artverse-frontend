import type { Artwork, Product, VideoClip } from "../types.ts";

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

interface MaintenanceStatusResponse {
  maintenance_mode: boolean;
  access_granted: boolean;
  maintenance_message?: string;
}

interface MaintenanceAccessResponse extends MaintenanceStatusResponse {
  token?: string;
  detail?: string;
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
