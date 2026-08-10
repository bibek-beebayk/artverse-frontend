import { ImgHTMLAttributes, ReactNode, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight, Share2, Copy, Link as LinkIcon, Twitter, Facebook, ExternalLink, Check, Package2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Navbar, Footer } from './Navigation.tsx';
import { cn } from '../lib/utils.ts';
import { getMockupTemplates, getProducts } from '../lib/api.ts';
import { useCart } from '../context/CartContext.tsx';
import { validateSellableSelection } from '../lib/sellableSelection.ts';
import { frontTemplatePart } from '../lib/designProjectMapping.ts';
import type { ActiveCustomization, MockupTemplate, Product } from '../types.ts';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col selection:bg-neon-purple/30">
      <Navbar />
      <main className="flex-grow pt-24">{children}</main>
      <Footer />
    </div>
  );
}

interface SmartImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'className'> {
  className?: string;
  imgClassName?: string;
  loaderClassName?: string;
}

export function SmartImage({
  src,
  alt,
  className,
  imgClassName,
  loaderClassName,
  onLoad,
  onError,
  ...props
}: SmartImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const normalizedSrc = typeof src === 'string' ? src.trim() : src;
  const hasRenderableSrc = typeof normalizedSrc === 'string' ? normalizedSrc.length > 0 : Boolean(normalizedSrc);

  useEffect(() => {
    setIsLoaded(false);
    setHasError(!hasRenderableSrc);
  }, [hasRenderableSrc, src]);

  return (
    <div className={cn('relative overflow-hidden bg-cyber-black/40', className)}>
      {!isLoaded && !hasError && (
        <div
          className={cn(
            'absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-cyber-black/90 text-gray-500',
            loaderClassName
          )}
        >
          <div className="relative h-10 w-10">
            <div className="absolute inset-0 rounded-full border-2 border-neon-blue/40 border-t-neon-blue animate-spin" />
            <div className="absolute inset-[8px] rounded-full border-2 border-neon-purple/30 border-b-neon-purple animate-spin [animation-direction:reverse] [animation-duration:1.4s]" />
          </div>
          <span className="text-[9px] font-bold uppercase tracking-[0.3em]">Loading</span>
        </div>
      )}

      {hasError ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-cyber-black/90 px-4 text-center text-[9px] font-bold uppercase tracking-[0.3em] text-gray-500">
          Image unavailable
        </div>
      ) : null}

      <img
        src={normalizedSrc}
        alt={alt}
        className={cn(
          'transition-opacity duration-300',
          isLoaded && !hasError ? 'opacity-100' : 'opacity-0',
          imgClassName
        )}
        onLoad={(event) => {
          setIsLoaded(true);
          setHasError(false);
          onLoad?.(event);
        }}
        onError={(event) => {
          setHasError(true);
          setIsLoaded(false);
          onError?.(event);
        }}
        {...props}
      />
    </div>
  );
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title: string;
  onNext?: () => void;
  onPrev?: () => void;
  artworkId?: string;
}

export function ImageModal({ isOpen, onClose, imageUrl, title, onNext, onPrev, artworkId }: ModalProps) {
  const navigate = useNavigate();
  const { setActiveCustomization } = useCart();
  const [showPropSelector, setShowPropSelector] = useState(false);
  const [templates, setTemplates] = useState<MockupTemplate[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProps, setLoadingProps] = useState(false);
  const [propsError, setPropsError] = useState<string | null>(null);

  useEffect(() => {
    if (showPropSelector) {
      setLoadingProps(true);
      setPropsError(null);
      Promise.all([getMockupTemplates(), getProducts()])
        .then(([templateItems, productItems]) => {
          setTemplates(templateItems);
          setProducts(productItems);
        })
        .catch((error) => {
          console.error('Failed to load customizable products:', error);
          setPropsError('Customizable products are temporarily unavailable.');
        })
        .finally(() => setLoadingProps(false));
    }
  }, [showPropSelector]);

  const handleTemplateSelect = (template: MockupTemplate) => {
    const product = products.find((candidate) => candidate.mockupTemplateId === template.id);
    const defaultVariant = product?.variants?.find((variant) => variant.isAvailable && variant.isSellable);
    const sellable = validateSellableSelection(product, defaultVariant);
    if (!sellable.selection || !artworkId) {
      return;
    }

    const templateFrontPart = frontTemplatePart(template);

    const customization: ActiveCustomization = {
      artworkId,
      sourceArtworkId: Number(artworkId),
      userPrompt: title,
      imageUrl,
      templateId: template.id,
      templateName: template.name,
      productType: template.productTypeDisplay,
      productId: Number(sellable.selection.product.id),
      selectedVariantId: sellable.selection.variant.id,
      mockupImageUrl: templateFrontPart?.baseImage || '',
      templateBaseImageUrl: templateFrontPart?.baseImage ?? null,
      templateMaskImageUrl: templateFrontPart?.maskImage ?? null,
      templateShadowLayerUrl: templateFrontPart?.shadowLayer ?? null,
      templateHighlightLayerUrl: templateFrontPart?.highlightLayer ?? null,
      templateParts: template.parts,
      startingPrice: sellable.selection.startingPrice,
      sizes:
        sellable.selection.product.availableSizes?.length
          ? sellable.selection.product.availableSizes
          : [...template.supportedSizes],
      colours:
        sellable.selection.product.availableColors?.length
          ? sellable.selection.product.availableColors
          : [...template.supportedColors],
      basePlacement: null,
      textElements: [],
      partsConfig: {},
    };

    setActiveCustomization(customization);
    onClose();
    navigate('/customize');
  };

  useEffect(() => {
    if (!isOpen) {
      setShowPropSelector(false);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && onNext) {
        onNext();
      } else if (e.key === 'ArrowLeft' && onPrev) {
        onPrev();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onNext, onPrev]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-12"
        >
          <motion.div 
             className="absolute inset-0 bg-cyber-black/95 backdrop-blur-2xl"
             onClick={onClose}
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative z-[101] max-w-5xl w-full h-full flex flex-col items-center justify-center"
          >
            <button 
              onClick={onClose}
              className="absolute right-0 top-0 z-[102] hidden sm:flex text-white/50 hover:text-white transition-colors items-center gap-2 group p-2"
            >
              <span className="text-xs uppercase tracking-[0.2em]">Close</span>
              <X size={24} className="group-hover:rotate-90 transition-transform" />
            </button>

            <button
              onClick={onClose}
              className="absolute top-3 right-3 z-[102] sm:hidden flex items-center justify-center h-11 w-11 rounded-full bg-cyber-black/85 border border-white/15 text-white shadow-lg backdrop-blur-md"
              aria-label="Close fullscreen image"
            >
              <X size={20} />
            </button>
            
            <div className="relative w-full h-full glass-card overflow-hidden flex items-center justify-center border-white/20">
              {showPropSelector ? (
                <div className="absolute inset-0 z-[110] bg-cyber-black/95 backdrop-blur-xl flex flex-col p-8 items-center overflow-y-auto">
                  <button onClick={(e) => { e.stopPropagation(); setShowPropSelector(false); }} className="absolute top-4 right-4 text-white/50 hover:text-white bg-white/10 rounded-full p-2">
                    <X size={24} />
                  </button>
                  <h3 className="text-2xl font-display font-bold uppercase tracking-widest text-white mb-8 mt-8">Select a Prop Template</h3>
                  {loadingProps ? (
                    <div className="text-neon-blue uppercase tracking-widest text-xs animate-pulse">Loading templates...</div>
                  ) : propsError ? (
                    <div className="text-center text-xs uppercase tracking-widest text-red-300">{propsError}</div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 max-w-4xl w-full">
                      {templates.map((template) => {
                        const hasSellableProduct = products.some(
                          (product) => product.mockupTemplateId === template.id
                        );
                        return (
                          <button
                            key={template.id}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleTemplateSelect(template);
                            }}
                            disabled={!hasSellableProduct}
                            title={
                              hasSellableProduct
                                ? `Customize ${template.productTypeDisplay}`
                                : 'No sellable product is currently mapped to this template.'
                            }
                            className={cn(
                              'glass-card p-4 flex flex-col items-center transition-all group border border-white/10',
                              hasSellableProduct
                                ? 'hover:border-neon-blue'
                                : 'cursor-not-allowed opacity-40'
                            )}
                          >
                            <img
                              src={frontTemplatePart(template)?.baseImage || ''}
                              alt=""
                              className="w-24 h-24 object-contain mb-4 group-hover:scale-110 transition-transform"
                            />
                            <span className="text-[10px] uppercase tracking-widest font-bold text-white text-center">
                              {template.productTypeDisplay}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {onPrev && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPrev();
                      }}
                      className="absolute left-2 sm:left-4 z-[103] p-2 sm:p-3 rounded-full bg-cyber-black/50 hover:bg-cyber-black/80 text-white/50 hover:text-white backdrop-blur-md transition-all border border-white/10 flex items-center justify-center group"
                    >
                      <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8 group-hover:-translate-x-1 transition-transform" />
                    </button>
                  )}
                  {onNext && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNext();
                      }}
                      className="absolute right-2 sm:right-4 z-[103] p-2 sm:p-3 rounded-full bg-cyber-black/50 hover:bg-cyber-black/80 text-white/50 hover:text-white backdrop-blur-md transition-all border border-white/10 flex items-center justify-center group"
                    >
                      <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8 group-hover:translate-x-1 transition-transform" />
                    </button>
                  )}
                  <SmartImage
                    src={imageUrl}
                    alt={title}
                    className="w-full h-full bg-transparent"
                    imgClassName="max-w-full max-h-full object-contain mx-auto"
                    loaderClassName="bg-cyber-black"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                  
                  <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-8 pt-16 sm:pt-20 bg-gradient-to-t from-cyber-black to-transparent flex justify-between items-end pointer-events-none">
                    <div className="pointer-events-auto">
                        <h3 className="text-lg sm:text-2xl font-display font-bold text-white tracking-widest uppercase mb-2 pr-14 sm:pr-0">
                          {title}
                        </h3>
                        <div className="h-1 w-20 bg-neon-purple neon-glow-purple" />
                    </div>
                    {artworkId && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setShowPropSelector(true); }}
                        className="flex items-center gap-2 bg-neon-blue text-cyber-black px-4 py-2 sm:px-6 sm:py-3 rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-xs hover:bg-white transition-colors pointer-events-auto shadow-[0_0_20px_rgba(0,195,255,0.3)]"
                      >
                        <Package2 size={16} />
                        Use Design
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  artworkTitle: string;
}

export function ShareModal({ isOpen, onClose, artworkTitle }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = window.location.href;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center p-6"
        >
          <motion.div 
            className="absolute inset-0 bg-cyber-black/80 backdrop-blur-md"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative z-[111] max-w-md w-full glass-card p-8 border-white/20"
          >
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <h3 className="text-2xl font-display font-bold text-white uppercase tracking-widest mb-2">
              Share <span className="text-neon-blue">Artifact</span>
            </h3>
            <p className="text-gray-400 text-sm mb-8 font-light italic">"{artworkTitle}"</p>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Direct Link</label>
                <div className="flex gap-2">
                  <div className="flex-grow bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs truncate font-mono">
                    {shareUrl}
                  </div>
                  <button 
                    onClick={handleCopy}
                    className="bg-neon-blue text-cyber-black p-3 rounded-xl hover:bg-white transition-all flex items-center justify-center min-w-[48px]"
                  >
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1 mb-4 block">Social Network</label>
                <div className="grid grid-cols-3 gap-4">
                  <button className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-neon-blue transition-colors group">
                    <Twitter size={20} className="text-gray-400 group-hover:text-neon-blue" />
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest">Twitter</span>
                  </button>
                  <button className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-neon-purple transition-colors group">
                    <Facebook size={20} className="text-gray-400 group-hover:text-neon-purple" />
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest">Meta</span>
                  </button>
                  <button className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-neon-pink transition-colors group">
                    <ExternalLink size={20} className="text-gray-400 group-hover:text-neon-pink" />
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest">Other</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const visiblePages = Array.from({ length: totalPages }, (_, index) => index + 1).filter((page) => {
    if (totalPages <= 7) {
      return true;
    }

    if (page === 1 || page === totalPages) {
      return true;
    }

    return Math.abs(page - currentPage) <= 1;
  });

  return (
    <div className="mt-16">
      <div className="flex items-center justify-between gap-3 sm:hidden">
        <button
          type="button"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Previous page"
          className="h-11 min-w-11 rounded-xl glass-card px-4 flex items-center justify-center gap-2 text-white disabled:opacity-20 disabled:cursor-not-allowed hover:border-white/30 transition-all"
        >
          <ChevronLeft size={18} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Prev</span>
        </button>

        <div className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center font-mono text-xs text-white">
          {currentPage.toString().padStart(2, '0')} / {totalPages.toString().padStart(2, '0')}
        </div>

        <button
          type="button"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Next page"
          className="h-11 min-w-11 rounded-xl glass-card px-4 flex items-center justify-center gap-2 text-white disabled:opacity-20 disabled:cursor-not-allowed hover:border-white/30 transition-all"
        >
          <span className="text-[10px] font-bold uppercase tracking-widest">Next</span>
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="hidden sm:flex items-center justify-center gap-4">
        <button
          type="button"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Previous page"
          className="w-12 h-12 rounded-xl glass-card flex items-center justify-center text-white disabled:opacity-20 disabled:cursor-not-allowed hover:border-white/30 transition-all"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="flex items-center gap-2 flex-wrap justify-center">
          {visiblePages.map((page, index) => {
            const previousPage = visiblePages[index - 1];
            const needsGap = previousPage !== undefined && page - previousPage > 1;

            return (
              <div key={page} className="flex items-center gap-2">
                {needsGap ? (
                  <span className="px-2 text-xs font-mono text-gray-500" aria-hidden="true">...</span>
                ) : null}
                <button
                  type="button"
                  onClick={() => onPageChange(page)}
                  aria-label={`Page ${page}`}
                  aria-current={currentPage === page ? 'page' : undefined}
                  className={cn(
                    "w-12 h-12 rounded-xl font-mono text-sm border transition-all",
                    currentPage === page
                      ? "bg-white text-cyber-black border-white font-bold"
                      : "bg-white/5 text-gray-400 border-white/10 hover:border-white/30"
                  )}
                >
                  {page.toString().padStart(2, '0')}
                </button>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Next page"
          className="w-12 h-12 rounded-xl glass-card flex items-center justify-center text-white disabled:opacity-20 disabled:cursor-not-allowed hover:border-white/30 transition-all"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
