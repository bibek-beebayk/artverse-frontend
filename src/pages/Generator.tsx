import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Download, Save, RefreshCw, Cpu, Zap, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useCart } from '../context/CartContext.tsx';
import { db, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { cn } from '../lib/utils.ts';
import { ImageModal } from '../components/Common.tsx';

const PRODUCT_TEMPLATES = [
  {
    productType: 'T-Shirt',
    basePrice: 29.99,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colours: ['Midnight Black', 'Cyber White', 'Neon Blue', 'Ash Grey'],
    printArea: 'Center Chest (12" x 12" Vector Overlay)',
    isRecommended: true,
    mockupImageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=600',
    overlayStyle: 'w-24 h-24 top-[35%] left-[50%] -translate-x-[50%] rotate-2 mix-blend-multiply opacity-90',
  },
  {
    productType: 'Hoodie',
    basePrice: 49.99,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colours: ['Midnight Black', 'Cyber White', 'Cyber Neon Pink', 'Heather Grey'],
    printArea: 'Center Mid-Chest (10" x 10" Print)',
    isRecommended: false,
    mockupImageUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=600',
    overlayStyle: 'w-20 h-20 top-[42%] left-[45%] -translate-x-[50%] mix-blend-multiply opacity-85 shadow-sm',
  },
  {
    productType: 'Mug',
    basePrice: 18.0,
    sizes: ['11oz', '15oz'],
    colours: ['Classic Pearl', 'Cyber Black', 'Solar Yellow'],
    printArea: 'Wrap Overlay (Full-Width Wrap Print)',
    isRecommended: false,
    mockupImageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&q=80&w=600',
    overlayStyle: 'w-14 h-14 top-[45%] left-[45%] -translate-x-[50%] -rotate-6 mix-blend-multiply opacity-85 rounded-sm',
  },
  {
    productType: 'Canvas Print',
    basePrice: 45.0,
    sizes: ['12" x 12"', '18" x 18"', '24" x 24"'],
    colours: ['Museum Frame', 'Cyber Matte Black'],
    printArea: 'Full Canvas Wrap (Giclee Archival Ink)',
    isRecommended: true,
    mockupImageUrl: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&q=80&w=600',
    overlayStyle: 'w-32 h-32 top-[46%] left-[49%] -translate-x-[50%] -translate-y-[50%] shadow-lg',
  },
  {
    productType: 'Poster',
    basePrice: 24.99,
    sizes: ['12" x 18"', '18" x 24"', '24" x 36"'],
    colours: ['Glossy Finish', 'Retro Matte'],
    printArea: 'Full Page Borderless (Pigment Inkjet)',
    isRecommended: false,
    mockupImageUrl: 'https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?auto=format&fit=crop&q=80&w=600',
    overlayStyle: 'w-24 h-32 top-[46%] left-[49%] -translate-x-[50%] -translate-y-[50%] shadow-md rotate-1',
  },
  {
    productType: 'Mousepad',
    basePrice: 19.99,
    sizes: ['Standard', 'Desk Mat Pro'],
    colours: ['Cyber LED Glare', 'Carbon Matte'],
    printArea: 'Full mousepad top visual (Stitched Edges)',
    isRecommended: false,
    mockupImageUrl: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&q=80&w=600',
    overlayStyle: 'w-36 h-20 top-[52%] left-[48%] -translate-x-[50%] -translate-y-[50%] skew-x-3 rotate-6 mix-blend-multiply opacity-60',
  },
  {
    productType: 'Phone Case',
    basePrice: 14.99,
    sizes: ['iPhone 15 Pro', 'Samsung S24 Ultra', 'Pixel 8 Pro'],
    colours: ['Crystal Clear', 'Matte Shockproof'],
    printArea: 'Full wrapping polycarbonate case',
    isRecommended: false,
    mockupImageUrl: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&q=80&w=600',
    overlayStyle: 'w-16 h-28 top-[50%] left-[50%] -translate-x-[50%] -translate-y-[50%] rounded-xl rotate-12 opacity-80 mix-blend-multiply shadow-lg',
  },
  {
    productType: 'Tote Bag',
    basePrice: 22.0,
    sizes: ['Standard Organic'],
    colours: ['Natural Canvas', 'Retro Black'],
    printArea: 'Center bag side print',
    isRecommended: false,
    mockupImageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=600',
    overlayStyle: 'w-24 h-24 top-[50%] left-[50%] -translate-x-[50%] -translate-y-[45%] mix-blend-multiply opacity-80 rotate-1',
  },
  {
    productType: 'Sticker Pack',
    basePrice: 9.99,
    sizes: ['Single Run Pack'],
    colours: ['Holographic Edge', 'Waterproof Die-Cut'],
    printArea: 'Individual die cut decals',
    isRecommended: false,
    mockupImageUrl: 'https://images.unsplash.com/photo-1572375995501-4b0894dbe054?auto=format&fit=crop&q=80&w=600',
    overlayStyle: 'w-16 h-16 top-[48%] left-[50%] -translate-x-[50%] -translate-y-[50%] rotate-[45deg] mix-blend-multiply opacity-90',
  },
  {
    productType: 'Digital Wallpaper',
    basePrice: 4.99,
    sizes: ['UHD 8K Display'],
    colours: ['Digital Delivery'],
    printArea: 'Sent automatically via dynamic transmission payload',
    isRecommended: false,
    mockupImageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=600',
    overlayStyle: 'w-44 h-28 top-[36%] left-[49%] -translate-x-[50%] opacity-85 rotate-[-2deg] rounded-sm',
  },
] as const;

export function Generator() {
  const { user } = useAuth();
  const { setActiveCustomization, addGeneratedArtwork, addToCart } = useCart();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentArtworkId, setCurrentArtworkId] = useState<string | null>(null);
  const [addedProducts, setAddedProducts] = useState<Record<string, boolean>>({});
  const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;

  const handleQuickGrab = (product: (typeof PRODUCT_TEMPLATES)[number]) => {
    if (!generatedImage) return;

    const artworkId = currentArtworkId ?? `art-${Date.now()}`;
    const cartItemId = `cart-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    addToCart({
      id: cartItemId,
      generatedArtworkId: artworkId,
      productType: product.productType,
      mockupImageUrl: product.mockupImageUrl,
      selectedSize: product.sizes[0],
      selectedColour: product.colours[0] ?? 'Default',
      quantity: 1,
      price: product.basePrice,
      userPrompt: prompt,
      originalImageUrl: generatedImage,
    });

    setAddedProducts((prev) => ({ ...prev, [product.productType]: true }));
    setTimeout(() => {
      setAddedProducts((prev) => ({ ...prev, [product.productType]: false }));
    }, 2000);
  };

  const generateImage = async () => {
    if (!prompt.trim()) return;
    if (!geminiApiKey) {
      setError('Missing Gemini API key. Set VITE_GEMINI_API_KEY or GEMINI_API_KEY before generating images.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);
    setSaveSuccess(false);
    setCurrentArtworkId(null);
    setAddedProducts({});

    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: `Digital art, cyberpunk style, neon lights, highly detailed, futuristic: ${prompt}` }],
        },
        config: {
          imageConfig: {
            aspectRatio: '1:1',
          },
        },
      });

      let foundImage = false;
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            const base64Data = part.inlineData.data;
            const finalImg = `data:image/png;base64,${base64Data}`;
            const uniqueArtId = `art-${Date.now()}`;

            setGeneratedImage(finalImg);
            setCurrentArtworkId(uniqueArtId);
            foundImage = true;

            addGeneratedArtwork({
              id: uniqueArtId,
              userPrompt: prompt,
              imageUrl: finalImg,
              createdAt: new Date().toISOString(),
              categorySuggestion: 'Neural Synthetics',
              availableProducts: PRODUCT_TEMPLATES.map((p) => ({
                productType: p.productType,
                mockupImageUrl: p.mockupImageUrl,
                basePrice: p.basePrice,
                sizes: [...p.sizes],
                colours: [...p.colours],
                printArea: p.printArea,
                isRecommended: p.isRecommended,
              })),
            });
            break;
          }
        }
      }

      if (!foundImage) {
        throw new Error('No image was returned from the neural network.');
      }
    } catch (err: unknown) {
      console.error('Generation Error:', err);
      setError(err instanceof Error ? err.message : 'A neural link failure occurred. Please retry.');
    } finally {
      setIsGenerating(false);
    }
  };

  const saveToProfile = async () => {
    if (!user || !generatedImage || !prompt) return;

    setIsSaving(true);
    try {
      const generatedRef = collection(db, 'users', user.uid, 'generated');
      await addDoc(generatedRef, {
        userId: user.uid,
        prompt,
        imageUrl: generatedImage,
        createdAt: serverTimestamp(),
      });
      setSaveSuccess(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/generated`);
    } finally {
      setIsSaving(false);
    }
  };

  const downloadImage = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `artverse-ai-${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <header className="mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sm bg-neon-purple/20 border-l-4 border-neon-purple text-neon-purple text-[10px] uppercase tracking-[0.4em] font-bold mb-6">
          Neural Synthesizer / Alpha
        </div>
        <h1 className="text-5xl md:text-7xl font-display font-black text-white uppercase tracking-tighter mb-4">
          Dream <span className="italic font-light">Machine</span>
        </h1>
        <p className="text-gray-500 max-w-xl text-sm leading-relaxed uppercase tracking-wider">
          Direct neural-to-pixel synthesis. Describe your vision and watch as the Artverse AI constructs a new reality from the digital void.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        <section className="space-y-8">
          <div className="glass-card p-8 border-white/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Cpu size={120} />
            </div>

            <div className="relative z-10">
              <label className="block text-[10px] font-bold text-neon-blue uppercase tracking-[0.3em] mb-4">
                Neural Input Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ex: Futuristic samurai standing in a rainy Tokyo street at night, neon reflections in puddles..."
                className="w-full bg-cyber-black/50 border border-white/10 rounded-xl p-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-neon-purple min-h-[150px] resize-none transition-all"
              />

              <div className="mt-8 flex flex-wrap gap-4">
                <button
                  onClick={generateImage}
                  disabled={isGenerating || !prompt.trim()}
                  className={cn(
                    'flex-grow md:flex-initial flex items-center justify-center gap-3 px-8 py-4 bg-white text-cyber-black font-black uppercase tracking-widest rounded-xl transition-all duration-300',
                    isGenerating || !prompt.trim()
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-neon-purple hover:text-white hover:neon-glow-purple active:scale-95'
                  )}
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      Synthesizing...
                    </>
                  ) : (
                    <>
                      <Zap size={18} className="fill-current" />
                      Ignite Generation
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 bg-cyber-black/40 border border-white/5 rounded-2xl flex items-start gap-4">
            <ShieldCheck className="text-neon-blue mt-1 shrink-0" size={20} />
            <div>
              <p className="text-xs text-white font-bold uppercase tracking-wider mb-1">Safety Protocols Active</p>
              <p className="text-xs text-gray-500 leading-relaxed uppercase">
                The AI is configured to block explicit or harmful content. Ensure your prompts align with neural safety guidelines.
              </p>
            </div>
          </div>
        </section>

        <section className="relative">
          <div
            className={cn(
              'aspect-square rounded-3xl overflow-hidden glass-card border-white/10 flex items-center justify-center bg-cyber-black relative transition-all duration-700',
              generatedImage ? 'neon-glow-purple border-neon-purple/30 shadow-2xl' : 'border-dashed border-white/20'
            )}
          >
            <AnimatePresence mode="wait">
              {isGenerating ? (
                <motion.div
                  key="loader"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-6"
                >
                  <div className="relative w-24 h-24">
                    <div className="absolute inset-0 border-2 border-neon-purple border-t-transparent rounded-full animate-spin" />
                    <div className="absolute inset-4 border-2 border-neon-blue border-b-transparent rounded-full animate-spin [animation-duration:1.5s]" />
                    <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-neon-pink" size={24} />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-white uppercase tracking-[0.5em] animate-pulse mb-2">Neural Pattern Forming</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">Constructing Pixels from Probabilities...</p>
                  </div>
                </motion.div>
              ) : generatedImage ? (
                <motion.div
                  key="image"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full h-full relative group"
                >
                  <img
                    src={generatedImage}
                    alt="Generated Art"
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => setIsModalOpen(true)}
                    loading="lazy"
                  />

                  <div className="absolute inset-0 bg-cyber-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-4">
                    <div className="flex gap-4">
                      <button
                        onClick={downloadImage}
                        className="w-14 h-14 bg-white text-cyber-black rounded-full flex items-center justify-center hover:bg-neon-blue hover:text-white transition-all transform hover:scale-110"
                      >
                        <Download size={24} />
                      </button>
                      <button
                        onClick={saveToProfile}
                        disabled={!user || isSaving || saveSuccess}
                        className={cn(
                          'w-14 h-14 rounded-full flex items-center justify-center transition-all transform hover:scale-110',
                          saveSuccess
                            ? 'bg-neon-pink text-white neon-glow-pink'
                            : 'bg-white text-cyber-black hover:bg-neon-purple hover:text-white'
                        )}
                      >
                        {isSaving ? <RefreshCw size={24} className="animate-spin" /> : <Save size={24} />}
                      </button>
                    </div>
                    <p className="text-[10px] text-white font-bold uppercase tracking-widest">
                      {saveSuccess ? 'Stored in Archive' : user ? 'Save to Archive' : 'Login to Save'}
                    </p>
                  </div>
                </motion.div>
              ) : error ? (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center p-8"
                >
                  <div className="text-neon-pink mb-4 flex justify-center">
                    <Zap size={48} />
                  </div>
                  <p className="text-white font-bold uppercase tracking-widest mb-2">Neural Link Severed</p>
                  <p className="text-xs text-gray-500 uppercase max-w-xs">{error}</p>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center"
                >
                  <Sparkles className="text-white/10 mb-6 mx-auto" size={80} />
                  <p className="text-gray-600 uppercase tracking-widest text-[10px] font-bold">Waiting for Neural Impulse</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </div>

      {generatedImage && (
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="mt-20 pt-16 border-t border-white/5"
        >
          <header className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-neon-blue/10 border border-neon-blue/20 text-[9px] uppercase tracking-widest font-mono text-neon-blue mb-2">
                Fulfillment Workshop Node
              </div>
              <h2 className="text-3xl font-display font-black uppercase tracking-widest text-white">
                Physicalize <span className="italic font-light">Merchandise</span>
              </h2>
              <p className="text-xs text-gray-400 uppercase tracking-wider mt-1">
                Wrap your customized vector or landscape layout directly onto premium physical items instantly.
              </p>
            </div>
            <div className="bg-white/5 border border-white/5 rounded-xl px-4 py-2 text-[10px] uppercase font-mono tracking-widest text-gray-400">
              Print-On-Demand Node: <span className="text-[#10b981] font-bold">Active</span>
            </div>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {PRODUCT_TEMPLATES.map((product) => {
              const isAdded = addedProducts[product.productType];
              return (
                <div
                  key={product.productType}
                  className="glass-card overflow-hidden border border-white/5 hover:border-neon-purple/40 hover:neon-glow-purple/20 transition-all duration-300 flex flex-col justify-between group"
                >
                  <div className="relative aspect-square bg-[#0c0d12] flex items-center justify-center p-6 overflow-hidden">
                    <img
                      src={product.mockupImageUrl}
                      alt={product.productType}
                      className="absolute inset-0 w-full h-full object-cover opacity-35 mix-blend-screen pointer-events-none group-hover:scale-105 transition-transform duration-500"
                    />

                    <div className={cn('absolute z-10 overflow-hidden pointer-events-none', product.overlayStyle)}>
                      <img
                        src={generatedImage}
                        alt="Applied neuro design"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {product.isRecommended && (
                      <span className="absolute top-3 left-3 bg-neon-purple/35 text-white border border-neon-purple/50 text-[7px] font-mono font-black uppercase tracking-widest px-2 py-0.5 rounded shadow">
                        Hot Drop
                      </span>
                    )}

                    <span className="absolute bottom-3 right-3 bg-cyber-black/80 text-gray-400 text-[8px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border border-white/5">
                      ${product.basePrice.toFixed(2)}
                    </span>
                  </div>

                  <div className="p-5 space-y-4 bg-cyber-black/75 backdrop-blur border-t border-white/5">
                    <div>
                      <h3 className="text-xs font-display font-black uppercase tracking-wider text-white">
                        {product.productType}
                      </h3>
                      <p className="text-[9px] text-gray-400 uppercase tracking-widest mt-1">
                        {product.printArea}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        className="text-center py-2 text-[9px] font-extrabold uppercase tracking-widest border border-white/10 hover:border-white text-gray-300 hover:text-white rounded-lg transition-all cursor-pointer"
                        onClick={() => {
                          setActiveCustomization({
                            artworkId: currentArtworkId ?? `art-${Date.now()}`,
                            userPrompt: prompt,
                            imageUrl: generatedImage,
                            productType: product.productType,
                            mockupImageUrl: product.mockupImageUrl,
                            basePrice: product.basePrice,
                            sizes: [...product.sizes],
                            colours: [...product.colours],
                          });
                          navigate('/customize');
                        }}
                      >
                        Specs Setup
                      </button>
                      <button
                        className={cn(
                          'text-center py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer',
                          isAdded
                            ? 'bg-[#10b981] text-white'
                            : 'bg-white text-cyber-black hover:bg-neon-blue hover:text-white'
                        )}
                        onClick={() => handleQuickGrab(product)}
                        disabled={isAdded}
                      >
                        {isAdded ? 'Added!' : 'Quick Grab'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.section>
      )}

      <ImageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        imageUrl={generatedImage || ''}
        title={`Neural Synthesis: ${prompt}`}
      />
    </div>
  );
}
