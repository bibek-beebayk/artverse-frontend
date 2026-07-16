import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Download, Save, RefreshCw, Cpu, Zap, ShieldCheck } from 'lucide-react';
import type { ActiveCustomization, MockupRender, MockupTemplate, PlacementOverride } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useCart } from '../context/CartContext.tsx';
import { db, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { cn } from '../lib/utils.ts';
import { ImageModal, SmartImage } from '../components/Common.tsx';
import { createMockupRender, getMockupTemplates } from '../lib/api.ts';

const ASPECT_RATIO_OPTIONS = [
  { value: '1:1', label: 'Square' },
  { value: '4:3', label: 'Classic' },
  { value: '3:4', label: 'Portrait' },
  { value: '16:9', label: 'Cinematic' },
  { value: '9:16', label: 'Story' },
] as const;

const TEMPLATE_META: Record<
  string,
  {
    basePrice: number;
    printArea: string;
    isRecommended: boolean;
    fallbackSizes: string[];
    fallbackColours: string[];
  }
> = {
  tshirt: {
    basePrice: 29.99,
    printArea: 'Center Chest Print',
    isRecommended: true,
    fallbackSizes: ['S', 'M', 'L', 'XL', 'XXL'],
    fallbackColours: ['Midnight Black', 'Cyber White', 'Ash Grey'],
  },
  hoodie: {
    basePrice: 49.99,
    printArea: 'Mid-Chest Print',
    isRecommended: false,
    fallbackSizes: ['S', 'M', 'L', 'XL', 'XXL'],
    fallbackColours: ['Midnight Black', 'Cyber White', 'Heather Grey'],
  },
  mug: {
    basePrice: 18,
    printArea: 'Wrap Print Area',
    isRecommended: false,
    fallbackSizes: ['11oz', '15oz'],
    fallbackColours: ['Classic Pearl', 'Cyber Black'],
  },
  canvas: {
    basePrice: 45,
    printArea: 'Full Canvas Wrap',
    isRecommended: true,
    fallbackSizes: ['12" x 12"', '18" x 18"', '24" x 24"'],
    fallbackColours: ['Museum Frame', 'Cyber Matte Black'],
  },
  poster: {
    basePrice: 24.99,
    printArea: 'Borderless Poster Print',
    isRecommended: false,
    fallbackSizes: ['12" x 18"', '18" x 24"', '24" x 36"'],
    fallbackColours: ['Glossy Finish', 'Retro Matte'],
  },
  phone_case: {
    basePrice: 14.99,
    printArea: 'Full Case Wrap',
    isRecommended: false,
    fallbackSizes: ['iPhone 15 Pro', 'Samsung S24 Ultra'],
    fallbackColours: ['Crystal Clear', 'Matte Shockproof'],
  },
  tote_bag: {
    basePrice: 22,
    printArea: 'Front Tote Print',
    isRecommended: false,
    fallbackSizes: ['Standard Organic'],
    fallbackColours: ['Natural Canvas', 'Retro Black'],
  },
};

function getTemplateMeta(template: MockupTemplate) {
  return (
    TEMPLATE_META[template.productType] || {
      basePrice: 24.99,
      printArea: template.description || 'Configured Print Area',
      isRecommended: false,
      fallbackSizes: ['Standard'],
      fallbackColours: ['Default'],
    }
  );
}

function getPlacementFromTemplate(template: MockupTemplate): PlacementOverride | null {
  return getPlacementFromCandidate(template.config?.placement);
}

function getPlacementFromCandidate(candidate: unknown): PlacementOverride | null {
  if (!candidate || typeof candidate !== 'object') {
    return null;
  }

  const placement = candidate as Record<string, unknown>;
  const x = Number(placement.x);
  const y = Number(placement.y);
  const width = Number(placement.width);
  const height = Number(placement.height);
  const cornerRadiusRaw = placement.corner_radius ?? placement.cornerRadius;

  if ([x, y, width, height].some((value) => Number.isNaN(value))) {
    return null;
  }

  const normalizedPlacement: PlacementOverride = { x, y, width, height };
  const cornerRadius = Number(cornerRadiusRaw);
  if (!Number.isNaN(cornerRadius)) {
    normalizedPlacement.cornerRadius = cornerRadius;
  }

  return normalizedPlacement;
}

export function Generator() {
  const { user } = useAuth();
  const { setActiveCustomization, addGeneratedArtwork, addToCart } = useCart();
  const [prompt, setPrompt] = useState('');
  const [selectedAspectRatio, setSelectedAspectRatio] =
    useState<(typeof ASPECT_RATIO_OPTIONS)[number]['value']>('1:1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [addedProducts, setAddedProducts] = useState<Record<string, boolean>>({});
  const [mockupTemplates, setMockupTemplates] = useState<MockupTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [loadingMockups, setLoadingMockups] = useState(false);
  const [mockupError, setMockupError] = useState<string | null>(null);
  const [mockupRenders, setMockupRenders] = useState<Record<number, MockupRender>>({});
  const [selectedDesign, setSelectedDesign] = useState<{
    id: string;
    sourceArtworkId?: number;
    imageUrl: string;
    title: string;
    description: string;
    createdAt: string;
    source: 'generated';
  } | null>(null);
  const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const templates = await getMockupTemplates();
        setMockupTemplates(templates);
      } catch (templateError) {
        console.error('Failed to load mockup templates:', templateError);
        setMockupError('Mockup templates are currently unavailable.');
      } finally {
        setLoadingTemplates(false);
      }
    };

    void loadTemplates();
  }, []);

  useEffect(() => {
    if (!selectedDesign || mockupTemplates.length === 0) {
      return;
    }

    let isCancelled = false;

    const buildMockups = async () => {
      setLoadingMockups(true);
      setMockupError(null);

      const renderEntries = await Promise.all(
        mockupTemplates.map(async (template) => {
          const meta = getTemplateMeta(template);
          try {
            const response = await createMockupRender({
              sourceImageUrl: selectedDesign.imageUrl,
              sourcePrompt: selectedDesign.title,
              templateId: template.id,
              variantColor: template.supportedColors[0] || meta.fallbackColours[0] || '',
              variantSize: template.supportedSizes[0] || meta.fallbackSizes[0] || '',
            });
            return [template.id, response.render] as const;
          } catch (renderError) {
            console.error(`Failed to render mockup for template ${template.id}:`, renderError);
            return [template.id, null] as const;
          }
        })
      );

      if (isCancelled) {
        return;
      }

      const nextRenders = Object.fromEntries(
        renderEntries.filter((entry): entry is readonly [number, MockupRender] => entry[1] !== null)
      );

      setMockupRenders(nextRenders);
      if (Object.keys(nextRenders).length === 0) {
        setMockupError('No mockup previews could be generated with the current backend templates.');
      }
      setLoadingMockups(false);
    };

    void buildMockups();

    return () => {
      isCancelled = true;
    };
  }, [mockupTemplates, selectedDesign]);

  const mockupProducts = mockupTemplates.map((template) => {
    const render = mockupRenders[template.id];
    const meta = getTemplateMeta(template);
    return {
      templateId: template.id,
      renderId: render?.id,
      productType: template.productTypeDisplay,
      productKey: template.productType,
      mockupImageUrl: render?.outputImage || render?.outputImageUrl || template.baseImage || generatedImage || '',
      basePrice: Number(template.config.base_price ?? meta.basePrice),
      sizes: template.supportedSizes.length > 0 ? template.supportedSizes : meta.fallbackSizes,
      colours: template.supportedColors.length > 0 ? template.supportedColors : meta.fallbackColours,
      printArea: String(template.config.print_area ?? template.description ?? meta.printArea),
      isRecommended: Boolean(template.config.is_recommended ?? meta.isRecommended),
      status: render?.status ?? 'pending',
      errorMessage: render?.errorMessage ?? '',
    };
  });

  useEffect(() => {
    if (!selectedDesign) {
      return;
    }

    addGeneratedArtwork({
      id: selectedDesign.id,
      sourceArtworkId: selectedDesign.sourceArtworkId,
      userPrompt: selectedDesign.title,
      imageUrl: selectedDesign.imageUrl,
      createdAt: selectedDesign.createdAt,
      categorySuggestion: 'Neural Synthetics',
      availableProducts: mockupProducts.map((product) => ({
        templateId: product.templateId,
        productType: product.productType,
        mockupImageUrl: product.mockupImageUrl || selectedDesign.imageUrl,
        basePrice: product.basePrice,
        sizes: [...product.sizes],
        colours: [...product.colours],
        printArea: product.printArea,
        isRecommended: product.isRecommended,
      })),
    });
  }, [addGeneratedArtwork, mockupProducts, selectedDesign]);

  const handleQuickGrab = (product: (typeof mockupProducts)[number]) => {
    if (!selectedDesign) return;

    const artworkId = selectedDesign.id;
    const cartItemId = `cart-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    addToCart({
      id: cartItemId,
      generatedArtworkId: artworkId,
      sourceArtworkId: selectedDesign.sourceArtworkId,
      productType: product.productType,
      mockupImageUrl: product.mockupImageUrl,
      selectedSize: product.sizes[0] ?? 'Standard',
      selectedColour: product.colours[0] ?? 'Default',
      quantity: 1,
      price: product.basePrice,
      templateId: product.templateId,
      backendRenderId: product.renderId,
      placementOverride: mockupRenders[product.templateId]?.placementOverride || undefined,
      userPrompt: selectedDesign.title,
      originalImageUrl: selectedDesign.imageUrl,
    });

    setAddedProducts((prev) => ({ ...prev, [String(product.templateId)]: true }));
    setTimeout(() => {
      setAddedProducts((prev) => ({ ...prev, [String(product.templateId)]: false }));
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
    setSelectedDesign(null);
    setAddedProducts({});
    setMockupRenders({});
    setMockupError(null);

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
            aspectRatio: selectedAspectRatio,
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
              setSelectedDesign({
                id: uniqueArtId,
                imageUrl: finalImg,
                title: prompt,
                description: 'Freshly generated in Dream Machine',
                createdAt: new Date().toISOString(),
                source: 'generated',
              });
            foundImage = true;
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
    if (!user || !generatedImage || !prompt || selectedDesign?.source !== 'generated') return;

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
    const imageToDownload = selectedDesign?.imageUrl || generatedImage;
    if (!imageToDownload) return;
    const link = document.createElement('a');
    link.href = imageToDownload;
    link.download = `artverse-ai-${Date.now()}.png`;
    link.click();
  };

  const previewAspectClass =
    selectedAspectRatio === '16:9'
      ? 'aspect-[16/9]'
      : selectedAspectRatio === '9:16'
        ? 'aspect-[9/16]'
        : selectedAspectRatio === '4:3'
          ? 'aspect-[4/3]'
          : selectedAspectRatio === '3:4'
            ? 'aspect-[3/4]'
            : 'aspect-square';

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
              <div className="mb-6">
                <span className="inline-flex items-center gap-2 rounded-full border border-neon-purple/20 bg-neon-purple/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3em] text-neon-purple">
                  <Zap size={12} />
                  AI Generator
                </span>
              </div>

              <label className="block text-[10px] font-bold text-neon-blue uppercase tracking-[0.3em] mb-4">
                Neural Input Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ex: Futuristic samurai standing in a rainy Tokyo street at night, neon reflections in puddles..."
                className="w-full bg-cyber-black/50 border border-white/10 rounded-xl p-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-neon-purple min-h-[150px] resize-none transition-all"
              />

              <div className="mt-6">
                <label className="block text-[10px] font-bold text-neon-blue uppercase tracking-[0.3em] mb-3">
                  Output Aspect Ratio
                </label>
                <div className="flex flex-wrap gap-2">
                  {ASPECT_RATIO_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSelectedAspectRatio(option.value)}
                      className={cn(
                        'rounded-full border px-4 py-2 text-[10px] font-bold uppercase tracking-[0.24em] transition-all',
                        selectedAspectRatio === option.value
                          ? 'border-neon-purple bg-neon-purple text-white neon-glow-purple'
                          : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/25 hover:text-white'
                      )}
                    >
                      {option.value} / {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-4">
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

        </section>

        <section className="relative">
          <div
            className={cn(
              `${previewAspectClass} rounded-3xl overflow-hidden glass-card border-white/10 flex items-center justify-center bg-cyber-black relative transition-all duration-700`,
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
                  <SmartImage
                    src={generatedImage}
                    alt="Generated Art"
                    className="w-full h-full"
                    imgClassName="w-full h-full object-cover cursor-pointer"
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

      {selectedDesign && (
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
                These previews are now generated by the backend mockup pipeline using your design and active merch templates.
              </p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-2">
                Source: Dream Machine output
              </p>
            </div>
            <div className="bg-white/5 border border-white/5 rounded-xl px-4 py-2 text-[10px] uppercase font-mono tracking-widest text-gray-400">
              Preview Engine: <span className="text-[#10b981] font-bold">{loadingMockups ? 'Rendering' : 'Active'}</span>
            </div>
          </header>

          {loadingTemplates ? (
            <div className="glass-card border-white/10 p-8 text-center text-xs font-bold uppercase tracking-[0.3em] text-gray-500">
              Loading mockup templates
            </div>
          ) : mockupTemplates.length === 0 ? (
            <div className="glass-card border-white/10 p-8 text-center text-sm text-gray-400">
              No backend mockup templates are configured yet. Add templates in Django admin to preview merch.
            </div>
          ) : mockupError ? (
            <div className="glass-card border-white/10 p-8 text-center text-sm text-neon-pink">
              {mockupError}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {mockupProducts.map((product) => {
                const isAdded = addedProducts[String(product.templateId)];
                const isProcessing = loadingMockups && !mockupRenders[product.templateId];
                return (
                  <div
                    key={product.templateId}
                    className="glass-card overflow-hidden border border-white/5 hover:border-neon-purple/40 hover:neon-glow-purple/20 transition-all duration-300 flex flex-col justify-between group"
                  >
                    <div className="relative aspect-square bg-[#0c0d12] flex items-center justify-center p-6 overflow-hidden">
                      {product.mockupImageUrl ? (
                        <SmartImage
                          src={product.mockupImageUrl}
                          alt={product.productType}
                          className="w-full h-full"
                          imgClassName={cn(
                            'w-full h-full object-cover transition-transform duration-500',
                            isProcessing ? 'opacity-35 animate-pulse' : 'group-hover:scale-105'
                          )}
                        />
                      ) : (
                        <div className="w-full h-full border border-dashed border-white/10 rounded-2xl flex items-center justify-center text-[10px] uppercase tracking-widest text-gray-500">
                          Preview unavailable
                        </div>
                      )}

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
                            const matchedTemplate = mockupTemplates.find((template) => template.id === product.templateId);
                            const customization: ActiveCustomization = {
                              artworkId: selectedDesign.id,
                              sourceArtworkId: selectedDesign.sourceArtworkId,
                              userPrompt: selectedDesign.title,
                              imageUrl: selectedDesign.imageUrl,
                              templateId: product.templateId,
                              templateName: matchedTemplate?.name,
                              productType: product.productType,
                              mockupImageUrl: product.mockupImageUrl,
                              templateBaseImageUrl: matchedTemplate?.baseImage,
                              templateMaskImageUrl: matchedTemplate?.maskImage,
                              templateShadowLayerUrl: matchedTemplate?.shadowLayer,
                              templateHighlightLayerUrl: matchedTemplate?.highlightLayer,
                              templateParts: matchedTemplate?.parts,
                              basePrice: product.basePrice,
                              sizes: [...product.sizes],
                              colours: [...product.colours],
                              basePlacement:
                                getPlacementFromCandidate(mockupRenders[product.templateId]?.placementOverride) ||
                                (matchedTemplate ? getPlacementFromTemplate(matchedTemplate) : null) ||
                                null,
                            };
                            setActiveCustomization(customization);
                            window.location.assign('/customize');
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
                          disabled={isAdded || isProcessing || !product.mockupImageUrl}
                        >
                          {isProcessing ? 'Rendering' : isAdded ? 'Added!' : 'Quick Grab'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.section>
      )}

      <div className="mt-16 p-6 bg-cyber-black/40 border border-white/5 rounded-2xl flex items-start gap-4">
        <ShieldCheck className="text-neon-blue mt-1 shrink-0" size={20} />
        <div>
          <p className="text-xs text-white font-bold uppercase tracking-wider mb-1">Safety Protocols Active</p>
          <p className="text-xs text-gray-500 leading-relaxed uppercase">
            The AI is configured to block explicit or harmful content. Ensure your prompts align with neural safety guidelines.
          </p>
        </div>
      </div>

      <ImageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        imageUrl={selectedDesign?.imageUrl || generatedImage || ''}
        title={selectedDesign ? selectedDesign.title : `Neural Synthesis: ${prompt}`}
        artworkId={selectedDesign?.id || undefined}
      />
    </div>
  );
}
