import type { CartItem, CartTotals } from '../types.ts';

/** Guest (not-signed-in) cart totals — a client-side ESTIMATE only, never server-validated.
 * Extracted unchanged from the inline math that used to live directly in CartPage.tsx (same
 * $50 free-shipping threshold, same flat $5.99 rate) so pre-refactor behaviour is preserved
 * exactly. Once a user signs in, the real, server-computed totals from `getCart()`/
 * `mergeGuestCart()` take over — see `lib/api.ts`'s `CartApiResult.totals` and
 * `apps.cart.pricing` on the backend for the actual pricing engine. */
export function computeGuestCartTotals(items: CartItem[]): CartTotals {
  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const shippingAmount = subtotal > 50 ? 0 : 5.99;
  const total = subtotal + shippingAmount;
  return {
    subtotal,
    discountAmount: 0,
    taxAmount: 0,
    shippingAmount,
    total,
    currency: 'USD',
  };
}
