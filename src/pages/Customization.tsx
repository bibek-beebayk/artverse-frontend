import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext.tsx';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  Layers, 
  Check, 
  ShoppingBag, 
  Maximize2, 
  HelpCircle, 
  ShieldCheck, 
  Truck, 
  Sparkles,
  Info,
  Move,
  Scaling
} from 'lucide-react';
import { cn } from '../lib/utils.ts';
import { ImageModal } from '../components/Common.tsx';
import { createMockupRender } from '../lib/api.ts';
import type { ActiveCustomization, PlacementOverride } from '../types.ts';

function normalizePlacement(placement: ActiveCustomization['basePlacement']): PlacementOverride | null {
  if (!placement) {
    return null;
  }

  const x = Number(placement.x);
  const y = Number(placement.y);
  const width = Number(placement.width);
  const height = Number(placement.height);

  if ([x, y, width, height].some((value) => Number.isNaN(value))) {
    return null;
  }

  return { x, y, width, height };
}

export function Customization() {
  const { activeCustomization, addToCart, setActiveCustomization } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const routeCustomization = (location.state as { customization?: ActiveCustomization } | null)?.customization;
  const customization = useMemo(() => {
    const candidate = activeCustomization ?? routeCustomization ?? null;
    if (!candidate) {
      return null;
    }

    return {
      ...candidate,
      basePlacement: normalizePlacement(candidate.basePlacement),
    };
  }, [activeCustomization, routeCustomization]);

  const [selectedColour, setSelectedColour] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [isAdding, setIsAdding] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string>('');
  const [previewRenderId, setPreviewRenderId] = useState<number | undefined>(undefined);
  const [previewResolvedPlacement, setPreviewResolvedPlacement] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [scalePercent, setScalePercent] = useState(100);
  const previewRequestSequence = useRef(0);

  useEffect(() => {
    if (!activeCustomization && routeCustomization) {
      setActiveCustomization(routeCustomization);
    }
  }, [activeCustomization, routeCustomization, setActiveCustomization]);

  // Initialize selected defaults from active customization
  useEffect(() => {
    if (customization) {
      setPreviewImageUrl(customization.mockupImageUrl);
      setPreviewResolvedPlacement(customization.basePlacement);
      setOffsetX(0);
      setOffsetY(0);
      setScalePercent(100);
      if (customization.colours && customization.colours.length > 0) {
        setSelectedColour(customization.colours[0]);
      }
      if (customization.sizes && customization.sizes.length > 0) {
        setSelectedSize(customization.sizes[0]);
      }
    }
  }, [customization]);

  useEffect(() => {
    if (!customization || !selectedColour || !selectedSize) {
      return;
    }

    let isCancelled = false;
    const requestSequence = ++previewRequestSequence.current;
    const basePlacement = customization.basePlacement;
    const placementOverride = basePlacement
      ? {
          x: Math.round(basePlacement.x + offsetX),
          y: Math.round(basePlacement.y + offsetY),
          width: Math.max(80, Math.round(basePlacement.width * (scalePercent / 100))),
          height: Math.max(80, Math.round(basePlacement.height * (scalePercent / 100))),
        }
      : undefined;

    const refreshPreview = async () => {
      setPreviewLoading(true);
      setPreviewError(null);

      try {
        const response = await createMockupRender({
          templateId: customization.templateId,
          artworkId: customization.sourceArtworkId,
          sourceImageUrl: customization.imageUrl,
          sourcePrompt: customization.userPrompt,
          variantColor: selectedColour,
          variantSize: selectedSize,
          placementOverride,
        });

        if (isCancelled) {
          return;
        }
        if (requestSequence !== previewRequestSequence.current) {
          return;
        }

        setPreviewImageUrl(
          response.render.outputImage || response.render.outputImageUrl || customization.mockupImageUrl
        );
        setPreviewRenderId(response.render.id);
        setPreviewResolvedPlacement(placementOverride ?? customization.basePlacement);
      } catch (renderError) {
        if (isCancelled) {
          return;
        }
        if (requestSequence !== previewRequestSequence.current) {
          return;
        }
        console.error('Failed to refresh mockup preview:', renderError);
        setPreviewError('Preview update failed. Showing the last available render.');
      } finally {
        if (!isCancelled && requestSequence === previewRequestSequence.current) {
          setPreviewLoading(false);
        }
      }
    };

    const debounceTimeout = window.setTimeout(() => {
      void refreshPreview();
    }, 120);

    return () => {
      isCancelled = true;
      window.clearTimeout(debounceTimeout);
    };
  }, [customization, offsetX, offsetY, scalePercent, selectedColour, selectedSize]);

  if (!customization) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-32 text-center text-white">
        <h2 className="text-3xl font-display font-black text-white uppercase tracking-widest mb-4">No Customization Selected</h2>
        <p className="text-gray-500 mb-8 max-w-sm mx-auto uppercase tracking-wider text-xs">Generate an artwork on the Dream page to kickstart custom product wrapping.</p>
        <Link to="/generator" className="inline-flex items-center gap-2 px-8 py-4 bg-neon-purple text-white font-bold uppercase tracking-widest rounded-full hover:neon-glow-purple transition-all">
          Launch Dream Machine
        </Link>
      </div>
    );
  }

  // Render product preview configuration based on choices
  const totalPrice = (customization.basePrice * quantity).toFixed(2);

  const handleConfirmAddToCart = () => {
    setIsAdding(true);
    setTimeout(() => {
      const cartItemId = `cart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      addToCart({
        id: cartItemId,
        generatedArtworkId: customization.artworkId,
        sourceArtworkId: customization.sourceArtworkId,
        productType: customization.productType,
        mockupImageUrl: previewImageUrl || customization.mockupImageUrl,
        selectedSize: selectedSize,
        selectedColour: selectedColour,
        quantity: quantity,
        price: customization.basePrice,
        templateId: customization.templateId,
        backendRenderId: previewRenderId,
        placementOverride: customization.basePlacement
          ? {
              x: Math.round(customization.basePlacement.x + offsetX),
              y: Math.round(customization.basePlacement.y + offsetY),
              width: Math.max(80, Math.round(customization.basePlacement.width * (scalePercent / 100))),
              height: Math.max(80, Math.round(customization.basePlacement.height * (scalePercent / 100))),
            }
          : undefined,
        userPrompt: customization.userPrompt,
        originalImageUrl: customization.imageUrl
      });

      setIsAdding(false);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        navigate('/cart');
      }, 1500);
    }, 1200);
  };

  return (
    <div className="bg-cyber-black text-white min-h-screen">
      {/* Upper Navigation bar */}
      <div className="max-w-7xl mx-auto px-6 pt-12">
        <Link 
          to="/generator" 
          className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
        >
          <ChevronLeft size={16} />
          Back to Dream Workspace
        </Link>
      </div>

      {/* Main product configuration container */}
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
        
        {/* Dynamic Display Mockup Box */}
        <section className="space-y-6">
          <div className="relative aspect-square rounded-3xl bg-cyber-gray/30 border border-white/5 flex items-center justify-center overflow-hidden p-12 group shadow-[0_0_50px_rgba(0,0,0,0.8)]">
            <div className="absolute inset-0 bg-gradient-to-tr from-cyber-black/80 to-white/5 pointer-events-none" />
            
            {/* Dynamic Product Renderings with user image nested */}
            {customization.productType === 'Digital Wallpaper' ? (
              <div className="relative w-full aspect-[16/10] bg-cyber-black border-4 border-gray-800 rounded-xl overflow-hidden shadow-2xl flex items-center justify-center">
                <img 
                  src={previewImageUrl || customization.imageUrl} 
                  alt="Desktop Wallpaper display" 
                  className="absolute w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 py-2 bg-black/80 border-t border-white/10 text-center text-[8px] font-mono tracking-widest text-gray-400">
                  UHD 8K DIGITAL PREVIEW
                </div>
              </div>
            ) : customization.productType === 'Canvas Print' || customization.productType === 'Poster' ? (
              <div 
                className={cn(
                  "relative bg-white shadow-2xl transition-all duration-300 transform rounded-sm border-b-8 border-r-8 border-black/80",
                  customization.productType === 'Poster' ? "w-64 h-80" : "w-72 h-72"
                )}
                style={{
                  boxShadow: '0 30px 60px -12px rgba(0,0,0,0.9), 0 18px 36px -18px rgba(0,0,0,0.9)'
                }}
              >
                <img 
                  src={previewImageUrl || customization.imageUrl} 
                  alt="Generated artwork nested inside frame" 
                  className="w-full h-full object-cover"
                />
                {customization.productType === 'Poster' && (
                  <div className="absolute inset-0 border-8 border-black/90 pointer-events-none" />
                )}
              </div>
            ) : (
              // Structured overlays for mug, apparel, accessories
              <div className="relative w-full h-full flex items-center justify-center">
                <img 
                  src={previewImageUrl || customization.mockupImageUrl} 
                  alt={customization.productType} 
                  className={cn(
                    "w-full h-full object-contain selection-none pointer-events-none transition-all duration-500"
                  )}
                />
              </div>
            )}

            {/* Quick interactive buttons */}
            <div className="absolute bottom-6 right-6 flex items-center gap-2">
              <button 
                onClick={() => setIsPreviewOpen(true)}
                className="p-3 rounded-full bg-cyber-black/80 border border-white/5 text-gray-400 hover:text-white transition-colors"
                title="View original high-res"
              >
                <Maximize2 size={16} />
              </button>
            </div>

            <div className="absolute bottom-6 left-6 bg-cyber-black/80 border border-white/5 rounded-lg px-3 py-1.5 flex items-center gap-2">
              <Layers size={14} className="text-neon-blue animate-pulse" />
              <span className="text-[9px] font-mono tracking-widest text-[#9ca3af] uppercase">
                {previewLoading ? 'Rendering backend preview' : 'Backend mockup render active'}
              </span>
            </div>
          </div>

          {previewError && (
            <div className="rounded-2xl border border-neon-pink/30 bg-neon-pink/10 px-4 py-3 text-sm text-neon-pink">
              {previewError}
            </div>
          )}

          <div className="rounded-2xl border border-white/10 bg-cyber-black/70 px-4 py-4 text-[10px] uppercase tracking-widest text-gray-400 space-y-2">
            <div className="flex items-center justify-between gap-4">
              <span className="text-neon-blue font-bold">Preview Debug</span>
              <span>{previewLoading ? 'Refreshing render' : 'Render settled'}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[9px]">
              <span>X: {previewResolvedPlacement?.x ?? 'n/a'}</span>
              <span>Y: {previewResolvedPlacement?.y ?? 'n/a'}</span>
              <span>Width: {previewResolvedPlacement?.width ?? 'n/a'}</span>
              <span>Height: {previewResolvedPlacement?.height ?? 'n/a'}</span>
              <span>Scale: {scalePercent}%</span>
              <span>Render ID: {previewRenderId ?? 'n/a'}</span>
            </div>
            <div className="border-t border-white/5 pt-2 text-[9px] break-all normal-case tracking-normal text-gray-500">
              Preview URL: {previewImageUrl || 'n/a'}
            </div>
          </div>

          <div className="glass-card p-6 border-white/5 text-center flex flex-col items-center justify-center">
             <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping mb-3" />
             <p className="text-xs uppercase tracking-wider font-bold text-white mb-1">Generated by you. Printed for you.</p>
             <p className="text-[10px] text-gray-500 uppercase tracking-widest">Turn your customized neural idea into premium wearable and wall-ready art.</p>
          </div>
        </section>

        {/* Configurations Forms sidebar */}
        <section className="flex flex-col h-full justify-between">
          <div>
            <span className="text-[10px] font-mono tracking-[0.4em] text-neon-blue uppercase mb-2 block">
              Configuration Module
            </span>
            <h1 className="text-4xl font-display font-black uppercase tracking-widest text-white mb-2">
              {customization.productType} Setup
            </h1>
            <p className="text-xs text-gray-400 leading-relaxed uppercase tracking-wider max-w-md pb-6 border-b border-white/5">
              Customized wrapping of prompt creation: <span className="text-white">"{customization.userPrompt}"</span>. Your specifications map straight into stateful print queues.
            </p>

            <div className="space-y-8 py-8">
              {customization.basePlacement && (
                <div className="space-y-6 border-b border-white/5 pb-8">
                  <div>
                    <label className="flex items-center gap-2 text-[8px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-3">
                      <Move size={12} />
                      Design Position
                    </label>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <div className="flex items-center justify-between text-[9px] uppercase tracking-widest text-gray-500 mb-2">
                          <span>Horizontal</span>
                          <span>{offsetX > 0 ? `+${offsetX}` : offsetX}px</span>
                        </div>
                        <input
                          type="range"
                          min={-280}
                          max={280}
                          step={10}
                          value={offsetX}
                          onChange={(event) => setOffsetX(Number(event.target.value))}
                          className="w-full accent-[var(--color-neon-blue)]"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-[9px] uppercase tracking-widest text-gray-500 mb-2">
                          <span>Vertical</span>
                          <span>{offsetY > 0 ? `+${offsetY}` : offsetY}px</span>
                        </div>
                        <input
                          type="range"
                          min={-320}
                          max={320}
                          step={10}
                          value={offsetY}
                          onChange={(event) => setOffsetY(Number(event.target.value))}
                          className="w-full accent-[var(--color-neon-purple)]"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-[8px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-3">
                      <Scaling size={12} />
                      Design Size
                    </label>
                    <div className="flex items-center justify-between text-[9px] uppercase tracking-widest text-gray-500 mb-2">
                      <span>Scale</span>
                      <span>{scalePercent}%</span>
                    </div>
                    <input
                      type="range"
                      min={35}
                      max={220}
                      step={5}
                      value={scalePercent}
                      onChange={(event) => setScalePercent(Number(event.target.value))}
                      className="w-full accent-[var(--color-neon-pink)]"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setOffsetX(0);
                      setOffsetY(0);
                      setScalePercent(100);
                    }}
                    className="px-4 py-2 text-[9px] font-extrabold uppercase tracking-widest rounded-lg border border-white/10 bg-white/5 text-gray-300 hover:text-white hover:border-white/20 transition-all"
                  >
                    Reset Placement
                  </button>
                </div>
              )}

              {/* Change Product Colours if available */}
              {customization.colours && customization.colours.length > 0 && (
                <div>
                  <label className="block text-[8px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-3">
                    Select Product Shade
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {customization.colours.map((colour) => (
                      <button
                        key={colour}
                        onClick={() => setSelectedColour(colour)}
                        className={cn(
                          "px-4 py-2 text-[9px] font-extrabold uppercase tracking-widest rounded-lg border transition-all",
                          selectedColour === colour
                            ? "bg-white text-cyber-black border-white"
                            : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                        )}
                      >
                        {colour}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Selection Sizes if available */}
              {customization.sizes && customization.sizes.length > 0 && (
                <div>
                  <label className="block text-[8px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-3">
                    Choose Dimensions / Size
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {customization.sizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={cn(
                          "px-4 py-2.5 text-[9px] font-extrabold uppercase tracking-widest rounded-lg border transition-all",
                          selectedSize === size
                            ? "bg-neon-purple text-white border-neon-purple neon-glow-purple"
                            : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                        )}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity Selector Selector */}
              <div>
                <label className="block text-[8px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-3">
                  Production Quantity
                </label>
                <div className="inline-flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-1.5">
                  <button 
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="w-10 h-10 rounded-lg hover:bg-white/5 text-lg font-bold flex items-center justify-center transition-colors"
                  >
                    -
                  </button>
                  <span className="w-12 text-center text-sm font-mono font-bold">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(q => q + 1)}
                    className="w-10 h-10 rounded-lg hover:bg-white/5 text-lg font-bold flex items-center justify-center transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Quality & Delivery Assurance badges */}
            <div className="grid grid-cols-2 gap-4 pb-8 border-b border-white/5">
              <div className="flex items-start gap-3 bg-white/5 p-4 rounded-xl">
                <Truck className="text-neon-blue mt-0.5" size={16} />
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-white">Rapid Transit Shipped</p>
                  <p className="text-[8px] text-gray-500 uppercase tracking-widest mt-0.5">Delivered in 4-6 business days with tracking.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-white/5 p-4 rounded-xl">
                <ShieldCheck className="text-neon-pink mt-0.5" size={16} />
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-white">Fulfillment Quality Guard</p>
                  <p className="text-[8px] text-gray-500 uppercase tracking-widest mt-0.5">Defect replacements guaranteed or money refunded.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="text-[10px] text-gray-500 uppercase tracking-widest block">Total Cost Price (VAT inc)</span>
                <span className="text-4xl font-display font-black text-white">${totalPrice}</span>
              </div>
              <div className="text-right">
                <span className="text-[8px] text-neon-blue uppercase font-bold tracking-widest bg-neon-blue/10 px-2 py-1 rounded">
                  {quantity > 1 ? `${quantity} items synced` : 'Single Run Item'}
                </span>
              </div>
            </div>

            <button
              onClick={handleConfirmAddToCart}
              disabled={isAdding || isSuccess}
              className={cn(
                "w-full flex items-center justify-center gap-3 py-4 text-xs font-black uppercase tracking-widest text-cyber-black bg-white hover:bg-neon-blue hover:text-white rounded-xl transition-all duration-300",
                isSuccess && "bg-neon-pink text-white neon-glow-pink"
              )}
            >
              {isAdding ? (
                 <>
                   <span className="w-4 h-4 border-2 border-cyber-black border-t-transparent rounded-full animate-spin" />
                   Injecting into Cart Server...
                 </>
              ) : isSuccess ? (
                 <>
                   <Check size={16} />
                   Saved in Cart!
                 </>
              ) : (
                 <>
                   <ShoppingBag size={16} />
                   Save customized item to cart
                 </>
              )}
            </button>
          </div>
        </section>

      </div>

      <ImageModal 
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        imageUrl={previewImageUrl || customization.imageUrl}
        title={`Vision: ${customization.userPrompt}`}
      />
    </div>
  );
}
