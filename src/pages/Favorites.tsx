import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Trash2, ExternalLink, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ImageModal } from '../components/Common';
import { Link } from 'react-router-dom';
import { getFavorites } from '../lib/api.ts';
import type { Artwork } from '../types.ts';

interface FavoriteItem {
  id: string;
  artwork: Artwork;
  createdAt: string;
}

export function Favorites() {
  const { user, toggleFavorite } = useAuth();
  const [favoritesItems, setFavoritesItems] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArt, setSelectedArt] = useState<FavoriteItem | null>(null);

  useEffect(() => {
    if (!user) {
      setFavoritesItems([]);
      setLoading(false);
      return;
    }

    let isCancelled = false;

    const loadFavorites = async () => {
      setLoading(true);
      try {
        const items = await getFavorites();
        if (!isCancelled) {
          setFavoritesItems(items);
        }
      } catch (error) {
        console.error('Failed to load favorites:', error);
        if (!isCancelled) {
          setFavoritesItems([]);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    void loadFavorites();

    return () => {
      isCancelled = true;
    };
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-32 text-center">
        <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-8">
           <Heart className="text-gray-600" size={32} />
        </div>
        <h2 className="text-3xl font-display font-bold text-white uppercase tracking-widest mb-4">Identity Required</h2>
        <p className="text-gray-500 mb-8 max-w-sm mx-auto">Please connect your identity to access your personal archive of saved digital artifacts.</p>
        <Link to="/" className="inline-flex items-center gap-2 px-8 py-4 bg-neon-purple text-white font-bold uppercase tracking-widest rounded-full hover:neon-glow-purple transition-all">
           Return Home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <header className="mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sm bg-neon-pink/20 border-l-4 border-neon-pink text-neon-pink text-[10px] uppercase tracking-[0.4em] font-bold mb-6">
          Personal Collection / Archived
        </div>
        <h1 className="text-5xl md:text-7xl font-display font-black text-white uppercase tracking-tighter mb-4">
          Saved <span className="italic font-light">Artifacts</span>
        </h1>
        <p className="text-gray-500 max-w-xl text-sm leading-relaxed uppercase tracking-wider">
          Your curated selection of digital neural landscapes and futuristic visions.
        </p>
      </header>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
           <div className="w-8 h-8 border-2 border-neon-pink border-t-transparent rounded-full animate-spin" />
        </div>
      ) : favoritesItems.length === 0 ? (
        <div className="py-24 glass-card text-center border-dashed border-white/10">
           <Sparkles className="text-white/20 mb-6 mx-auto" size={48} />
           <p className="text-gray-500 uppercase tracking-widest text-sm mb-8">Archive is currently empty</p>
           <Link to="/gallery" className="text-neon-blue font-bold uppercase tracking-[0.2em] hover:underline">
              Explore Digital Archives
           </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {favoritesItems.map((item) => (
              <motion.div
                layout
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group relative h-80 rounded-2xl overflow-hidden glass-card hover:border-neon-pink/50 transition-all duration-500"
              >
                <img 
                  src={item.artwork.thumbnailUrl || item.artwork.imageUrl} 
                  alt={item.artwork.title} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-cyber-black/40 group-hover:bg-cyber-black/70 transition-colors" />
                
                <div className="absolute inset-0 p-6 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                   <h3 className="text-xl font-display font-bold text-white uppercase mb-4 tracking-widest">{item.artwork.title}</h3>
                   <div className="flex gap-3">
                      <button 
                        onClick={() => setSelectedArt(item)}
                        className="flex-grow flex items-center justify-center gap-2 p-3 bg-white text-cyber-black font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-neon-blue hover:text-white transition-all"
                      >
                         <ExternalLink size={14} />
                         View
                      </button>
                      <button 
                        onClick={async () => {
                          const removed = await toggleFavorite({
                            id: item.artwork.id,
                            title: item.artwork.title,
                            imageUrl: item.artwork.imageUrl,
                          });
                          if (removed) {
                            setFavoritesItems((current) => current.filter((favorite) => favorite.id !== item.id));
                          }
                        }}
                        className="w-12 h-12 flex items-center justify-center bg-neon-pink/20 text-neon-pink border border-neon-pink/30 rounded-xl hover:bg-neon-pink hover:text-white transition-all"
                      >
                         <Trash2 size={18} />
                      </button>
                   </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <ImageModal 
        isOpen={!!selectedArt}
        onClose={() => setSelectedArt(null)}
        imageUrl={selectedArt?.artwork.imageUrl || ''}
        title={selectedArt?.artwork.title || ''}
        artworkId={selectedArt?.artwork.id || undefined}
        onNext={
          selectedArt && favoritesItems.findIndex((a) => a.id === selectedArt.id) < favoritesItems.length - 1
            ? () => {
                const index = favoritesItems.findIndex((a) => a.id === selectedArt.id);
                if (index !== -1 && index < favoritesItems.length - 1) {
                  setSelectedArt(favoritesItems[index + 1]);
                }
              }
            : undefined
        }
        onPrev={
          selectedArt && favoritesItems.findIndex((a) => a.id === selectedArt.id) > 0
            ? () => {
                const index = favoritesItems.findIndex((a) => a.id === selectedArt.id);
                if (index > 0) {
                  setSelectedArt(favoritesItems[index - 1]);
                }
              }
            : undefined
        }
      />
    </div>
  );
}
