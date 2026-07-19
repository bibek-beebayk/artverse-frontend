import type { CartItem } from '../types.ts';

/** Real checkout (payment, order creation, Printify submission) doesn't exist yet — this phase
 * ends at cart + pricing (see TODO.md Sections 4/5). `isCheckoutReady` reflects whether the
 * cart itself has no known blocking issues (server-side pricing/availability warnings); it is
 * deliberately independent of `isCheckoutImplemented`, which is hard-coded false here and is
 * the actual reason the checkout action stays disabled. Keeping the two separate means the
 * moment real checkout is built, only `isCheckoutImplemented` needs to change — the readiness
 * logic itself doesn't need to move. */
export interface CartReadiness {
  isCheckoutReady: boolean;
  isCheckoutImplemented: boolean;
  hasWarnings: boolean;
  /** The general reason checkout is disabled — always shown. */
  reasonMessage: string;
  /** An additional, specific reason shown only when items actually have warnings — kept
   * separate from `reasonMessage` rather than combined into one vague string. */
  warningMessage: string | null;
}

/** `backendIsCheckoutReady` is the server's own opinion (`CartApiResult.isCheckoutReady`) —
 * `null` for a guest cart, which has no server-side pricing validation to report. Guest carts
 * are therefore never treated as having warnings (there's nothing to warn about yet), but
 * they're also never "ready" in a way that matters, since `isCheckoutImplemented` is false
 * regardless of auth state. */
export function computeCartReadiness(items: CartItem[], backendIsCheckoutReady: boolean | null): CartReadiness {
  const hasWarnings = items.some((item) => (item.warnings?.length ?? 0) > 0) || backendIsCheckoutReady === false;
  const isCheckoutReady = items.length > 0 && !hasWarnings;

  return {
    isCheckoutReady,
    isCheckoutImplemented: false,
    hasWarnings,
    reasonMessage: 'Checkout is not available yet.',
    warningMessage: hasWarnings ? 'Some items require pricing or availability updates.' : null,
  };
}
