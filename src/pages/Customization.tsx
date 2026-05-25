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
  Scaling,
  Crop
} from 'lucide-react';
import { cn } from '../lib/utils.ts';
import { ImageModal } from '../components/Common.tsx';
import { createMockupRender } from '../lib/api.ts';
import type { ActiveCustomization, CropOverride, PlacementOverride } from '../types.ts';

const MIN_CROP_SIZE = 12;
const CROP_HANDLE_SIZE = 18;
type CropHandle =
  | 'move'
  | 'n'
  | 's'
  | 'e'
  | 'w'
  | 'ne'
  | 'nw'
  | 'se'
  | 'sw';

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizePlacement(placement: ActiveCustomization['basePlacement']): PlacementOverride | null {
  if (!placement) {
    return null;
  }

  const x = Number(placement.x);
  const y = Number(placement.y);
  const width = Number(placement.width);
  const height = Number(placement.height);
  const cornerRadius = Number(placement.cornerRadius ?? 0);

  if ([x, y, width, height].some((value) => Number.isNaN(value))) {
    return null;
  }

  return {
    x,
    y,
    width,
    height,
    cornerRadius: Number.isNaN(cornerRadius) ? 0 : cornerRadius,
  };
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
  const [previewRenderId, setPreviewRenderId] = useState<number | undefined>(undefined);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [scalePercent, setScalePercent] = useState(100);
  const [cornerRadius, setCornerRadius] = useState(12);
  const [isCropStudioOpen, setIsCropStudioOpen] = useState(false);
  const [isCropDragging, setIsCropDragging] = useState(false);
  const [appliedCropOverride, setAppliedCropOverride] = useState<CropOverride | null>(null);
  const [draftCropRect, setDraftCropRect] = useState<CropOverride>({
    left: 0,
    top: 0,
    width: 100,
    height: 100,
  });
  const [cropStudioImageDimensions, setCropStudioImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [templateDimensions, setTemplateDimensions] = useState<{ width: number; height: number } | null>(null);
  const cropStageRef = useRef<HTMLDivElement | null>(null);
  const cropDragState = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    handle: CropHandle;
    originRect: CropOverride;
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    if (!activeCustomization && routeCustomization) {
      setActiveCustomization(routeCustomization);
    }
  }, [activeCustomization, routeCustomization, setActiveCustomization]);

  // Initialize selected defaults from active customization
  useEffect(() => {
    if (customization) {
      setPreviewRenderId(undefined);
      setPreviewLoading(false);
      setPreviewError(null);
      setTemplateDimensions(null);
      setCropStudioImageDimensions(null);
      setOffsetX(0);
      setOffsetY(0);
      setScalePercent(100);
      setCornerRadius(customization.basePlacement?.cornerRadius ?? 12);
      setIsCropStudioOpen(false);
      setAppliedCropOverride(null);
      setDraftCropRect({ left: 0, top: 0, width: 100, height: 100 });
      if (customization.colours && customization.colours.length > 0) {
        setSelectedColour(customization.colours[0]);
      }
      if (customization.sizes && customization.sizes.length > 0) {
        setSelectedSize(customization.sizes[0]);
      }
    }
  }, [customization]);

  const previewResolvedPlacement = useMemo(() => {
    if (!customization?.basePlacement) {
      return null;
    }

    return {
      x: Math.round(customization.basePlacement.x + offsetX),
      y: Math.round(customization.basePlacement.y + offsetY),
      width: Math.max(80, Math.round(customization.basePlacement.width * (scalePercent / 100))),
      height: Math.max(80, Math.round(customization.basePlacement.height * (scalePercent / 100))),
      cornerRadius: Math.max(0, Math.round(cornerRadius)),
    };
  }, [cornerRadius, customization, offsetX, offsetY, scalePercent]);

  const previewPlacementStyle = useMemo(() => {
    if (!previewResolvedPlacement || !templateDimensions) {
      return null;
    }

    return {
      left: `${(previewResolvedPlacement.x / templateDimensions.width) * 100}%`,
      top: `${(previewResolvedPlacement.y / templateDimensions.height) * 100}%`,
      width: `${(previewResolvedPlacement.width / templateDimensions.width) * 100}%`,
      height: `${(previewResolvedPlacement.height / templateDimensions.height) * 100}%`,
    };
  }, [previewResolvedPlacement, templateDimensions]);

  const cropOverride = appliedCropOverride;
  const hasAppliedCrop = Boolean(
    appliedCropOverride &&
    (
      appliedCropOverride.left !== 0 ||
      appliedCropOverride.top !== 0 ||
      appliedCropOverride.width !== 100 ||
      appliedCropOverride.height !== 100
    )
  );

  const previewDesignImageStyle = useMemo(() => {
    if (!appliedCropOverride) {
      return undefined;
    }

    return {
      width: `${100 / (appliedCropOverride.width / 100)}%`,
      height: `${100 / (appliedCropOverride.height / 100)}%`,
      left: `-${(appliedCropOverride.left / appliedCropOverride.width) * 100}%`,
      top: `-${(appliedCropOverride.top / appliedCropOverride.height) * 100}%`,
    };
  }, [appliedCropOverride]);

  const appliedCropAspectRatio = useMemo(() => {
    if (!appliedCropOverride || !cropStudioImageDimensions) {
      return null;
    }

    const croppedWidth = cropStudioImageDimensions.width * (appliedCropOverride.width / 100);
    const croppedHeight = cropStudioImageDimensions.height * (appliedCropOverride.height / 100);
    if (croppedWidth <= 0 || croppedHeight <= 0) {
      return null;
    }

    return croppedWidth / croppedHeight;
  }, [appliedCropOverride, cropStudioImageDimensions]);

  const previewCropFrameStyle = useMemo(() => {
    if (!hasAppliedCrop || !previewResolvedPlacement || !appliedCropAspectRatio) {
      return null;
    }

    const placementAspectRatio = previewResolvedPlacement.width / previewResolvedPlacement.height;

    if (appliedCropAspectRatio >= placementAspectRatio) {
      return {
        width: '100%',
        aspectRatio: String(appliedCropAspectRatio),
      };
    }

    return {
      height: '100%',
      aspectRatio: String(appliedCropAspectRatio),
    };
  }, [appliedCropAspectRatio, hasAppliedCrop, previewResolvedPlacement]);

  const draftCropPreviewStyle = useMemo(() => ({
    width: `${100 / (draftCropRect.width / 100)}%`,
    height: `${100 / (draftCropRect.height / 100)}%`,
    left: `-${(draftCropRect.left / draftCropRect.width) * 100}%`,
    top: `-${(draftCropRect.top / draftCropRect.height) * 100}%`,
  }), [draftCropRect]);

  const cropStudioAspectRatio = useMemo(() => {
    if (cropStudioImageDimensions) {
      return `${cropStudioImageDimensions.width} / ${cropStudioImageDimensions.height}`;
    }

    return '1 / 1';
  }, [cropStudioImageDimensions]);

  const handleCropPointerDown = (event: React.PointerEvent<HTMLElement>, handle: CropHandle) => {
    const rect = cropStageRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    cropDragState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      handle,
      originRect: draftCropRect,
      width: rect.width || 1,
      height: rect.height || 1,
    };
    setIsCropDragging(true);
    cropStageRef.current?.setPointerCapture(event.pointerId);
  };

  const handleCropPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const activeDrag = cropDragState.current;
    if (!activeDrag || activeDrag.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = ((event.clientX - activeDrag.startX) / activeDrag.width) * 100;
    const deltaY = ((event.clientY - activeDrag.startY) / activeDrag.height) * 100;
    const { originRect, handle } = activeDrag;
    let nextLeft = originRect.left;
    let nextTop = originRect.top;
    let nextWidth = originRect.width;
    let nextHeight = originRect.height;

    if (handle === 'move') {
      nextLeft = clamp(originRect.left + deltaX, 0, 100 - originRect.width);
      nextTop = clamp(originRect.top + deltaY, 0, 100 - originRect.height);
    } else {
      if (handle.includes('e')) {
        nextWidth = clamp(originRect.width + deltaX, MIN_CROP_SIZE, 100 - originRect.left);
      }
      if (handle.includes('s')) {
        nextHeight = clamp(originRect.height + deltaY, MIN_CROP_SIZE, 100 - originRect.top);
      }
      if (handle.includes('w')) {
        nextLeft = clamp(originRect.left + deltaX, 0, originRect.left + originRect.width - MIN_CROP_SIZE);
        nextWidth = originRect.width - (nextLeft - originRect.left);
      }
      if (handle.includes('n')) {
        nextTop = clamp(originRect.top + deltaY, 0, originRect.top + originRect.height - MIN_CROP_SIZE);
        nextHeight = originRect.height - (nextTop - originRect.top);
      }

      nextWidth = clamp(nextWidth, MIN_CROP_SIZE, 100 - nextLeft);
      nextHeight = clamp(nextHeight, MIN_CROP_SIZE, 100 - nextTop);
    }

    setDraftCropRect({
      left: nextLeft,
      top: nextTop,
      width: nextWidth,
      height: nextHeight,
    });
  };

  const handleCropPointerEnd = (event: React.PointerEvent<HTMLElement>) => {
    const activeDrag = cropDragState.current;
    if (activeDrag && activeDrag.pointerId === event.pointerId) {
      cropDragState.current = null;
      setIsCropDragging(false);
      if (cropStageRef.current?.hasPointerCapture(event.pointerId)) {
        cropStageRef.current.releasePointerCapture(event.pointerId);
      }
    }
  };

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
  const previewTemplateUrl = customization.templateBaseImageUrl || customization.mockupImageUrl;
  const supportsLiveTemplatePreview = Boolean(previewTemplateUrl && previewResolvedPlacement);

  const handleConfirmAddToCart = async () => {
    setIsAdding(true);
    setPreviewLoading(true);
    setPreviewError(null);

    try {
      let finalizedMockupUrl = customization.mockupImageUrl;
      let finalizedRenderId = previewRenderId;

      const response = await createMockupRender({
        templateId: customization.templateId,
        artworkId: customization.sourceArtworkId,
        sourceImageUrl: customization.imageUrl,
        sourcePrompt: customization.userPrompt,
        variantColor: selectedColour,
        variantSize: selectedSize,
        placementOverride: previewResolvedPlacement ?? undefined,
        cropOverride,
      });

      finalizedMockupUrl =
        response.render.outputImage || response.render.outputImageUrl || customization.mockupImageUrl;
      finalizedRenderId = response.render.id;
      setPreviewRenderId(response.render.id);

      const cartItemId = `cart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      addToCart({
        id: cartItemId,
        generatedArtworkId: customization.artworkId,
        sourceArtworkId: customization.sourceArtworkId,
        productType: customization.productType,
        mockupImageUrl: finalizedMockupUrl,
        selectedSize: selectedSize,
        selectedColour: selectedColour,
        quantity: quantity,
        price: customization.basePrice,
        templateId: customization.templateId,
        backendRenderId: finalizedRenderId,
        placementOverride: previewResolvedPlacement ?? undefined,
        cropOverride,
        userPrompt: customization.userPrompt,
        originalImageUrl: customization.imageUrl
      });

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        navigate('/cart');
      }, 1500);
    } catch (renderError) {
      console.error('Failed to finalize backend mockup render:', renderError);
      setPreviewError('Could not finalize this mockup right now. Please try again.');
    } finally {
      setPreviewLoading(false);
      setIsAdding(false);
    }
  };

  return (
    <div className="bg-cyber-black text-white min-h-screen">
      {/* Upper Navigation bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
        <Link 
          to="/generator" 
          className="inline-flex items-center gap-2 text-[10px] sm:text-xs uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
        >
          <ChevronLeft size={16} />
          Back to Dream Workspace
        </Link>
      </div>

      {/* Main product configuration container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-start">
        
        {/* Dynamic Display Mockup Box */}
        <section className="space-y-4 lg:space-y-6">
          <div className="sticky top-24 z-20 space-y-3 lg:static lg:space-y-6">
          <div className="rounded-2xl border border-neon-blue/15 bg-neon-blue/5 px-4 py-3 sm:hidden">
            <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-neon-blue">Live Preview</p>
            <p className="mt-1 text-[10px] uppercase tracking-widest text-gray-400">
              Keep adjusting the controls below. Your design updates here instantly.
            </p>
          </div>

          <div className="relative aspect-[4/3] sm:aspect-square rounded-3xl bg-cyber-gray/30 border border-white/5 flex items-center justify-center overflow-hidden p-4 sm:p-8 lg:p-12 group shadow-[0_0_50px_rgba(0,0,0,0.8)]">
            <div className="absolute inset-0 bg-gradient-to-tr from-cyber-black/80 to-white/5 pointer-events-none" />
            
            {/* Dynamic Product Renderings with user image nested */}
            {customization.productType === 'Digital Wallpaper' ? (
              <div className="relative w-full aspect-[16/10] bg-cyber-black border-4 border-gray-800 rounded-xl overflow-hidden shadow-2xl flex items-center justify-center">
                <img 
                  src={customization.imageUrl} 
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
                  src={customization.imageUrl} 
                  alt="Generated artwork nested inside frame" 
                  className="w-full h-full object-cover"
                />
                {customization.productType === 'Poster' && (
                  <div className="absolute inset-0 border-8 border-black/90 pointer-events-none" />
                )}
              </div>
            ) : (
              // Instant local preview for merch templates
              <div className="relative w-full h-full flex items-center justify-center">
                {supportsLiveTemplatePreview ? (
                  <div
                    className={cn(
                      "relative h-full max-h-full w-auto max-w-full selection-none transition-all duration-300",
                      previewLoading && "opacity-60 scale-[0.99]"
                    )}
                    style={{
                      aspectRatio: templateDimensions
                        ? `${templateDimensions.width}/${templateDimensions.height}`
                        : undefined,
                    }}
                  >
                    <img
                      src={previewTemplateUrl}
                      alt={customization.templateName || customization.productType}
                      className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                      onLoad={(event) => {
                        const { naturalWidth, naturalHeight } = event.currentTarget;
                        if (naturalWidth > 0 && naturalHeight > 0) {
                          setTemplateDimensions((current) => {
                            if (
                              current?.width === naturalWidth &&
                              current?.height === naturalHeight
                            ) {
                              return current;
                            }

                            return { width: naturalWidth, height: naturalHeight };
                          });
                        }
                      }}
                    />

                    {previewPlacementStyle && (
                      <div
                        className="absolute overflow-hidden flex items-center justify-center"
                        style={{
                          ...previewPlacementStyle,
                          opacity: 0.96,
                          borderRadius: `${previewResolvedPlacement.cornerRadius ?? 0}px`,
                        }}
                      >
                        {hasAppliedCrop && previewCropFrameStyle ? (
                          <div
                            className="relative overflow-hidden"
                            style={previewCropFrameStyle}
                          >
                            <img
                              src={customization.imageUrl}
                              alt={customization.userPrompt}
                              className="absolute pointer-events-none max-w-none"
                              style={previewDesignImageStyle}
                            />
                          </div>
                        ) : (
                          <img
                            src={customization.imageUrl}
                            alt={customization.userPrompt}
                            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                          />
                        )}
                      </div>
                    )}

                    {customization.templateShadowLayerUrl && (
                      <img
                        src={customization.templateShadowLayerUrl}
                        alt=""
                        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                        aria-hidden="true"
                      />
                    )}

                    {customization.templateHighlightLayerUrl && (
                      <img
                        src={customization.templateHighlightLayerUrl}
                        alt=""
                        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                ) : (
                  <img 
                    src={customization.mockupImageUrl} 
                    alt={customization.productType} 
                    className={cn(
                      "w-full h-full object-contain selection-none pointer-events-none transition-all duration-500",
                      previewLoading && "opacity-30 scale-[0.985]"
                    )}
                  />
                )}
              </div>
            )}

            {previewLoading && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-cyber-black/58 backdrop-blur-[2px]">
                <div className="relative h-16 w-16">
                  <div className="absolute inset-0 rounded-full border-2 border-neon-blue/30" />
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-neon-blue border-r-neon-purple animate-spin" />
                  <div className="absolute inset-3 rounded-full border border-transparent border-b-neon-pink animate-spin [animation-direction:reverse] [animation-duration:1.3s]" />
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-white">
                    Finalizing Mockup
                  </p>
                  <p className="mt-2 text-[9px] uppercase tracking-widest text-gray-400">
                    Saving your chosen placement to the backend
                  </p>
                </div>
              </div>
            )}

            {/* Quick interactive buttons */}
            <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 flex items-center gap-2">
              <button 
                onClick={() => setIsPreviewOpen(true)}
                className="p-2.5 sm:p-3 rounded-full bg-cyber-black/80 border border-white/5 text-gray-400 hover:text-white transition-colors"
                title="View original high-res"
              >
                <Maximize2 size={16} />
              </button>
            </div>

            <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 bg-cyber-black/80 border border-white/5 rounded-lg px-2.5 sm:px-3 py-1.5 flex items-center gap-2 max-w-[70%]">
              <Layers size={14} className="text-neon-blue animate-pulse" />
              <span className="text-[8px] sm:text-[9px] font-mono tracking-widest text-[#9ca3af] uppercase leading-tight">
                {previewLoading ? 'Finalizing backend render' : 'Live preview mode active'}
              </span>
            </div>
          </div>

          {previewError && (
            <div className="rounded-2xl border border-neon-pink/30 bg-neon-pink/10 px-4 py-3 text-sm text-neon-pink">
              {previewError}
            </div>
          )}

          {customization.basePlacement && (
            <div className="lg:hidden glass-card border-white/10 p-4 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-neon-blue">Live Adjustment Deck</p>
                  <p className="mt-1 text-[10px] uppercase tracking-widest text-gray-500">
                    Move and resize the design while this preview stays visible.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setOffsetX(0);
                    setOffsetY(0);
                    setScalePercent(100);
                    setCornerRadius(customization.basePlacement?.cornerRadius ?? 12);
                    setAppliedCropOverride(null);
                    setDraftCropRect({ left: 0, top: 0, width: 100, height: 100 });
                  }}
                  className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[9px] font-extrabold uppercase tracking-widest text-gray-300 transition-all hover:border-white/20 hover:text-white"
                >
                  Reset
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between text-[9px] uppercase tracking-widest text-gray-500">
                    <span className="inline-flex items-center gap-2">
                      <Move size={12} />
                      Horizontal
                    </span>
                    <span>{offsetX > 0 ? `+${offsetX}` : offsetX}px</span>
                  </div>
                  <input
                    type="range"
                    min={-520}
                    max={520}
                    step={10}
                    value={offsetX}
                    onChange={(event) => setOffsetX(Number(event.target.value))}
                    className="w-full accent-[var(--color-neon-blue)]"
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between text-[9px] uppercase tracking-widest text-gray-500">
                    <span className="inline-flex items-center gap-2">
                      <Move size={12} />
                      Vertical
                    </span>
                    <span>{offsetY > 0 ? `+${offsetY}` : offsetY}px</span>
                  </div>
                  <input
                    type="range"
                    min={-620}
                    max={620}
                    step={10}
                    value={offsetY}
                    onChange={(event) => setOffsetY(Number(event.target.value))}
                    className="w-full accent-[var(--color-neon-purple)]"
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between text-[9px] uppercase tracking-widest text-gray-500">
                    <span className="inline-flex items-center gap-2">
                      <Scaling size={12} />
                      Scale
                    </span>
                    <span>{scalePercent}%</span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={320}
                    step={5}
                    value={scalePercent}
                    onChange={(event) => setScalePercent(Number(event.target.value))}
                    className="w-full accent-[var(--color-neon-pink)]"
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between text-[9px] uppercase tracking-widest text-gray-500">
                    <span className="inline-flex items-center gap-2">
                      <Sparkles size={12} />
                      Corner Radius
                    </span>
                    <span>{cornerRadius}px</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={120}
                    step={2}
                    value={cornerRadius}
                    onChange={(event) => setCornerRadius(Number(event.target.value))}
                    className="w-full accent-[var(--color-neon-blue)]"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-col items-start gap-3">
                  <div>
                    <label className="flex items-center gap-2 text-[8px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-2">
                      <Crop size={12} />
                      Design Crop
                    </label>
                    <p className="text-[9px] uppercase tracking-widest text-gray-500">
                      {hasAppliedCrop
                        ? `Crop applied • ${Math.round(appliedCropOverride?.width ?? 100)} by ${Math.round(appliedCropOverride?.height ?? 100)}`
                        : 'Full design is currently visible'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDraftCropRect(appliedCropOverride ?? { left: 0, top: 0, width: 100, height: 100 });
                        setIsCropStudioOpen(true);
                      }}
                      className="px-4 py-2 text-[9px] font-extrabold uppercase tracking-widest rounded-lg border border-white/10 bg-white/5 text-gray-300 hover:text-white hover:border-white/20 transition-all"
                    >
                      {hasAppliedCrop ? 'Edit Crop' : 'Open Crop Studio'}
                    </button>
                    {hasAppliedCrop && (
                      <button
                        type="button"
                        onClick={() => {
                          setAppliedCropOverride(null);
                          setDraftCropRect({ left: 0, top: 0, width: 100, height: 100 });
                        }}
                        className="px-4 py-2 text-[9px] font-extrabold uppercase tracking-widest rounded-lg border border-neon-pink/30 bg-neon-pink/10 text-neon-pink hover:bg-neon-pink hover:text-white transition-all"
                      >
                        Clear Crop
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="glass-card p-6 border-white/5 text-center flex-col items-center justify-center hidden sm:flex">
             <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping mb-3" />
             <p className="text-xs uppercase tracking-wider font-bold text-white mb-1">Generated by you. Printed for you.</p>
             <p className="text-[10px] text-gray-500 uppercase tracking-widest">Turn your customized neural idea into premium wearable and wall-ready art.</p>
          </div>
          </div>
        </section>

        {/* Configurations Forms sidebar */}
        <section className="flex flex-col h-full justify-between">
          <div>
            <span className="text-[10px] font-mono tracking-[0.4em] text-neon-blue uppercase mb-2 block">
              Configuration Module
            </span>
            <h1 className="text-3xl sm:text-4xl font-display font-black uppercase tracking-widest text-white mb-2">
              {customization.productType} Setup
            </h1>
            {/* <p className="text-[10px] sm:text-xs text-gray-400 leading-relaxed uppercase tracking-wider max-w-md pb-6 border-b border-white/5">
              Customized wrapping of prompt creation: <span className="text-white">"{customization.userPrompt}"</span>. Your specifications map straight into stateful print queues.
            </p> */}

            <div className="space-y-6 sm:space-y-8 py-6 sm:py-8">
              {customization.basePlacement && (
                <div className="hidden lg:block space-y-5 sm:space-y-6 border-b border-white/5 pb-6 sm:pb-8">
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
                          min={-520}
                          max={520}
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
                          min={-620}
                          max={620}
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
                      min={20}
                      max={320}
                      step={5}
                      value={scalePercent}
                      onChange={(event) => setScalePercent(Number(event.target.value))}
                      className="w-full accent-[var(--color-neon-pink)]"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-[8px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-3">
                      <Sparkles size={12} />
                      Corner Radius
                    </label>
                    <div className="flex items-center justify-between text-[9px] uppercase tracking-widest text-gray-500 mb-2">
                      <span>Rounded Corners</span>
                      <span>{cornerRadius}px</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={120}
                      step={2}
                      value={cornerRadius}
                      onChange={(event) => setCornerRadius(Number(event.target.value))}
                      className="w-full accent-[var(--color-neon-blue)]"
                    />
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <label className="flex items-center gap-2 text-[8px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-2">
                          <Crop size={12} />
                          Design Crop
                        </label>
                        <p className="text-[9px] uppercase tracking-widest text-gray-500">
                          {hasAppliedCrop
                            ? `Crop applied • ${Math.round(appliedCropOverride?.width ?? 100)} by ${Math.round(appliedCropOverride?.height ?? 100)}`
                            : 'Full design is currently visible'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setDraftCropRect(appliedCropOverride ?? { left: 0, top: 0, width: 100, height: 100 });
                            setIsCropStudioOpen(true);
                          }}
                          className="px-4 py-2 text-[9px] font-extrabold uppercase tracking-widest rounded-lg border border-white/10 bg-white/5 text-gray-300 hover:text-white hover:border-white/20 transition-all"
                        >
                          {hasAppliedCrop ? 'Edit Crop' : 'Open Crop Studio'}
                        </button>
                        {hasAppliedCrop && (
                          <button
                            type="button"
                            onClick={() => {
                              setAppliedCropOverride(null);
                              setDraftCropRect({ left: 0, top: 0, width: 100, height: 100 });
                            }}
                            className="px-4 py-2 text-[9px] font-extrabold uppercase tracking-widest rounded-lg border border-neon-pink/30 bg-neon-pink/10 text-neon-pink hover:bg-neon-pink hover:text-white transition-all"
                          >
                            Clear Crop
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setOffsetX(0);
                      setOffsetY(0);
                      setScalePercent(100);
                      setAppliedCropOverride(null);
                      setDraftCropRect({ left: 0, top: 0, width: 100, height: 100 });
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 text-[9px] font-extrabold uppercase tracking-widest rounded-lg border border-white/10 bg-white/5 text-gray-300 hover:text-white hover:border-white/20 transition-all"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-8 border-b border-white/5">
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

          <div className="pt-6 sm:pt-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
              <div>
                <span className="text-[10px] text-gray-500 uppercase tracking-widest block">Total Cost Price (VAT inc)</span>
                <span className="text-4xl font-display font-black text-white">${totalPrice}</span>
              </div>
              <div className="sm:text-right">
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

      <AnimatePresence>
        {isCropStudioOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overflow-y-auto bg-cyber-black/85 px-4 sm:px-6 py-4 sm:py-10 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              className="relative my-auto mx-auto w-full max-w-5xl rounded-[2rem] border border-white/10 bg-[#090b10] shadow-[0_30px_120px_rgba(0,0,0,0.6)] max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-5rem)] overflow-y-auto"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-white/10 bg-[#090b10]/95 px-5 sm:px-8 py-5 sm:py-6 backdrop-blur-md">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-neon-blue">Crop Studio</p>
                  <h3 className="mt-2 text-2xl font-display font-black uppercase tracking-widest text-white">
                    Focus The Design
                  </h3>
                  <p className="mt-2 text-[10px] uppercase tracking-widest text-gray-500">
                    Zoom and reposition the artwork. Nothing changes until you apply it.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCropStudioOpen(false)}
                  className="rounded-full border border-white/10 px-4 py-2 text-[9px] font-extrabold uppercase tracking-widest text-gray-300 hover:border-white/20 hover:text-white transition-all"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:gap-8 px-5 sm:px-8 py-5 sm:py-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                <div className="space-y-4">
                  <div className="rounded-[1.75rem] border border-white/10 bg-cyber-black/60 p-6">
                    <div
                      ref={cropStageRef}
                      className={cn(
                        "relative mx-auto w-full max-w-2xl overflow-hidden rounded-[1.5rem] border border-dashed border-neon-blue/35 bg-cyber-gray/20 select-none",
                        isCropDragging ? "cursor-grabbing" : "cursor-default"
                      )}
                      style={{ aspectRatio: cropStudioAspectRatio }}
                      onPointerMove={handleCropPointerMove}
                      onPointerUp={handleCropPointerEnd}
                      onPointerCancel={handleCropPointerEnd}
                    >
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06),transparent_68%)]" />
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:18%_18%] opacity-40" />
                      <img
                        src={customization.imageUrl}
                        alt={`${customization.userPrompt} crop preview`}
                        className="absolute inset-0 h-full w-full object-contain pointer-events-none"
                        onLoad={(event) => {
                          const { naturalWidth, naturalHeight } = event.currentTarget;
                          if (naturalWidth > 0 && naturalHeight > 0) {
                            setCropStudioImageDimensions({ width: naturalWidth, height: naturalHeight });
                          }
                        }}
                      />
                      <div
                        className={cn(
                          "absolute rounded-[1.15rem] border-2 border-white/90 bg-white/[0.04] shadow-[0_0_0_9999px_rgba(0,0,0,0.58)] backdrop-blur-[1px]",
                          isCropDragging ? "cursor-grabbing" : "cursor-move"
                        )}
                        style={{
                          left: `${draftCropRect.left}%`,
                          top: `${draftCropRect.top}%`,
                          width: `${draftCropRect.width}%`,
                          height: `${draftCropRect.height}%`,
                        }}
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          handleCropPointerDown(event, 'move');
                        }}
                      >
                        <img
                          src={customization.imageUrl}
                          alt=""
                          aria-hidden="true"
                          className="absolute pointer-events-none max-w-none"
                          style={draftCropPreviewStyle}
                        />
                        <div className="pointer-events-none absolute inset-0 rounded-[1rem] border border-white/25 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]" />
                        <div className="pointer-events-none absolute left-1/3 top-0 bottom-0 border-l border-white/20" />
                        <div className="pointer-events-none absolute left-2/3 top-0 bottom-0 border-l border-white/20" />
                        <div className="pointer-events-none absolute top-1/3 left-0 right-0 border-t border-white/20" />
                        <div className="pointer-events-none absolute top-2/3 left-0 right-0 border-t border-white/20" />

                        {([
                          ['nw', 'left-0 top-0 cursor-nwse-resize -translate-x-1/2 -translate-y-1/2'],
                          ['n', 'left-1/2 top-0 cursor-ns-resize -translate-x-1/2 -translate-y-1/2'],
                          ['ne', 'right-0 top-0 cursor-nesw-resize translate-x-1/2 -translate-y-1/2'],
                          ['e', 'right-0 top-1/2 cursor-ew-resize translate-x-1/2 -translate-y-1/2'],
                          ['se', 'right-0 bottom-0 cursor-nwse-resize translate-x-1/2 translate-y-1/2'],
                          ['s', 'left-1/2 bottom-0 cursor-ns-resize -translate-x-1/2 translate-y-1/2'],
                          ['sw', 'left-0 bottom-0 cursor-nesw-resize -translate-x-1/2 translate-y-1/2'],
                          ['w', 'left-0 top-1/2 cursor-ew-resize -translate-x-1/2 -translate-y-1/2'],
                        ] as const).map(([handle, className]) => (
                          <button
                            key={handle}
                            type="button"
                            className={cn(
                              "absolute rounded-full border-2 border-white bg-cyber-black shadow-[0_0_0_4px_rgba(0,0,0,0.35)]",
                              className
                            )}
                            style={{ width: `${CROP_HANDLE_SIZE}px`, height: `${CROP_HANDLE_SIZE}px` }}
                            onPointerDown={(event) => {
                              event.stopPropagation();
                              handleCropPointerDown(event, handle);
                            }}
                          />
                        ))}
                      </div>
                      <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
                        <span className="rounded-full border border-white/10 bg-cyber-black/75 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.3em] text-gray-300">
                          Drag The Box Or Pull A Handle
                        </span>
                      </div>
                      <div className="absolute inset-0 border border-white/10 pointer-events-none" />
                    </div>
                  </div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-500">
                    Resize from any corner or side to change crop size and aspect ratio. Drag inside the box to reposition it over the artwork.
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-gray-300 mb-3">
                      Crop Box Presets
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: 'Full', rect: { left: 0, top: 0, width: 100, height: 100 } },
                        { label: 'Square', rect: { left: 20, top: 20, width: 60, height: 60 } },
                        { label: 'Portrait', rect: { left: 28, top: 8, width: 44, height: 78 } },
                        { label: 'Wide', rect: { left: 10, top: 26, width: 80, height: 48 } },
                      ].map(({ label, rect }) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => setDraftCropRect(rect)}
                          className={cn(
                            "px-3 py-2 text-[9px] font-extrabold uppercase tracking-widest rounded-lg border transition-all",
                            draftCropRect.left === rect.left &&
                            draftCropRect.top === rect.top &&
                            draftCropRect.width === rect.width &&
                            draftCropRect.height === rect.height
                              ? "bg-white text-cyber-black border-white"
                              : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20"
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-gray-300">
                        Crop Metrics
                      </p>
                      <span className="text-[9px] uppercase tracking-widest text-gray-500">
                        {Math.round(draftCropRect.width)}w / {Math.round(draftCropRect.height)}h
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[9px] uppercase tracking-widest text-gray-500">
                      <span>Left: {Math.round(draftCropRect.left)}%</span>
                      <span>Top: {Math.round(draftCropRect.top)}%</span>
                      <span>Width: {Math.round(draftCropRect.width)}%</span>
                      <span>Height: {Math.round(draftCropRect.height)}%</span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-[10px] uppercase tracking-widest text-gray-500">
                    Press <span className="text-white font-bold">Apply Crop</span> to use this crop.
                    Use <span className="text-white font-bold">Reset</span> to go back to the full design before applying.
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setDraftCropRect({ left: 0, top: 0, width: 100, height: 100 });
                      }}
                      className="px-4 py-3 text-[9px] font-extrabold uppercase tracking-widest rounded-xl border border-white/10 bg-white/5 text-gray-300 hover:text-white hover:border-white/20 transition-all"
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAppliedCropOverride(null);
                        setDraftCropRect({ left: 0, top: 0, width: 100, height: 100 });
                        setIsCropStudioOpen(false);
                      }}
                      className="px-4 py-3 text-[9px] font-extrabold uppercase tracking-widest rounded-xl border border-neon-pink/30 bg-neon-pink/10 text-neon-pink hover:bg-neon-pink hover:text-white transition-all"
                    >
                      Remove Crop
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const nextCrop =
                          draftCropRect.left === 0 &&
                          draftCropRect.top === 0 &&
                          draftCropRect.width === 100 &&
                          draftCropRect.height === 100
                            ? null
                            : draftCropRect;

                        setAppliedCropOverride(nextCrop);
                        setIsCropStudioOpen(false);
                      }}
                      className="ml-auto px-5 py-3 text-[9px] font-black uppercase tracking-widest rounded-xl bg-white text-cyber-black hover:bg-neon-blue hover:text-white transition-all"
                    >
                      Apply Crop
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ImageModal 
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        imageUrl={customization.imageUrl}
        title={`Vision: ${customization.userPrompt}`}
      />
    </div>
  );
}
