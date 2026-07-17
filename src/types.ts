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
  category: string;
  price: string;
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
}

export interface PartCustomization {
  sourceArtworkId?: number;
  sourceGeneratedImageId?: number;
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
   * any) are still valid. */
  isDirty?: boolean;
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
  basePrice: number;
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
}

// --- Saved design projects (backend-persisted customizations) ---

export type DesignProjectStatus = 'draft' | 'ready' | 'archived';

export interface ProductVariant {
  id: number;
  productId: number | null;
  templateId: number;
  sku: string;
  name: string;
  colorName: string;
  colorHex: string;
  size: string;
  price: string | null;
  baseCost?: string | null;
  inventory: number;
  isAvailable: boolean;
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
