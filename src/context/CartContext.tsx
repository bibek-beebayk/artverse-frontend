import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ActiveCustomization, CartItem, GeneratedArtwork } from '../types.ts';

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (itemId: string) => void;
  updateCartQuantity: (itemId: string, quantity: number) => void;
  updateCartItem: (itemId: string, updates: Partial<CartItem>) => void;
  clearCart: () => void;
  activeCustomization: ActiveCustomization | null;
  setActiveCustomization: (customization: ActiveCustomization | null) => void;
  generatedArtworks: GeneratedArtwork[];
  addGeneratedArtwork: (artwork: GeneratedArtwork) => void;
  getRecommendations: (items: CartItem[]) => {
    productType: string;
    mockupImageUrl: string;
    price: number;
    artworkId: string;
    originalImageUrl: string;
    userPrompt: string;
  }[];
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>(() => {
    const local = localStorage.getItem('artverse_cart');
    return local ? JSON.parse(local) : [];
  });

  const [activeCustomization, setActiveCustomizationState] = useState<ActiveCustomization | null>(() => {
    const local = localStorage.getItem('artverse_active_customization');
    return local ? JSON.parse(local) : null;
  });

  const [generatedArtworks, setGeneratedArtworks] = useState<GeneratedArtwork[]>(() => {
    const local = localStorage.getItem('artverse_generated_artworks');
    return local ? JSON.parse(local) : [];
  });

  useEffect(() => {
    localStorage.setItem('artverse_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (activeCustomization) {
      localStorage.setItem('artverse_active_customization', JSON.stringify(activeCustomization));
    } else {
      localStorage.removeItem('artverse_active_customization');
    }
  }, [activeCustomization]);

  useEffect(() => {
    localStorage.setItem('artverse_generated_artworks', JSON.stringify(generatedArtworks));
  }, [generatedArtworks]);

  const addToCart = useCallback((newItem: CartItem) => {
    setCart((prev) => {
      // Check if exact same item exists (same artwork, same productType, size, and colour)
      // Check if exact same item exists (same artwork, same productType, size, and colour)
      const existingIdx = prev.findIndex(
        (item) =>
          item.generatedArtworkId === newItem.generatedArtworkId &&
          item.sourceArtworkId === newItem.sourceArtworkId &&
          item.productType === newItem.productType &&
          item.selectedSize === newItem.selectedSize &&
          item.selectedColour === newItem.selectedColour &&
          JSON.stringify(item.textElements || []) === JSON.stringify(newItem.textElements || [])
      );

      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += newItem.quantity;
        return updated;
      }
      return [...prev, newItem];
    });
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  const updateCartQuantity = useCallback((itemId: string, quantity: number) => {
    setCart((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, quantity: Math.max(1, quantity) } : item))
    );
  }, []);

  const updateCartItem = useCallback((itemId: string, updates: Partial<CartItem>) => {
    setCart((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, ...updates } : item))
    );
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const setActiveCustomization = useCallback((customization: ActiveCustomization | null) => {
    if (customization) {
      localStorage.setItem('artverse_active_customization', JSON.stringify(customization));
    } else {
      localStorage.removeItem('artverse_active_customization');
    }
    setActiveCustomizationState(customization);
  }, []);

  const addGeneratedArtwork = useCallback((artwork: GeneratedArtwork) => {
    setGeneratedArtworks((prev) => {
      const existingIndex = prev.findIndex((art) => art.id === artwork.id);
      if (existingIndex > -1) {
        const currentArtwork = prev[existingIndex];
        if (JSON.stringify(currentArtwork) === JSON.stringify(artwork)) {
          return prev;
        }

        const updated = [...prev];
        updated[existingIndex] = artwork;
        return updated;
      }
      return [artwork, ...prev];
    });
  }, []);

  // Up-sell Recommendation Logic
  const getRecommendations = useCallback((cartItems: CartItem[]) => {
    if (cartItems.length === 0) return [];

    // Prioritize recommending products matching the most recently added item's artwork
    const primeItem = cartItems[cartItems.length - 1];
    const originalArtId = primeItem.generatedArtworkId;
    const originalImg = primeItem.originalImageUrl || primeItem.mockupImageUrl;
    const promptText = primeItem.userPrompt || 'Generated AI Creation';

    // Find custom artwork metadata from generated list if available
    const matchedArtwork = generatedArtworks.find((ga) => ga.id === originalArtId);

    // Default product details if matchedArtwork isn't found
    const allPossibleTypes = [
      { type: 'T-Shirt', price: 29.99, suffix: 'tshirt' },
      { type: 'Hoodie', price: 49.99, suffix: 'hoodie' },
      { type: 'Mug', price: 18.00, suffix: 'mug' },
      { type: 'Canvas Print', price: 45.00, suffix: 'canvas' },
      { type: 'Poster', price: 24.99, suffix: 'poster' },
      { type: 'Mousepad', price: 19.99, suffix: 'mousepad' },
      { type: 'Phone Case', price: 14.99, suffix: 'phone' },
      { type: 'Tote Bag', price: 22.00, suffix: 'tote' },
      { type: 'Sticker Pack', price: 9.99, suffix: 'sticker' },
    ];

    // Exclude product types already purchased for this specific artwork
    const purchasedTypes = cartItems
      .filter((item) => item.generatedArtworkId === originalArtId)
      .map((item) => item.productType.toLowerCase());

    const filtered = allPossibleTypes.filter(
      (p) => !purchasedTypes.includes(p.type.toLowerCase())
    );

    // Map to simple recommended structure.
    // If we have custom mockups in matchedArtwork, use them, otherwise mock using the template image
    return filtered.slice(0, 4).map((p) => {
      let mockupUrl = originalImg;
      if (matchedArtwork) {
        const pm = matchedArtwork.availableProducts.find(
          (ap) => ap.productType.toLowerCase() === p.type.toLowerCase()
        );
        if (pm) {
          mockupUrl = pm.mockupImageUrl;
        }
      }

      return {
        productType: p.type,
        mockupImageUrl: mockupUrl,
        price: p.price,
        artworkId: originalArtId,
        originalImageUrl: originalImg,
        userPrompt: promptText,
      };
    });
  }, [generatedArtworks]);

  const value = useMemo(
    () => ({
      cart,
      addToCart,
      removeFromCart,
      updateCartQuantity,
      updateCartItem,
      clearCart,
      activeCustomization,
      setActiveCustomization,
      generatedArtworks,
      addGeneratedArtwork,
      getRecommendations,
    }),
    [
      cart,
      addToCart,
      removeFromCart,
      updateCartQuantity,
      updateCartItem,
      clearCart,
      activeCustomization,
      setActiveCustomization,
      generatedArtworks,
      addGeneratedArtwork,
      getRecommendations,
    ]
  );

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
