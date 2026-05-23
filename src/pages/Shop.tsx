import { useEffect, useState } from 'react';
import { ShoppingBag, AlertCircle } from 'lucide-react';
import type { Product } from '../types.ts';
import { SmartImage } from '../components/Common.tsx';
import { getProductCategories, getProducts } from '../lib/api.ts';
import { cn } from '../lib/utils.ts';

export function Shop() {
  const [productCategories, setProductCategories] = useState<string[]>(['All']);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadShopData = async () => {
      try {
        const [categories, productItems] = await Promise.all([
          getProductCategories(),
          getProducts(),
        ]);
        setProductCategories(categories);
        setProducts(productItems);
      } catch (loadError) {
        console.error("Failed to load shop data:", loadError);
        setError("The shop catalog is currently unavailable.");
      } finally {
        setLoading(false);
      }
    };

    void loadShopData();
  }, []);

  const filteredProducts = activeCategory === 'All'
    ? products
    : products.filter((product) => product.category === activeCategory);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
      <header className="mb-12 sm:mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-display font-black text-white uppercase tracking-tighter mb-4">
            Merch <span className="text-neon-pink neon-text-glow">Engine</span>
          </h1>
          <p className="text-gray-500 uppercase tracking-[0.25em] sm:tracking-[0.3em] text-[10px] sm:text-xs font-bold">Wear the Future / Physical Artifacts</p>
        </div>
        
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:flex-wrap md:justify-end md:overflow-visible md:px-0 md:pb-0">
            {productCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "shrink-0 px-4 sm:px-6 py-2 rounded-lg border text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all",
                  activeCategory === cat
                    ? "bg-neon-pink border-neon-pink text-white"
                    : "bg-white/5 border-white/10 text-gray-500 hover:text-white hover:border-white/30"
                )}
              >
                {cat}
              </button>
            ))}
        </div>
      </header>

      {/* Coming Soon Alert */}
      <div className="bg-neon-pink/10 border border-neon-pink/20 rounded-2xl p-4 sm:p-6 mb-12 sm:mb-16 flex items-start sm:items-center gap-3 sm:gap-4 text-neon-pink">
          <AlertCircle size={24} />
          <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.16em] sm:tracking-[0.2em]">Note: The shop is currently in Beta. Orders will be open for fulfillment soon.</p>
      </div>

      {loading ? (
        <div className="glass-card border-white/10 p-8 text-center text-xs font-bold uppercase tracking-[0.3em] text-gray-500">
          Loading products
        </div>
      ) : error ? (
        <div className="glass-card border-white/10 p-8 text-center text-sm text-neon-pink">
          {error}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-12">
            {filteredProducts.map((product) => (
              <div key={product.id} className="group cursor-default">
                <div className="relative aspect-square glass-card overflow-hidden mb-6 border-white/5 group-hover:border-neon-pink/50 transition-all">
                  <SmartImage
                    src={product.thumbnailUrl || product.imageUrl}
                    alt={product.name}
                    className="w-full h-full"
                    imgClassName="w-full h-full object-cover grayscale brightness-50 group-hover:grayscale-0 group-hover:brightness-100 transition-all duration-700"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                  <div className="absolute top-4 right-4 bg-neon-pink text-white px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest neon-glow-pink">
                    Coming Soon
                  </div>
                </div>
                
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <p className="text-[10px] text-neon-pink font-bold uppercase tracking-widest mb-1">{product.category}</p>
                    <h3 className="text-xl font-display font-bold text-white uppercase tracking-widest group-hover:text-neon-pink transition-colors">{product.name}</h3>
                    {product.description && (
                      <p className="mt-3 text-sm text-gray-500">{product.description}</p>
                    )}
                  </div>
                  <p className="text-2xl font-display font-black text-white">{product.price}</p>
                </div>
                
                <button className="w-full mt-8 py-4 bg-white/5 border border-white/10 text-gray-400 font-bold uppercase tracking-widest text-xs rounded-xl flex items-center justify-center gap-2 group-hover:bg-neon-pink group-hover:text-white group-hover:border-neon-pink transition-all">
                  <ShoppingBag size={16} />
                  Set Notification
                </button>
              </div>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="glass-card border-white/10 p-8 text-center text-sm text-gray-500">
              No products found in this category yet.
            </div>
          )}
        </>
      )}

      <div className="mt-24 sm:mt-32 p-8 sm:p-16 glass-card text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-neon-purple/10 to-neon-blue/10 -z-10" />
        <h2 className="text-3xl sm:text-4xl font-display font-black text-white uppercase tracking-tighter mb-4">Limited Edition Drops</h2>
        <p className="text-sm sm:text-base text-gray-400 mb-8 max-w-lg mx-auto">Subscribe to our newsletter to receive access codes for limited edition physical artifacts and verified NFT drops.</p>
        <button className="w-full sm:w-auto bg-white text-cyber-black px-8 sm:px-12 py-4 font-black uppercase tracking-widest rounded-full hover:bg-neon-blue hover:text-white transition-all">
          Unlock Access
        </button>
      </div>
    </div>
  );
}
