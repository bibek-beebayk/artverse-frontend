import type { Product, ProductVariant } from '../types.ts';
import { parseStartingPrice } from './pricing.ts';

/** A fully validated, purchase-ready product+variant pair — every purchasable action (opening
 * customization, saving a purchasable design, adding a guest/authenticated cart item, enabling a
 * purchase CTA) must go through `validateSellableSelection` and only proceed when `selection` is
 * non-null. Never reconstruct this shape by hand, and never let a purchasable action read
 * `product`/`variant` fields directly without having called this first. */
export interface SellableSelection {
  product: Product;
  variant: ProductVariant;
  startingPrice: number;
}

export type SellableSelectionReason =
  | null
  | 'missing-product'
  | 'product-unavailable'
  | 'missing-price'
  | 'missing-variant'
  | 'variant-unavailable'
  | 'variant-not-sellable'
  | 'variant-product-mismatch'
  | 'variant-template-mismatch';

export interface SellableSelectionResult {
  selection: SellableSelection | null;
  reason: SellableSelectionReason;
}

function fail(reason: NonNullable<SellableSelectionReason>): SellableSelectionResult {
  return { selection: null, reason };
}

/** The single reusable guard for "is this product+variant pair actually purchasable right now."
 * Mirrors the backend's own sellability rule (`apps.shop.services.variant_is_sellable` +
 * `product_has_sellable_variant`) rather than reimplementing it — this function is
 * display/CTA-gating logic only, never a substitute for server-side validation (the backend
 * still independently rejects an unsellable add, see apps.cart.services). */
export function validateSellableSelection(
  product: Product | null | undefined,
  variant: ProductVariant | null | undefined,
): SellableSelectionResult {
  if (!product) {
    return fail('missing-product');
  }
  if (!product.isAvailable) {
    return fail('product-unavailable');
  }
  const startingPrice = parseStartingPrice(product.startingPrice);
  if (startingPrice === null) {
    return fail('missing-price');
  }
  if (!variant) {
    return fail('missing-variant');
  }
  if (!variant.isAvailable) {
    return fail('variant-unavailable');
  }
  if (!variant.isSellable) {
    return fail('variant-not-sellable');
  }
  if (variant.productId !== Number(product.id)) {
    return fail('variant-product-mismatch');
  }
  if (product.mockupTemplateId != null && variant.templateId !== product.mockupTemplateId) {
    return fail('variant-template-mismatch');
  }

  return { selection: { product, variant, startingPrice }, reason: null };
}

/** Short, user-facing explanation for a failed SellableSelectionResult — used by disabled CTAs
 * and colour/size option labels so a shopper sees *why* something isn't available rather than
 * just a greyed-out control. */
export function describeSellableSelectionReason(reason: SellableSelectionReason): string | null {
  switch (reason) {
    case null:
      return null;
    case 'missing-product':
    case 'product-unavailable':
      return 'Currently unavailable';
    case 'missing-price':
      return 'Pricing not configured';
    case 'missing-variant':
      return 'Not supported';
    case 'variant-unavailable':
      return 'Unavailable';
    case 'variant-not-sellable':
      return 'Pricing not configured';
    case 'variant-product-mismatch':
    case 'variant-template-mismatch':
      return 'Not supported';
    default:
      return 'Currently unavailable';
  }
}
