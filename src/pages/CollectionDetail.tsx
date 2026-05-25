import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext.tsx';
import { ImageModal, ShareModal, SmartImage } from '../components/Common.tsx';
import { cn } from '../lib/utils.ts';
import { getArtworks, getCollections } from '../lib/api.ts';
import type { Artwork, CollectionSummary } from '../types.ts';
import { 
  Download, 
  Printer, 
  ShoppingBag, 
  Sparkles, 
  Heart, 
  Share2, 
  Maximize2, 
  Info, 
  Check, 
  TrendingUp, 
  ShieldCheck, 
  Layers
} from 'lucide-react';

type ProductFilter = 'All' | 'Wallpaper' | 'T-Shirt' | 'Canvas' | 'Mug' | 'Poster' | 'Digital Download';

export function CollectionDetail() {
  const { collectionId } = useParams<{ collectionId: string }>();
  const { isFavorited, toggleFavorite } = useAuth();
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedFilter, setSelectedFilter] = useState<ProductFilter>('All');
  const [selectedArt, setSelectedArt] = useState<Artwork | null>(null);
  const [shareArt, setShareArt] = useState<Artwork | null>(null);
  
  // Print Simulator Modal State
  const [printSimulatorArt, setPrintSimulatorArt] = useState<Artwork | null>(null);
  const [simulatedProduct, setSimulatedProduct] = useState<'Canvas' | 'Poster' | 'T-Shirt' | 'Mug'>('Canvas');
  const [simulatedSize, setSimulatedSize] = useState<string>('18" x 24"');
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [cartAdded, setCartAdded] = useState(false);

  useEffect(() => {
    const loadCollectionDetail = async () => {
      if (!collectionId) {
        setLoading(false);
        return;
      }

      try {
        const [collectionItems, artworkItems] = await Promise.all([
          getCollections(),
          getArtworks({ collectionSlug: collectionId }),
        ]);
        setCollections(collectionItems);
        setArtworks(artworkItems);
      } catch (error) {
        console.error('Failed to load collection detail:', error);
        setCollections([]);
        setArtworks([]);
      } finally {
        setLoading(false);
      }
    };

    void loadCollectionDetail();
  }, [collectionId]);

  // Find Category Metadata
  const categoryMeta = useMemo(() => {
    return collections.find((collection) => collection.slug === collectionId);
  }, [collectionId, collections]);

  // Filter artworks under this category
  const categoryArtworks = useMemo(() => {
    if (!categoryMeta) return [];
    return artworks;
  }, [artworks, categoryMeta]);

  // Filter based on suitability
  const filteredArtworks = useMemo(() => {
    if (selectedFilter === 'All') return categoryArtworks;
    return categoryArtworks.filter(art => art.suitableProducts.includes(selectedFilter));
  }, [categoryArtworks, selectedFilter]);

  const heroImageUrl = categoryArtworks[0]?.imageUrl || 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&q=80&w=1600';

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-32 text-center">
        <p className="text-gray-500 uppercase tracking-widest text-sm">Loading collection</p>
      </div>
    );
  }

  if (!categoryMeta) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-32 text-center">
        <h2 className="text-3xl font-display font-bold text-white uppercase tracking-widest mb-4">Collection Not Found</h2>
        <p className="text-gray-500 mb-8 max-w-sm mx-auto">This stellar quadrant cannot be reached. It may have been archived or decrypted.</p>
        <Link to="/" className="inline-flex items-center gap-2 px-8 py-4 bg-neon-purple text-white font-bold uppercase tracking-widest rounded-full hover:neon-glow-purple transition-all">
          Return Home
        </Link>
      </div>
    );
  }

  const triggerDownload = (art: Artwork) => {
    // Generate simulated download
    const link = document.createElement('a');
    link.href = art.wallpaperDownloadUrl;
    link.target = '_blank';
    link.download = `${art.title}-Artverse-Wallpaper.jpg`;
    link.click();
  };

  const handleAddToCartSimulate = () => {
    setIsAddingToCart(true);
    setTimeout(() => {
      setIsAddingToCart(false);
      setCartAdded(true);
      setTimeout(() => setCartAdded(false), 3000);
    }, 1000);
  };

  return (
    <div className="bg-cyber-black min-h-screen text-white">
      {/* Category Hero Banner */}
      <section className="relative px-6 py-24 md:py-32 flex flex-col justify-center border-b border-white/5 overflow-hidden">
        <div className="absolute inset-0">
          <SmartImage
            src={heroImageUrl}
            alt={categoryMeta.name}
            className="w-full h-full"
            imgClassName="w-full h-full object-cover opacity-20 filter blur-sm scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-cyber-black via-cyber-black/70 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.9)_100%)]" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto text-center">
          <span className="inline-block px-3 py-1 rounded bg-neon-purple/20 border border-neon-purple/30 text-neon-purple text-[10px] uppercase tracking-[0.4em] font-bold mb-6">
            Interactive Premium Collection
          </span>
          <h1 className="text-5xl md:text-8xl font-display font-black text-white tracking-widest uppercase mb-6 leading-none">
            {categoryMeta.name}
          </h1>
          <p className="text-gray-400 text-sm md:text-md max-w-2xl mx-auto mb-6 leading-relaxed uppercase tracking-wider">
            {categoryMeta.description}
          </p>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Product Filtering Hub */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 pb-8 mb-16 gap-6">
          <div>
            <h2 className="text-lg font-display uppercase tracking-widest font-black text-white">Marketplace Filter</h2>
            <p className="text-xs text-gray-500 uppercase tracking-widest font-mono">Filter by suitable physical print or digital format</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(['All', 'Wallpaper', 'T-Shirt', 'Canvas', 'Mug', 'Poster', 'Digital Download'] as ProductFilter[]).map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                className={cn(
                  "px-4 py-2 rounded-lg border text-[10px] font-bold uppercase tracking-widest transition-all",
                  selectedFilter === filter
                    ? "bg-neon-blue border-neon-blue text-cyber-black neon-glow-blue font-black"
                    : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20"
                )}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Artworks Gallery Grid & Print Integration */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
          
          {/* Bento-style Conversion Prompts (Left Sidebar) */}
          <div className="lg:col-span-1 space-y-8 lg:sticky lg:top-28">
            <div className="glass-card p-6 border-white/5 relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-neon-pink/10 rounded-full blur-xl group-hover:scale-125 transition-transform" />
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-lg bg-neon-pink/15 border border-neon-pink/20 flex items-center justify-center text-neon-pink">
                  <Download size={18} />
                </div>
                <h3 className="font-display font-medium uppercase tracking-wider text-sm">Made for Wallpapers</h3>
              </div>
              <p className="text-xs text-gray-500 uppercase leading-relaxed mb-4">
                Full ultra-wide and mobile aspect ratios optimized for pixel-perfect digital displays. All purchases unlock raw 4K & 8K renders.
              </p>
              <div className="h-[1px] bg-white/5 mb-4" />
              <div className="bg-white/5 px-3 py-2 rounded text-[10px] text-gray-400 font-mono flex justify-between uppercase">
                <span>Rendering Quality</span>
                <span className="text-neon-pink">Ultra 8K / UHD</span>
              </div>
            </div>

            <div className="glass-card p-6 border-white/5 relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-neon-purple/10 rounded-full blur-xl group-hover:scale-125 transition-transform" />
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-lg bg-neon-purple/15 border border-neon-purple/20 flex items-center justify-center text-neon-purple">
                  <Printer size={18} />
                </div>
                <h3 className="font-display font-medium uppercase tracking-wider text-sm">Ready for Print</h3>
              </div>
              <p className="text-xs text-gray-500 uppercase leading-relaxed mb-4">
                Direct print-on-demand connections. Instantly map designs to museum-quality posters, premium canvas boards, or luxury acrylics.
              </p>
              <div className="h-[1px] bg-white/5 mb-4" />
              <div className="bg-white/5 px-3 py-2 rounded text-[10px] text-gray-400 font-mono flex justify-between uppercase">
                <span>Color Accuracy</span>
                <span className="text-neon-purple">ICC Standard v4</span>
              </div>
            </div>

            <div className="glass-card p-6 border-white/5 relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-neon-blue/10 rounded-full blur-xl group-hover:scale-125 transition-transform" />
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-lg bg-neon-blue/15 border border-neon-blue/20 flex items-center justify-center text-neon-blue">
                  <ShoppingBag size={18} />
                </div>
                <h3 className="font-display font-medium uppercase tracking-wider text-sm">Perfect for Apparel</h3>
              </div>
              <p className="text-xs text-gray-500 uppercase leading-relaxed mb-4">
                Vibrant pigment mapping for oversized tees, heavyweight hoodies, and customized premium streetwear. Double-stitched and pre-shrunk ready.
              </p>
              <div className="h-[1px] bg-white/5 mb-4" />
              <div className="bg-white/5 px-3 py-2 rounded text-[10px] text-gray-400 font-mono flex justify-between uppercase">
                <span>Textile Specs</span>
                <span className="text-neon-blue">Heavyweight Cotton</span>
              </div>
            </div>

            <div className="glass-card p-6 border-white/5 relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/5 rounded-full blur-xl group-hover:scale-125 transition-transform" />
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white">
                  <Sparkles size={18} />
                </div>
                <h3 className="font-display font-medium uppercase tracking-wider text-sm">Premium AI Collectibles</h3>
              </div>
              <p className="text-xs text-gray-500 uppercase leading-relaxed mb-4">
                Verified limited runs. Each artwork registers unique ownership stamps on metadata servers, delivering collectible digital scarcity.
              </p>
              <div className="h-[1px] bg-white/5 mb-4" />
              <div className="bg-white/5 px-3 py-2 rounded text-[10px] text-gray-400 font-mono flex justify-between uppercase">
                <span>Unique Runs</span>
                <span className="text-white">Max 50 Prints</span>
              </div>
            </div>
          </div>

          {/* Interactive Artwork Gallery (Right Area) */}
          <div className="lg:col-span-2">
            {filteredArtworks.length === 0 ? (
              <div className="py-24 text-center glass-card border-dashed border-white/10">
                <TrendingUp size={48} className="mx-auto text-gray-600 mb-6" />
                <h3 className="text-lg font-display uppercase tracking-widest text-white mb-2">No Matching Prints Found</h3>
                <p className="text-xs text-gray-500 uppercase tracking-widest">Adjust filters or select another Artverse drop collection</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <AnimatePresence mode="popLayout" initial={false}>
                  {filteredArtworks.map((art) => (
                    <motion.div
                      layout
                      key={art.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      whileHover={{ y: -5 }}
                      className="group flex flex-col h-full bg-cyber-gray/30 border border-white/5 rounded-2xl overflow-hidden hover:border-neon-purple/50 transition-all duration-300"
                    >
                      {/* Image Viewer Frame */}
                      <div className="relative aspect-square overflow-hidden bg-cyber-black">
                        <SmartImage
                          src={art.thumbnailUrl || art.imageUrl}
                          alt={art.title}
                          className="w-full h-full"
                          imgClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-cyber-black/0 group-hover:bg-cyber-black/60 transition-all flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 p-8 gap-4">
                          <button 
                            onClick={() => setSelectedArt(art)}
                            className="p-3 bg-neon-purple rounded-full text-white hover:bg-white hover:text-cyber-black transition-colors transform group-hover:scale-110"
                          >
                            <Maximize2 size={18} />
                          </button>
                        </div>

                        {/* Top Action Tags */}
                        <div className="absolute top-4 left-4 flex gap-2">
                          {art.isPremium && (
                            <span className="bg-neon-pink text-white text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded neon-glow-pink">
                              Premium
                            </span>
                          )}
                          <span className="bg-cyber-black/80 border border-white/10 text-neon-blue text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded">
                            {art.price}
                          </span>
                        </div>
                      </div>

                      {/* Content Frame */}
                      <div className="p-6 flex flex-col flex-grow">
                        <h3 className="text-xl font-display font-bold text-white uppercase tracking-wider mb-2">
                          {art.title}
                        </h3>
                        <p className="text-xs text-gray-400 mb-6 flex-grow leading-relaxed uppercase tracking-wider">
                          {art.description}
                        </p>

                        {/* Suitability Badges */}
                        <div className="flex flex-wrap gap-1.5 mb-6">
                          {art.suitableProducts.map((p) => (
                            <span key={p} className="text-[8px] uppercase tracking-widest bg-white/5 px-2.5 py-1 rounded text-gray-500 font-mono">
                              {p}
                            </span>
                          ))}
                        </div>

                        {/* Multi-Call-To-Actions */}
                        <div className="space-y-2 mt-auto">
                          <button
                            onClick={() => triggerDownload(art)}
                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-white/5 border border-white/15 hover:border-white rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
                          >
                            <Download size={14} className="text-neon-pink" />
                            Download Wallpapers
                          </button>

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => setPrintSimulatorArt(art)}
                              className="flex items-center justify-center gap-2 py-2.5 bg-neon-blue text-cyber-black hover:bg-white hover:text-cyber-black rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                              <Printer size={12} />
                              Print Design
                            </button>
                            <Link
                              to="/shop"
                              className="flex items-center justify-center gap-2 py-2.5 bg-white text-cyber-black hover:bg-neon-purple hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                              <ShoppingBag size={12} />
                              View Product
                            </Link>
                          </div>

                          {/* Quick interactions */}
                          <div className="flex justify-between items-center pt-3 border-t border-white/5 text-[10px]">
                            <button 
                              onClick={() => toggleFavorite({ id: art.id, title: art.title, imageUrl: art.imageUrl })}
                              className={cn(
                                "flex items-center gap-1 hover:text-neon-pink transition-colors",
                                isFavorited(art.id) ? "text-neon-pink" : "text-gray-500"
                              )}
                            >
                              <Heart size={12} className={isFavorited(art.id) ? 'fill-current' : ''} />
                              {isFavorited(art.id) ? 'Saved' : 'Save'}
                            </button>
                            <button 
                              onClick={() => setShareArt(art)}
                              className="flex items-center gap-1 text-gray-500 hover:text-neon-blue transition-colors"
                            >
                              <Share2 size={12} />
                              Share
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Print-on-Demand Interactive Simulator Modal */}
      <AnimatePresence>
        {printSimulatorArt && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-cyber-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative max-w-4xl w-full bg-cyber-gray border border-white/10 rounded-3xl p-8 flex flex-col md:flex-row gap-8 shadow-[0_0_50px_rgba(0,195,255,0.15)]"
            >
              {/* Close button */}
              <button 
                onClick={() => setPrintSimulatorArt(null)}
                className="absolute top-6 right-6 text-gray-400 hover:text-white"
              >
                ✕
              </button>

              {/* Mockup Simulator Frame */}
              <div className="md:w-1/2 flex flex-col items-center justify-center">
                <div className="relative w-full aspect-square bg-cyber-black rounded-2xl border border-white/5 flex items-center justify-center p-8 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-tr from-cyber-black to-white/5 pointer-events-none" />
                  
                  {/* Mock Simulator Engine Rendering */}
                  {simulatedProduct === 'Canvas' && (
                    <div className="relative shadow-2xl skew-x-3 scale-95 border-b-4 border-r-4 border-cyber-black select-none pointer-events-none transition-all duration-300">
                      <img 
                        src={printSimulatorArt.imageUrl} 
                        alt="Simulated on Canvas" 
                        className="w-56 h-56 object-cover"
                      />
                    </div>
                  )}

                  {simulatedProduct === 'Poster' && (
                    <div className="relative shadow-md border-4 border-white select-none pointer-events-none transition-all duration-300">
                      <img 
                        src={printSimulatorArt.imageUrl} 
                        alt="Simulated on Poster" 
                        className="w-48 h-64 object-cover"
                      />
                    </div>
                  )}

                  {simulatedProduct === 'T-Shirt' && (
                    <div className="relative text-center select-none pointer-events-none transition-all duration-300">
                      <img 
                        src="https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=300"
                        alt="T-shirt mockup backdrop"
                        className="w-64 mix-blend-screen opacity-20 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                      />
                      <img 
                        src={printSimulatorArt.imageUrl} 
                        alt="Simulated on T-Shirt" 
                        className="w-20 h-20 object-cover rounded-md border border-white/5 mx-auto relative z-10"
                      />
                    </div>
                  )}

                  {simulatedProduct === 'Mug' && (
                    <div className="relative text-center select-none pointer-events-none transition-all duration-300">
                      <img 
                        src="https://images.unsplash.com/photo-1572113173140-5152ee53f8af?auto=format&fit=crop&q=80&w=300"
                        alt="Mug mockup backdrop"
                        className="w-56 mix-blend-screen opacity-20 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                      />
                      <img 
                        src={printSimulatorArt.imageUrl} 
                        alt="Simulated on Mug" 
                        className="w-16 h-16 object-cover rounded-full border border-white/5 mx-auto relative z-10 translate-y-3"
                      />
                    </div>
                  )}

                  <div className="absolute bottom-4 left-4 bg-cyber-black/80 border border-white/10 rounded-lg px-3 py-1.5 flex items-center gap-2">
                    <Layers size={12} className="text-neon-blue animate-pulse" />
                    <span className="text-[8px] font-mono tracking-widest text-[#9ca3af] uppercase">Mock Simulator 1.4</span>
                  </div>
                </div>
              </div>

              {/* Settings and Configs */}
              <div className="md:w-1/2 flex flex-col">
                <div className="mb-4">
                  <span className="text-neon-blue text-[8px] font-mono tracking-widest uppercase mb-1 block">PRINT-ON-DEMAND WORKSHOP</span>
                  <h3 className="text-2xl font-display font-bold uppercase tracking-widest text-white">{printSimulatorArt.title}</h3>
                  <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Configure physical print settings mapped via Printify APIs</p>
                </div>

                <div className="border-t border-b border-white/5 py-4 my-4 space-y-6">
                  {/* Select Product */}
                  <div>
                    <label className="block text-[8px] font-bold text-gray-400 uppercase tracking-wider mb-2">Configure Product Type</label>
                    <div className="grid grid-cols-4 gap-2">
                      {(['Canvas', 'Poster', 'T-Shirt', 'Mug'] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => setSimulatedProduct(type)}
                          className={cn(
                            "py-2 rounded-lg border text-[8px] font-bold uppercase tracking-widest transition-all",
                            simulatedProduct === type
                              ? "bg-neon-blue border-neon-blue text-cyber-black font-black"
                              : "bg-white/5 border-white/10 hover:border-white/20 text-gray-400"
                          )}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sizes */}
                  <div>
                    <label className="block text-[8px] font-bold text-gray-400 uppercase tracking-wider mb-2">Print Dimensions / Sizes</label>
                    <div className="flex gap-2">
                      {['12" x 16"', '18" x 24"', '24" x 36"'].map((size) => (
                        <button
                          key={size}
                          onClick={() => setSimulatedSize(size)}
                          className={cn(
                            "px-3 py-1.5 rounded border text-[8px] font-bold uppercase tracking-widest transition-all",
                            simulatedSize === size
                              ? "bg-neon-purple border-neon-purple text-white font-bold"
                              : "bg-white/5 border-white/10 hover:border-white/20 text-gray-400"
                          )}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Simulated Order Submission */}
                <div className="mt-auto">
                  <div className="flex justify-between items-end mb-6">
                    <div>
                      <span className="text-[8px] text-gray-500 uppercase tracking-widest block">Estimated Cost</span>
                      <span className="text-3xl font-display font-black text-white">{printSimulatorArt.price}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[8px] text-gray-500 uppercase tracking-widest block">Shipped From</span>
                      <span className="text-[10px] text-neon-blue uppercase font-bold tracking-widest">San Francisco, CA</span>
                    </div>
                  </div>

                  <button
                    onClick={handleAddToCartSimulate}
                    disabled={isAddingToCart || cartAdded}
                    className={cn(
                      "w-full flex items-center justify-center gap-3 py-4 bg-white text-cyber-black hover:bg-neon-blue hover:text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                      cartAdded && "bg-neon-pink text-white neon-glow-pink hover:bg-neon-pink"
                    )}
                  >
                    {isAddingToCart ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        Syncing with POD Server...
                      </>
                    ) : cartAdded ? (
                      <>
                        <Check size={14} />
                        Fulfillment Added!
                      </>
                    ) : (
                      <>
                        <Printer size={14} />
                        Add to Print Order
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ImageModal 
        isOpen={!!selectedArt}
        onClose={() => setSelectedArt(null)}
        imageUrl={selectedArt?.imageUrl || ''}
        title={selectedArt?.title || ''}
      />

      <ShareModal 
        isOpen={!!shareArt}
        onClose={() => setShareArt(null)}
        artworkTitle={shareArt?.title || ''}
      />
    </div>
  );
}

// Simple Helper spinner
function RefreshCw({
  size = 24,
  ...props
}: React.SVGProps<SVGSVGElement> & { size?: number | string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}
