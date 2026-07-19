import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ActiveCustomization, CartItem, CartTotals, GeneratedArtwork, ProductVariant } from '../types.ts';
import { useAuth } from './AuthContext.tsx';
import {
  addCartItem,
  applyCoupon as applyCouponApi,
  createDesignProject,
  getCart,
  getProductVariants,
  mergeGuestCart,
  removeCartItem,
  removeCoupon as removeCouponApi,
  updateCartItemQuantity,
  type CartApiResult,
} from '../lib/api.ts';
import { buildDesignProjectInputForGuestItem, findMatchingVariant } from '../lib/cartMerge.ts';
import { computeGuestCartTotals } from '../lib/cartPricing.ts';

const EMPTY_TOTALS: CartTotals = { subtotal: 0, discountAmount: 0, taxAmount: 0, shippingAmount: 0, total: 0, currency: 'USD' };

interface CartContextType {
  cart: CartItem[];
  cartTotals: CartTotals;
  couponCode: string | null;
  cartCouponError: string | null;
  isCartSyncing: boolean;
  addToCart: (item: CartItem) => void;
  removeFromCart: (itemId: string) => void;
  updateCartQuantity: (itemId: string, quantity: number) => void;
  updateCartItem: (itemId: string, updates: Partial<CartItem>) => void;
  clearCart: () => void;
  applyCartCoupon: (code: string) => Promise<void>;
  removeCartCoupon: () => void;
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
  const { user } = useAuth();

  // Guest (not-signed-in) cart — entirely localStorage-based, unchanged from before this cart
  // moved to the backend. Only ever read/written when `!user`.
  const [guestCart, setGuestCart] = useState<CartItem[]>(() => {
    const local = localStorage.getItem('artverse_cart');
    return local ? JSON.parse(local) : [];
  });

  // Backend (signed-in) cart — populated by getCart()/mergeGuestCart() and every mutating call's
  // returned cart. null until the first successful fetch/merge.
  const [backendCart, setBackendCart] = useState<CartApiResult | null>(null);
  const [isCartSyncing, setIsCartSyncing] = useState(false);
  const [cartCouponError, setCartCouponError] = useState<string | null>(null);

  const [activeCustomization, setActiveCustomizationState] = useState<ActiveCustomization | null>(() => {
    const local = localStorage.getItem('artverse_active_customization');
    return local ? JSON.parse(local) : null;
  });

  const [generatedArtworks, setGeneratedArtworks] = useState<GeneratedArtwork[]>(() => {
    const local = localStorage.getItem('artverse_generated_artworks');
    return local ? JSON.parse(local) : [];
  });

  useEffect(() => {
    localStorage.setItem('artverse_cart', JSON.stringify(guestCart));
  }, [guestCart]);

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

  // One-shot merge of the guest cart into the real backend cart, right after login — guarded by
  // its own ref (not tied to any other effect's guard) so it fires exactly once per
  // guest->authenticated transition, not once per render.
  const hasMergedRef = useRef(false);

  useEffect(() => {
    if (!user) {
      hasMergedRef.current = false;
      setBackendCart(null);
      return;
    }
    if (hasMergedRef.current) return;
    hasMergedRef.current = true;

    const mergeGuestCartIntoAccount = async () => {
      setIsCartSyncing(true);
      try {
        if (guestCart.length === 0) {
          setBackendCart(await getCart());
          return;
        }

        const alreadyLinked = guestCart.filter((item) => item.designProjectId);
        const unlinked = guestCart.filter((item) => !item.designProjectId);

        const templateIds = Array.from(
          new Set(unlinked.map((item) => item.templateId).filter((id): id is number => Boolean(id)))
        );
        const variantsByTemplate = new Map<number, ProductVariant[]>();
        for (const templateId of templateIds) {
          variantsByTemplate.set(templateId, await getProductVariants({ templateId }));
        }

        const resolvedEntries: { designProjectId: number; quantity: number }[] = [];
        let unresolvedCount = 0;
        for (const item of unlinked) {
          const variants = item.templateId ? variantsByTemplate.get(item.templateId) ?? [] : [];
          const variant = findMatchingVariant(variants, item.selectedColour, item.selectedSize);
          if (!variant) {
            unresolvedCount += 1;
            continue;
          }
          try {
            const created = await createDesignProject(buildDesignProjectInputForGuestItem(item, variant));
            resolvedEntries.push({ designProjectId: created.id, quantity: item.quantity });
          } catch {
            unresolvedCount += 1;
          }
        }
        for (const item of alreadyLinked) {
          resolvedEntries.push({ designProjectId: item.designProjectId!, quantity: item.quantity });
        }

        if (resolvedEntries.length > 0) {
          const { cart: mergedCart } = await mergeGuestCart(resolvedEntries);
          setBackendCart(mergedCart);
        } else {
          setBackendCart(await getCart());
        }

        // Only clear the guest cart once the merge has actually completed successfully — a
        // thrown error anywhere above leaves localStorage untouched, so nothing is silently
        // lost on a failed merge (the user can just try again, e.g. by reloading).
        setGuestCart([]);
        localStorage.removeItem('artverse_cart');

        if (unresolvedCount > 0) {
          console.warn(
            `${unresolvedCount} guest cart item(s) could not be merged into your account (no matching product/variant found).`
          );
        }
      } catch (error) {
        console.error('Failed to merge guest cart into account:', error);
      } finally {
        setIsCartSyncing(false);
      }
    };

    void mergeGuestCartIntoAccount();
    // Deliberately only re-runs when `user` changes — guestCart is read once, at the moment of
    // the guest->authenticated transition, via the ref-guarded closure above, not on every
    // guest-cart edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const cart = user ? backendCart?.items ?? [] : guestCart;
  const cartTotals: CartTotals = user ? backendCart?.totals ?? EMPTY_TOTALS : computeGuestCartTotals(guestCart);
  const couponCode = user ? backendCart?.coupon?.code ?? null : null;

  const addToCart = useCallback(
    (newItem: CartItem) => {
      if (user) {
        if (!newItem.designProjectId) {
          // Quick-add upsell items (CartPage's "Instant Bundle Add") never have a saved design
          // behind them — they're a client-side-only suggestion. Wiring that flow up to create
          // a real DesignProject for a different product type is out of scope here; for a
          // signed-in account this is a no-op rather than adding a phantom item that would
          // vanish on refresh.
          console.warn('Cannot add this item to your account cart — it has no saved design to link to.');
          return;
        }
        setIsCartSyncing(true);
        addCartItem({ designProjectId: newItem.designProjectId, quantity: newItem.quantity })
          .then(setBackendCart)
          .catch((error) => console.error('Failed to add item to cart:', error))
          .finally(() => setIsCartSyncing(false));
        return;
      }

      setGuestCart((prev) => {
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
    },
    [user]
  );

  const removeFromCart = useCallback(
    (itemId: string) => {
      if (user) {
        const item = backendCart?.items.find((i) => i.id === itemId);
        if (!item?.backendCartItemId) return;
        setIsCartSyncing(true);
        removeCartItem(item.backendCartItemId)
          .then(setBackendCart)
          .catch((error) => console.error('Failed to remove item from cart:', error))
          .finally(() => setIsCartSyncing(false));
        return;
      }
      setGuestCart((prev) => prev.filter((item) => item.id !== itemId));
    },
    [user, backendCart]
  );

  const updateCartQuantity = useCallback(
    (itemId: string, quantity: number) => {
      if (user) {
        const item = backendCart?.items.find((i) => i.id === itemId);
        if (!item?.backendCartItemId) return;
        setIsCartSyncing(true);
        updateCartItemQuantity(item.backendCartItemId, Math.max(1, quantity))
          .then(setBackendCart)
          .catch((error) => console.error('Failed to update cart item quantity:', error))
          .finally(() => setIsCartSyncing(false));
        return;
      }
      setGuestCart((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, quantity: Math.max(1, quantity) } : item))
      );
    },
    [user, backendCart]
  );

  const updateCartItem = useCallback(
    (itemId: string, updates: Partial<CartItem>) => {
      if (user) {
        // Backend-mode cart items are always server-derived (the preview image comes from the
        // design project's own resolved thumbnail) — there's nothing here for this to patch.
        return;
      }
      setGuestCart((prev) => prev.map((item) => (item.id === itemId ? { ...item, ...updates } : item)));
    },
    [user]
  );

  const clearCart = useCallback(() => {
    if (user) {
      // Not wired to a bulk-clear endpoint — nothing in the app currently calls clearCart() in
      // backend mode. A future checkout-complete flow should call removeFromCart per item (or a
      // dedicated endpoint, if one is added) rather than relying on this.
      return;
    }
    setGuestCart([]);
  }, [user]);

  const applyCartCoupon = useCallback(
    async (code: string) => {
      setCartCouponError(null);
      if (!user) {
        setCartCouponError('Sign in to apply a coupon code.');
        return;
      }
      try {
        setIsCartSyncing(true);
        setBackendCart(await applyCouponApi(code));
      } catch (error) {
        setCartCouponError(error instanceof Error ? error.message : 'Could not apply this coupon.');
      } finally {
        setIsCartSyncing(false);
      }
    },
    [user]
  );

  const removeCartCoupon = useCallback(() => {
    if (!user) return;
    setCartCouponError(null);
    setIsCartSyncing(true);
    removeCouponApi()
      .then(setBackendCart)
      .catch((error) => console.error('Failed to remove coupon:', error))
      .finally(() => setIsCartSyncing(false));
  }, [user]);

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
      cartTotals,
      couponCode,
      cartCouponError,
      isCartSyncing,
      addToCart,
      removeFromCart,
      updateCartQuantity,
      updateCartItem,
      clearCart,
      applyCartCoupon,
      removeCartCoupon,
      activeCustomization,
      setActiveCustomization,
      generatedArtworks,
      addGeneratedArtwork,
      getRecommendations,
    }),
    [
      cart,
      cartTotals,
      couponCode,
      cartCouponError,
      isCartSyncing,
      addToCart,
      removeFromCart,
      updateCartQuantity,
      updateCartItem,
      clearCart,
      applyCartCoupon,
      removeCartCoupon,
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
