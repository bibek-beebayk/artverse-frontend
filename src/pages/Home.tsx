import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Play, Image as ImageIcon, Sparkles, Zap, Globe, Cpu, ShoppingBag, WandSparkles } from 'lucide-react';
import { motion } from 'motion/react';
import type { Artwork } from '../types.ts';
import { getFeaturedArtworks } from '../lib/api.ts';

export function Home() {
  const [featured, setFeatured] = useState<Artwork[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [featuredError, setFeaturedError] = useState<string | null>(null);

  useEffect(() => {
    const loadFeaturedArtworks = async () => {
      try {
        const artworks = await getFeaturedArtworks();
        setFeatured(artworks.slice(0, 4));
      } catch (error) {
        console.error("Failed to load featured artworks:", error);
        setFeaturedError("Featured artworks are temporarily unavailable.");
      } finally {
        setLoadingFeatured(false);
      }
    };

    void loadFeaturedArtworks();
  }, []);

  return (
    <div className="flex flex-col">
      {/* Coming Soon */}
      <section className="relative px-6 pt-32 pb-10 bg-cyber-black overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 left-[8%] h-56 w-56 rounded-full bg-neon-purple/10 blur-3xl" />
          <div className="absolute top-8 right-[12%] h-48 w-48 rounded-full bg-neon-blue/10 blur-3xl" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-cyber-black" />
        </div>

        <div className="relative max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="glass-card border-white/10 rounded-[2rem] overflow-hidden"
          >
            <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.9fr]">
              <div className="p-8 md:p-10 lg:p-12 border-b lg:border-b-0 lg:border-r border-white/5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neon-blue/10 border border-neon-blue/20 text-neon-blue text-[10px] uppercase tracking-[0.35em] font-bold mb-6">
                  <Cpu size={12} />
                  <span>Coming Soon</span>
                </div>

                <h2 className="text-4xl md:text-5xl font-display font-black text-white uppercase tracking-tight leading-none mb-5">
                  The <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue via-white to-neon-purple">Official Launch</span> Is Near
                </h2>

                <p className="max-w-2xl text-sm md:text-base text-gray-400 leading-relaxed mb-8">
                  Artverse is still in pre-launch mode. We are preparing the full public release with curated AI collections, immersive galleries, customization flows, and premium merch experiences built for the first official drop.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                    <WandSparkles className="text-neon-purple mb-4" size={18} />
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500 mb-2">New Drop</p>
                    <p className="text-sm text-white font-semibold uppercase tracking-wider">Launch Day Collections</p>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                    <ShoppingBag className="text-neon-blue mb-4" size={18} />
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500 mb-2">Storefront</p>
                    <p className="text-sm text-white font-semibold uppercase tracking-wider">Official Merch Release</p>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                    <Sparkles className="text-neon-pink mb-4" size={18} />
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500 mb-2">Experience</p>
                    <p className="text-sm text-white font-semibold uppercase tracking-wider">Full Site Reveal</p>
                  </div>
                </div>
              </div>

              <div className="p-8 md:p-10 lg:p-12 flex flex-col justify-between bg-gradient-to-br from-white/[0.03] to-transparent">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-gray-500 mb-4">Preview Transmission</p>
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-neon-purple/20 bg-neon-purple/10 px-4 py-4">
                      <p className="text-[10px] uppercase tracking-[0.35em] text-neon-purple font-bold mb-2">Phase 01</p>
                      <p className="text-sm text-white uppercase tracking-wider">Private build period with ongoing visual and product refinement.</p>
                    </div>
                    <div className="rounded-2xl border border-neon-blue/20 bg-neon-blue/10 px-4 py-4">
                      <p className="text-[10px] uppercase tracking-[0.35em] text-neon-blue font-bold mb-2">Phase 02</p>
                      <p className="text-sm text-white uppercase tracking-wider">Public launch with galleries, generator access, and merch storefront activation.</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.35em] text-gray-500 font-bold mb-2">Status</p>
                    <p className="text-sm text-white uppercase tracking-widest">Pre-launch transmission active</p>
                  </div>
                  <Link
                    to="/about"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white text-cyber-black font-bold uppercase tracking-widest hover:bg-neon-blue hover:text-white transition-all"
                  >
                    Learn More
                    <ChevronRight size={16} />
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Hero Section */}
      <section className="relative h-[90vh] flex items-center justify-center overflow-hidden px-6">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-cyber-black via-transparent to-cyber-black z-10" />
          <motion.img 
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 10, repeat: Infinity, repeatType: "reverse" }}
            src="https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&q=80&w=2400" 
            className="w-full h-full object-cover opacity-60"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] z-[5]" />
        </div>

        <div className="relative z-20 max-w-5xl text-center flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neon-purple/20 border border-neon-purple/30 text-neon-purple text-[10px] uppercase tracking-[0.3em] font-bold mb-8">
              <Sparkles size={12} />
              <span>Next-Gen AI Art Brand</span>
            </div>
            
            <h1 className="text-6xl md:text-8xl font-display font-black text-white tracking-tighter mb-8 leading-[0.9] uppercase overflow-hidden">
               Where <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-purple via-neon-blue to-neon-pink">AI Meets</span> <br /> 
               Imagination
            </h1>
            
            <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-12 font-light leading-relaxed">
              Futuristic visuals, cyberpunk worlds, and AI-generated creativity. 
              We are defining the aesthetics of the next digital frontier.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 items-center justify-center">
              <Link to="/gallery" className="group relative px-8 py-4 bg-white text-cyber-black font-bold uppercase tracking-widest rounded-full overflow-hidden transition-all hover:pr-12">
                <span className="relative z-10 flex items-center gap-2">
                  <ImageIcon size={20} />
                  Explore Gallery
                </span>
                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all" size={20} />
              </Link>
              
              <Link to="/videos" className="group px-8 py-4 bg-transparent text-white font-bold uppercase tracking-widest border border-white/20 rounded-full hover:border-neon-blue hover:text-neon-blue transition-all flex items-center gap-2">
                <Play size={20} className="fill-current" />
                View Videos
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Floating Decals */}
        <div className="absolute bottom-12 left-12 hidden lg:flex flex-col gap-8">
            <div className="flex items-center gap-4 group cursor-default">
                <div className="w-12 h-[1px] bg-white/20 group-hover:bg-neon-purple transition-all" />
                <span className="text-[10px] text-white/40 group-hover:text-white transition-all uppercase tracking-[0.4em]">Section.01 / Discovery</span>
            </div>
            <div className="flex items-center gap-4 group cursor-default">
                <div className="w-12 h-[1px] bg-white/20 group-hover:bg-neon-blue transition-all" />
                <span className="text-[10px] text-white/40 group-hover:text-white transition-all uppercase tracking-[0.4em]">ARTV-24X / PROTOCOL</span>
            </div>
        </div>
      </section>

      {/* Featured Works */}
      <section className="py-24 px-6 bg-cyber-black">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-16 px-4">
            <div>
              <p className="text-neon-blue text-xs uppercase tracking-[0.4em] font-bold mb-4">Curated Selection</p>
              <h2 className="text-4xl md:text-5xl font-display font-bold text-white uppercase tracking-tight">
                Featured <span className="italic font-light">Artworks</span>
              </h2>
            </div>
            <Link to="/gallery" className="text-gray-500 hover:text-white transition-colors flex items-center gap-2 text-sm uppercase font-bold tracking-widest pb-1 border-b border-transparent hover:border-white">
              View All <ChevronRight size={16} />
            </Link>
          </div>

          {loadingFeatured ? (
            <div className="glass-card border-white/10 p-8 text-center text-xs font-bold uppercase tracking-[0.3em] text-gray-500">
              Loading featured artworks
            </div>
          ) : featuredError ? (
            <div className="glass-card border-white/10 p-8 text-center text-sm text-neon-pink">
              {featuredError}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {featured.map((art, idx) => (
                <motion.div
                  key={art.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02, y: -5 }}
                  transition={{ delay: idx * 0.1 }}
                  viewport={{ once: true }}
                  className="group cursor-pointer"
                >
                  <div className="relative aspect-[4/5] overflow-hidden rounded-2xl glass-card border-white/5 group-hover:border-neon-purple transition-all duration-500">
                    <img 
                      src={art.imageUrl} 
                      alt={art.title} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-cyber-black via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                    
                    <div className="absolute inset-0 flex flex-col justify-end p-6 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                      <span className="text-neon-purple text-[10px] font-bold uppercase tracking-widest mb-2 opacity-0 group-hover:opacity-100 transition-opacity delay-100">
                        {art.category}
                      </span>
                      <h3 className="text-xl font-display font-bold text-white tracking-widest uppercase mb-1">
                        {art.title}
                      </h3>
                      <p className="text-gray-400 text-xs line-clamp-1 opacity-0 group-hover:opacity-100 transition-opacity delay-200">
                        {art.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Info Stats */}
      <section className="py-24 border-y border-white/5 bg-cyber-gray overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12">
             <div className="flex flex-col items-center text-center">
                <Zap className="text-neon-purple mb-6" size={48} />
                <h3 className="text-3xl font-display font-black text-white mb-2">99%</h3>
                <p className="text-gray-500 uppercase tracking-widest text-xs font-bold">Neural Accuracy</p>
             </div>
             <div className="flex flex-col items-center text-center">
                <Globe className="text-neon-blue mb-6" size={48} />
                <h3 className="text-3xl font-display font-black text-white mb-2">12K+</h3>
                <p className="text-gray-500 uppercase tracking-widest text-xs font-bold">Worlds Generated</p>
             </div>
             <div className="flex flex-col items-center text-center">
                <Sparkles className="text-neon-pink mb-6" size={48} />
                <h3 className="text-3xl font-display font-black text-white mb-2">Infinite</h3>
                <p className="text-gray-500 uppercase tracking-widest text-xs font-bold">Creative Potential</p>
             </div>
          </div>
      </section>
    </div>
  );
}
