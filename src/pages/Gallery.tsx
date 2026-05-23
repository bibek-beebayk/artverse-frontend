import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Maximize2, Share2, Heart } from 'lucide-react';
import type { Artwork, Category } from '../types.ts';
import { ImageModal, Pagination, ShareModal, SmartImage } from '../components/Common.tsx';
import { cn } from '../lib/utils.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { getArtworks, getGalleryCategories } from '../lib/api.ts';

const ITEMS_PER_PAGE = 6;

export function Gallery() {
  const { isFavorited, toggleFavorite } = useAuth();
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [categories, setCategories] = useState<Category[]>(['All']);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedArt, setSelectedArt] = useState<Artwork | null>(null);
  const [shareArt, setShareArt] = useState<Artwork | null>(null);

  useEffect(() => {
    const loadGalleryData = async () => {
      try {
        const [categoryNames, artworkItems] = await Promise.all([
          getGalleryCategories(),
          getArtworks(),
        ]);
        setCategories(categoryNames);
        setArtworks(artworkItems);
      } catch (loadError) {
        console.error("Failed to load gallery data:", loadError);
        setError("The gallery is currently unavailable.");
      } finally {
        setLoading(false);
      }
    };

    void loadGalleryData();
  }, []);

  const filteredArtworks = activeCategory === 'All' 
    ? artworks 
    : artworks.filter((art) => art.category === activeCategory);

  const totalPages = Math.ceil(filteredArtworks.length / ITEMS_PER_PAGE);
  const currentItems = filteredArtworks.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
      <header className="mb-12 sm:mb-16 text-center">
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-display font-black text-white uppercase tracking-tighter mb-4">
          Digital <span className="text-neon-purple neon-text-glow">Archives</span>
        </h1>
        <p className="text-gray-500 uppercase tracking-[0.25em] sm:tracking-[0.3em] text-[10px] sm:text-xs font-bold mb-8 sm:mb-12">Collection Vol. 01 / AI Generated Realities</p>
        
        {/* Filters */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-4 sm:px-6 py-2 rounded-full border text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all",
                activeCategory === cat 
                  ? "bg-neon-purple border-neon-purple text-white neon-glow-purple" 
                  : "bg-transparent border-white/10 text-gray-500 hover:text-white hover:border-white/30"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <div className="glass-card border-white/10 p-8 text-center text-xs font-bold uppercase tracking-[0.3em] text-gray-500">
          Loading gallery
        </div>
      ) : error ? (
        <div className="glass-card border-white/10 p-8 text-center text-sm text-neon-pink">
          {error}
        </div>
      ) : (
        <>
          <motion.div 
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 min-h-[800px]"
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {currentItems.map((art) => (
                <motion.div
                  layout
                  key={art.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ scale: 1.02, y: -5 }}
                  transition={{ duration: 0.4 }}
                  className="group cursor-pointer relative"
                  onClick={() => setSelectedArt(art)}
                >
                  <div className="glass-card overflow-hidden h-96 group-hover:border-neon-blue transition-all duration-500">
                    <SmartImage
                      src={art.thumbnailUrl || art.imageUrl}
                      alt={art.title}
                      className="w-full h-full"
                      imgClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                    />
                    
                    <div className="absolute inset-0 bg-cyber-black/0 group-hover:bg-cyber-black/60 transition-all flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 p-8 text-center">
                      <Maximize2 size={32} className="text-neon-blue mb-4 transition-transform group-hover:scale-110" />
                      <h3 className="text-xl font-display font-bold text-white uppercase tracking-widest mb-1">
                        {art.title}
                      </h3>
                      <p className="text-xs text-neon-blue font-bold uppercase tracking-widest mb-4">
                        {art.category}
                      </p>

                      <div className="flex items-center gap-3">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setShareArt(art);
                          }}
                          className="flex items-center gap-2 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-neon-blue hover:text-cyber-black transition-all group/share"
                        >
                          <Share2 size={16} className="group-hover/share:rotate-12 transition-transform" />
                        </button>

                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite({
                              id: art.id,
                              title: art.title,
                              imageUrl: art.imageUrl
                            });
                          }}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg transition-all",
                            isFavorited(art.id)
                              ? "bg-neon-pink text-white neon-glow-pink border-neon-pink"
                              : "bg-white/10 border border-white/20 text-white hover:bg-white hover:text-cyber-black"
                          )}
                        >
                          <Heart 
                            size={16} 
                            className={cn(
                              "transition-transform",
                              isFavorited(art.id) ? "fill-current scale-110" : "group-hover:scale-110"
                            )} 
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          {currentItems.length === 0 && (
            <div className="glass-card border-white/10 p-8 text-center text-sm text-gray-500">
              No artworks found in this category yet.
            </div>
          )}
        </>
      )}

      {!loading && !error && totalPages > 0 && (
        <Pagination 
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(page) => {
            setCurrentPage(page);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}

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
