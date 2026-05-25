import { useCart } from '../context/CartContext.tsx';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { 
  ShoppingBag, 
  Trash2, 
  ArrowRight, 
  Plus, 
  Minus, 
  Sparkles, 
  CheckCircle, 
  Tag, 
  Heart, 
  Printer,
  ChevronRight,
  PlusCircle,
  Clock
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '../lib/utils.ts';

export function CartPage() {
  const { cart, removeFromCart, updateCartQuantity, getRecommendations, addToCart } = useCart();
  const [checkoutSimulated, setCheckoutSimulated] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [pendingDeleteItemId, setPendingDeleteItemId] = useState<string | null>(null);

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const shipping = subtotal > 50 ? 0 : 5.99;
  const total = subtotal + shipping;
  const pendingDeleteItem = cart.find((item) => item.id === pendingDeleteItemId) ?? null;

  // Recommendations mapping
  const upsellItems = getRecommendations(cart);

  useEffect(() => {
    if (!pendingDeleteItemId) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [pendingDeleteItemId]);

  const handleCheckout = () => {
    setCheckoutSimulated(true);
    setTimeout(() => {
      setCheckoutSimulated(false);
      setCheckoutSuccess(true);
    }, 1800);
  };

  const handleQuickAddUpsell = (rec: ReturnType<typeof getRecommendations>[0]) => {
    const mockupId = `cart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    addToCart({
      id: mockupId,
      generatedArtworkId: rec.artworkId,
      productType: rec.productType,
      mockupImageUrl: rec.mockupImageUrl,
      selectedSize: rec.productType === 'Mug' ? '11oz' : rec.productType === 'T-Shirt' || rec.productType === 'Hoodie' ? 'M' : '18" x 24"',
      selectedColour: rec.productType === 'T-Shirt' || rec.productType === 'Hoodie' ? 'Midnight Black' : 'Classic Pearl',
      quantity: 1,
      price: rec.price,
      userPrompt: rec.userPrompt,
      originalImageUrl: rec.originalImageUrl
    });
  };

  const handleRequestRemove = (itemId: string) => {
    setPendingDeleteItemId(itemId);
  };

  const handleConfirmRemove = () => {
    if (!pendingDeleteItemId) {
      return;
    }

    removeFromCart(pendingDeleteItemId);
    setPendingDeleteItemId(null);
  };

  const handleCancelRemove = () => {
    setPendingDeleteItemId(null);
  };

  if (checkoutSuccess) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-32 text-center text-white">
        <div className="w-20 h-20 rounded-full bg-neon-purple/20 border border-neon-purple flex items-center justify-center text-neon-purple mx-auto mb-8 animate-bounce">
          <CheckCircle size={40} />
        </div>
        <h1 className="text-4xl font-display font-black uppercase tracking-widest mb-4">Transmission Successful!</h1>
        <p className="text-xs text-gray-400 max-w-sm mx-auto uppercase tracking-wider mb-6 leading-relaxed">
          Your print orders are successfully scheduled on the Printify queue nodes. Render processing starting instantly.
        </p>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-left mb-8 space-y-3">
          <div className="flex justify-between text-xs font-mono uppercase text-gray-400">
            <span>Fulfillment ID</span>
            <span className="text-white">ORD-{Math.floor(Math.random() * 900000 + 100000)}</span>
          </div>
          <div className="flex justify-between text-xs font-mono uppercase text-gray-400">
            <span>Estimated Dispatch</span>
            <span className="text-neon-blue font-bold">2-3 Decades... Just kidding, 4-6 business days</span>
          </div>
        </div>
        <Link to="/generator" className="inline-flex items-center gap-2 px-8 py-4 bg-white text-cyber-black font-black uppercase tracking-widest rounded-xl hover:bg-neon-blue hover:text-white transition-all">
          Generate New Vision
        </Link>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-32 text-center text-white">
        <ShoppingBag size={64} className="mx-auto text-gray-600 mb-8" />
        <h2 className="text-3xl font-display font-black text-white uppercase tracking-widest mb-4">Cart System Empty</h2>
        <p className="text-gray-500 mb-8 max-w-sm mx-auto uppercase tracking-wider text-xs">Unlock custom apparel, wall decoration art, and mug wraps using AI.</p>
        <div className="flex justify-center gap-4">
          <Link to="/generator" className="inline-flex items-center gap-2 px-6 py-3 bg-neon-purple text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:neon-glow-purple transition-all">
            Open Dream Machine
          </Link>
          <Link to="/shop" className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:border-white transition-all">
            Browse Market
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-cyber-black text-white min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-6">
        <header className="mb-12">
          <span className="text-[10px] font-mono tracking-[0.4em] text-neon-pink uppercase mb-2 block">Secure Marketplace Checkout</span>
          <h1 className="text-4xl md:text-5xl font-display font-extrabold uppercase tracking-widest">
            Shopping <span className="italic font-light">Envelope</span>
          </h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
          
          {/* Main List items */}
          <div className="lg:col-span-2 space-y-6">
            <div className="space-y-4">
              {cart.map((item) => (
                <div 
                  key={item.id} 
                  className="glass-card p-6 border-white/5 flex flex-col sm:flex-row gap-6 items-center hover:border-white/10 transition-colors"
                >
                  {/* Photo Display Frame */}
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-cyber-black border border-white/5 overflow-hidden shrink-0 relative flex items-center justify-center p-4">
                    {item.originalImageUrl ? (
                      <>
                        <img 
                          src={item.mockupImageUrl} 
                          alt="Backdrop container layout" 
                          className="w-full h-full object-contain absolute opacity-20 mix-blend-screen pointer-events-none"
                        />
                        <img 
                          src={item.originalImageUrl} 
                          alt="Original custom layout artwork" 
                          className="w-10 h-10 object-cover rounded shadow"
                        />
                      </>
                    ) : (
                      <img 
                        src={item.mockupImageUrl} 
                        alt={item.productType} 
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  {/* Descriptions */}
                  <div className="flex-grow text-center sm:text-left">
                    <span className="text-[9px] font-mono tracking-widest text-neon-blue uppercase block mb-1">
                      {item.productType}
                    </span>
                    <h3 className="text-lg font-display font-bold uppercase tracking-wider text-white">
                      AI Generated Mockup Run
                    </h3>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1 mb-2 max-w-md line-clamp-1">
                      Prompt: "{item.userPrompt}"
                    </p>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4">
                      {item.selectedSize && (
                        <span className="bg-white/5 border border-white/5 rounded px-2 py-0.5 text-[8px] font-mono text-gray-400 uppercase tracking-widest">
                          Size: {item.selectedSize}
                        </span>
                      )}
                      {item.selectedColour && (
                        <span className="bg-white/5 border border-white/5 rounded px-2 py-0.5 text-[8px] font-mono text-gray-400 uppercase tracking-widest">
                          Shade: {item.selectedColour}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quantity Actions / Prices */}
                  <div className="flex sm:flex-col items-center justify-between sm:items-end w-full sm:w-auto gap-4 sm:gap-2 shrink-0 border-t sm:border-t-0 border-white/5 pt-4 sm:pt-0">
                    <span className="text-xl font-display font-black text-white">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-white/5 rounded-lg border border-white/5 p-1">
                        <button 
                          onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                          className="p-1 hover:text-neon-blue transition-colors"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-8 text-center text-xs font-mono">{item.quantity}</span>
                        <button 
                          onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                          className="p-1 hover:text-neon-blue transition-colors"
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      <button 
                        onClick={() => handleRequestRemove(item.id)}
                        className="p-2 border border-white/5 hover:border-neon-pink/30 hover:text-neon-pink rounded-lg transition-all"
                        title="Remove product"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                </div>
              ))}
            </div>

            {/* UPSELL SECTION: matches the generated design on other print products */}
            {upsellItems.length > 0 && (
              <section className="pt-12 border-t border-white/5">
                <header className="mb-6 flex items-start justify-between">
                  <div>
                    <h3 className="text-2xl font-display font-black uppercase tracking-widest text-white">
                      Complete Your Art Set
                    </h3>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">
                      Your artwork looks amazing on more than one product. Add matching items before checkout.
                    </p>
                  </div>
                  <span className="bg-neon-purple/20 border border-neon-purple/30 text-neon-purple text-[8px] font-mono font-bold uppercase tracking-widest px-2.5 py-1 rounded">
                    Save Bundles
                  </span>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {upsellItems.map((rec, idx) => (
                    <div 
                      key={idx}
                      className="glass-card p-4 border-white/5 flex gap-4 items-center group hover:border-neon-blue/40 transition-all"
                    >
                      {/* Thumbnail with overlay */}
                      <div className="w-16 h-16 rounded-lg bg-cyber-black border border-white/5 overflow-hidden shrink-0 flex items-center justify-center p-2 relative">
                        <img 
                          src={rec.mockupImageUrl} 
                          alt="Upsell visual template preview" 
                          className="w-full h-full object-contain absolute opacity-20 mix-blend-screen"
                        />
                        <img 
                          src={rec.originalImageUrl} 
                          alt="Custom layout visual overlay" 
                          className="w-6 h-6 object-cover rounded shadow relative z-10"
                        />
                      </div>

                      {/* Info & Add-to-cart */}
                      <div className="flex-grow">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <span className="text-[7px] font-mono tracking-widest text-neon-pink uppercase block">RECOMMENDED MATCH</span>
                            <h4 className="text-xs font-display font-bold uppercase tracking-wider text-white line-clamp-1">{rec.productType} Wrap</h4>
                          </div>
                          <span className="text-xs font-mono font-bold text-white shrink-0">${rec.price.toFixed(2)}</span>
                        </div>

                        <button 
                          onClick={() => handleQuickAddUpsell(rec)}
                          className="mt-2.5 inline-flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-[#38bdf8] hover:text-white transition-colors"
                        >
                          <PlusCircle size={12} />
                          Instant Bundle Add
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

          </div>

          {/* Checkout Checkout summary */}
          <div className="space-y-6">
            <div className="glass-card p-8 border-white/5 space-y-6 lg:sticky lg:top-28">
              <h3 className="text-xl font-display font-bold uppercase tracking-wider text-white">Fulfillment Invoice</h3>
              
              <div className="space-y-3 font-mono text-xs uppercase text-gray-400">
                <div className="flex justify-between pb-3 border-b border-white/5">
                  <span>Subtotal</span>
                  <span className="text-white font-bold">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pb-3 border-b border-white/5">
                  <span>Transit Cargo</span>
                  <span className="text-white font-bold">
                    {shipping === 0 ? <span className="text-[#10b981]">Free</span> : `$${shipping.toFixed(2)}`}
                  </span>
                </div>
                {shipping > 0 && (
                  <p className="text-[8px] tracking-widest text-right text-neon-blue">
                    Spend ${(50 - subtotal).toFixed(2)} more for free transit!
                  </p>
                )}
                
                <div className="flex justify-between text-base uppercase text-white font-bold pt-4">
                  <span className="text-sm font-display font-black tracking-widest">Total Invoice</span>
                  <span className="text-xl font-display font-black text-neon-blue">${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Secure Checkout details */}
              <div className="p-4 bg-white/5 rounded-xl text-[9px] text-[#9ca3af] uppercase leading-relaxed space-y-2">
                <div className="flex items-center gap-2 text-white font-bold text-[10px]">
                  <Printer size={12} className="text-neon-purple shrink-0" />
                  Printify Routing Node Enabled
                </div>
                <p>We transmit custom vectors dynamically to localized Printify nodes across clean energy print lines.</p>
              </div>

              <button
                onClick={handleCheckout}
                disabled={checkoutSimulated}
                className="w-full flex items-center justify-center gap-2 py-4 bg-white hover:bg-neon-blue text-cyber-black hover:text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300"
              >
                {checkoutSimulated ? (
                  <>
                    <span className="w-4 h-4 border-2 border-cyber-black border-t-transparent rounded-full animate-spin" />
                    Completing secure payment...
                  </>
                ) : (
                  <>
                    Proceed to Transit Node
                    <ArrowRight size={14} />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-4 text-[9px] font-mono text-gray-600 uppercase">
                <span className="flex items-center gap-1">
                  <Clock size={10} />
                  Fulfillment: ~4 Days
                </span>
                <span>•</span>
                <span>Refundable runs</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      <AnimatePresence>
        {pendingDeleteItem ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4"
          >
            <button
              type="button"
              aria-label="Close remove item confirmation"
              onClick={handleCancelRemove}
              className="absolute inset-0 bg-cyber-black/85 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 24 }}
              className="relative z-[121] w-full max-w-md rounded-3xl border border-white/10 bg-cyber-black/95 p-6 shadow-2xl sm:p-7"
            >
              <span className="mb-3 block text-[10px] font-mono uppercase tracking-[0.35em] text-neon-pink">
                Confirm Removal
              </span>
              <h3 className="text-2xl font-display font-black uppercase tracking-widest text-white">
                Delete This Cart Item?
              </h3>
              <p className="mt-3 text-xs uppercase tracking-wider leading-relaxed text-gray-400">
                Remove your <span className="text-white">{pendingDeleteItem.productType}</span> built from
                <span className="text-white"> "{pendingDeleteItem.userPrompt}"</span> from the cart?
              </p>

              <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-cyber-black/60 p-2">
                    <img
                      src={pendingDeleteItem.mockupImageUrl}
                      alt={pendingDeleteItem.productType}
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-neon-blue">
                      {pendingDeleteItem.productType}
                    </p>
                    <p className="mt-1 truncate text-sm font-bold uppercase tracking-wide text-white">
                      AI Generated Mockup Run
                    </p>
                    <p className="mt-1 text-[10px] uppercase tracking-widest text-gray-500">
                      Qty {pendingDeleteItem.quantity} • ${(pendingDeleteItem.price * pendingDeleteItem.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleCancelRemove}
                  className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-xs font-bold uppercase tracking-[0.28em] text-white transition-all hover:border-white/25"
                >
                  Keep Item
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRemove}
                  className="flex-1 rounded-2xl border border-neon-pink/40 bg-neon-pink/15 px-5 py-3 text-xs font-black uppercase tracking-[0.28em] text-neon-pink transition-all hover:bg-neon-pink hover:text-cyber-black"
                >
                  Remove Item
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
