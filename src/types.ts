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
  description: string;
  tags: string[];
  suitableProducts: string[];
  imageUrl: string;
  wallpaperDownloadUrl: string;
  printProductUrl: string;
  price: string;
  isFeatured: boolean;
  isPremium: boolean;
  createdAt: string;
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
  description?: string;
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
}

export interface CropOverride {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ActiveCustomization {
  artworkId: string;
  sourceArtworkId?: number;
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
  basePrice: number;
  sizes: string[];
  colours: string[];
  basePlacement: PlacementOverride | null;
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
  printProviderProductId?: string;
  printProviderVariantId?: string;
  userPrompt?: string;
  originalImageUrl?: string;
}
