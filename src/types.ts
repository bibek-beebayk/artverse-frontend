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
  productType: string;
  mockupImageUrl: string;
  basePrice: number;
  sizes: string[];
  colours: string[];
  printArea: string;
  isRecommended: boolean;
}

export interface GeneratedArtwork {
  id: string;
  userPrompt: string;
  imageUrl: string;
  createdAt: string;
  categorySuggestion: string;
  availableProducts: AvailableMockupProduct[];
}

export interface CartItem {
  id: string;
  generatedArtworkId: string;
  productType: string;
  mockupImageUrl: string;
  selectedSize: string;
  selectedColour: string;
  quantity: number;
  price: number;
  printProviderProductId?: string;
  printProviderVariantId?: string;
  userPrompt?: string;
  originalImageUrl?: string;
}
