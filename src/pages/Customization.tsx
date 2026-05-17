import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  Info
} from 'lucide-react';
import { cn } from '../lib/utils.ts';
import { ImageModal } from '../components/Common.tsx';

export function Customization() {
  const { activeCustomization, addToCart } = useCart();
  const navigate = useNavigate();

  const [selectedColour, setSelectedColour] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [isAdding, setIsAdding] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Initialize selected defaults from active customization
  useEffect(() => {
    if (activeCustomization) {
      if (activeCustomization.colours && activeCustomization.colours.length > 0) {
        setSelectedColour(activeCustomization.colours[0]);
      }
      if (activeCustomization.sizes && activeCustomization.sizes.length > 0) {
        setSelectedSize(activeCustomization.sizes[0]);
      }
    }
  }, [activeCustomization]);

  if (!activeCustomization) {
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
  const totalPrice = (activeCustomization.basePrice * quantity).toFixed(2);

  const handleConfirmAddToCart = () => {
    setIsAdding(true);
    setTimeout(() => {
      const cartItemId = `cart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      addToCart({
        id: cartItemId,
        generatedArtworkId: activeCustomization.artworkId,
        productType: activeCustomization.productType,
        mockupImageUrl: activeCustomization.mockupImageUrl,
        selectedSize: selectedSize,
        selectedColour: selectedColour,
        quantity: quantity,
        price: activeCustomization.basePrice,
        userPrompt: activeCustomization.userPrompt,
        originalImageUrl: activeCustomization.imageUrl
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
            {activeCustomization.productType === 'Digital Wallpaper' ? (
              <div className="relative w-full aspect-[16/10] bg-cyber-black border-4 border-gray-800 rounded-xl overflow-hidden shadow-2xl flex items-center justify-center">
                <img 
                  src={activeCustomization.imageUrl} 
                  alt="Desktop Wallpaper display" 
                  className="absolute w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 py-2 bg-black/80 border-t border-white/10 text-center text-[8px] font-mono tracking-widest text-gray-400">
                  UHD 8K DIGITAL PREVIEW
                </div>
              </div>
            ) : activeCustomization.productType === 'Canvas Print' || activeCustomization.productType === 'Poster' ? (
              <div 
                className={cn(
                  "relative bg-white shadow-2xl transition-all duration-300 transform rounded-sm border-b-8 border-r-8 border-black/80",
                  activeCustomization.productType === 'Poster' ? "w-64 h-80" : "w-72 h-72"
                )}
                style={{
                  boxShadow: '0 30px 60px -12px rgba(0,0,0,0.9), 0 18px 36px -18px rgba(0,0,0,0.9)'
                }}
              >
                <img 
                  src={activeCustomization.imageUrl} 
                  alt="Generated artwork nested inside frame" 
                  className="w-full h-full object-cover"
                />
                {activeCustomization.productType === 'Poster' && (
                  <div className="absolute inset-0 border-8 border-black/90 pointer-events-none" />
                )}
              </div>
            ) : (
              // Structured overlays for mug, apparel, accessories
              <div className="relative w-full h-full flex items-center justify-center">
                {/* Backdrop Template item */}
                <img 
                  src={activeCustomization.mockupImageUrl} 
                  alt={activeCustomization.productType} 
                  className={cn(
                    "w-80 h-80 object-contain selection-none pointer-events-none transition-all duration-500 mix-blend-screen opacity-15 absolute"
                  )}
                />
                {/* Embedded generated image with realistic wrapping */}
                <div 
                  className={cn(
                    "relative z-10 w-24 h-24 overflow-hidden rounded-md border border-white/10 shadow-lg transform rotate-2",
                    selectedColour === 'Midnight Black' && "shadow-[0_0_20px_rgba(0,0,0,0.8)]",
                    selectedColour === 'Cyber Neon Pink' && "border-neon-pink/40 shadow-[0_0_15px_rgba(255,0,127,0.2)]"
                  )}
                >
                  <img 
                    src={activeCustomization.imageUrl} 
                    alt="Wrapping overlay artwork" 
                    className="w-full h-full object-cover"
                  />
                </div>
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
              <span className="text-[9px] font-mono tracking-widest text-[#9ca3af] uppercase">Mock System Engine 1.5</span>
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
              {activeCustomization.productType} Setup
            </h1>
            <p className="text-xs text-gray-400 leading-relaxed uppercase tracking-wider max-w-md pb-6 border-b border-white/5">
              Customized wrapping of prompt creation: <span className="text-white">"{activeCustomization.userPrompt}"</span>. Your specifications map straight into stateful print queues.
            </p>

            <div className="space-y-8 py-8">
              {/* Change Product Colours if available */}
              {activeCustomization.colours && activeCustomization.colours.length > 0 && (
                <div>
                  <label className="block text-[8px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-3">
                    Select Product Shade
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {activeCustomization.colours.map((colour) => (
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
              {activeCustomization.sizes && activeCustomization.sizes.length > 0 && (
                <div>
                  <label className="block text-[8px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-3">
                    Choose Dimensions / Size
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {activeCustomization.sizes.map((size) => (
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
        imageUrl={activeCustomization.imageUrl}
        title={`Vision: ${activeCustomization.userPrompt}`}
      />
    </div>
  );
}
