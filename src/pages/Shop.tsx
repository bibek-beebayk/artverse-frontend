import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Package2, Palette, RefreshCw, ShoppingBag, Sparkles } from 'lucide-react';
import type { ActiveCustomization, Artwork, MockupRender, MockupTemplate, PlacementOverride } from '../types.ts';
import { SmartImage } from '../components/Common.tsx';
import { createMockupRender, getArtworks, getMockupTemplates } from '../lib/api.ts';
import { useCart } from '../context/CartContext.tsx';
import { cn } from '../lib/utils.ts';

interface ShopSample {
  key: string;
  variantColor: string;
  variantSize: string;
  placementLabel: string;
  render: MockupRender;
}

interface SampleVariant {
  key: string;
  variantColor: string;
  variantSize: string;
  placementLabel: string;
  placementOverride?: PlacementOverride;
}

const TEMPLATE_META: Record<
  string,
  {
    basePrice: number;
    fallbackSizes: string[];
    fallbackColours: string[];
  }
> = {
  tshirt: {
    basePrice: 29.99,
    fallbackSizes: ['S', 'M', 'L', 'XL'],
    fallbackColours: ['Black', 'White', 'Grey'],
  },
  hoodie: {
    basePrice: 49.99,
    fallbackSizes: ['S', 'M', 'L', 'XL'],
    fallbackColours: ['Black', 'White', 'Grey'],
  },
  mug: {
    basePrice: 18,
    fallbackSizes: ['11oz', '15oz'],
    fallbackColours: ['Classic Pearl', 'Black Rim'],
  },
  canvas: {
    basePrice: 45,
    fallbackSizes: ['12" x 12"', '18" x 18"'],
    fallbackColours: ['Gallery Wrap'],
  },
  poster: {
    basePrice: 24.99,
    fallbackSizes: ['12" x 18"', '18" x 24"'],
    fallbackColours: ['Matte'],
  },
};

function getTemplateMeta(template: MockupTemplate) {
  return (
    TEMPLATE_META[template.productType] || {
      basePrice: 24.99,
      fallbackSizes: ['Standard'],
      fallbackColours: ['Default'],
    }
  );
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

  if ([x, y, width, height].some((value) => Number.isNaN(value))) {
    return null;
  }

  const normalized: PlacementOverride = { x, y, width, height };
  const cornerRadius = Number(placement.corner_radius ?? placement.cornerRadius);
  if (!Number.isNaN(cornerRadius)) {
    normalized.cornerRadius = cornerRadius;
  }
  if (typeof placement.fit === 'string') {
    normalized.fit = placement.fit;
  }
  const rotation = Number(placement.rotation);
  if (!Number.isNaN(rotation)) {
    normalized.rotation = rotation;
  }
  const opacity = Number(placement.opacity);
  if (!Number.isNaN(opacity)) {
    normalized.opacity = opacity;
  }

  return normalized;
}

function buildPlacementPresets(template: MockupTemplate): Array<{
  label: string;
  placementOverride?: PlacementOverride;
}> {
  const configuredPlacements = Array.isArray((template.config as Record<string, unknown>)?.sample_placements)
    ? ((template.config as Record<string, unknown>).sample_placements as unknown[])
        .map((item) => {
          if (!item || typeof item !== 'object') {
            return null;
          }

          const record = item as Record<string, unknown>;
          const placement = getPlacementFromCandidate(record.placement);
          if (!placement) {
            return null;
          }

          return {
            label: typeof record.label === 'string' && record.label.trim() ? record.label.trim() : 'Custom Placement',
            placementOverride: placement,
          };
        })
        .filter((item): item is { label: string; placementOverride: PlacementOverride } => item !== null)
    : [];

  if (configuredPlacements.length > 0) {
    return configuredPlacements.slice(0, 4);
  }

  const basePlacement = getPlacementFromCandidate((template.config as Record<string, unknown>)?.placement);
  if (!basePlacement) {
    return [{ label: 'Default Placement' }];
  }

  const { x, y, width, height, cornerRadius } = basePlacement;
  const preset = (label: string, next: Partial<PlacementOverride>) => ({
    label,
    placementOverride: {
      x: next.x ?? x,
      y: next.y ?? y,
      width: next.width ?? width,
      height: next.height ?? height,
      cornerRadius: next.cornerRadius ?? cornerRadius,
      fit: next.fit ?? basePlacement.fit ?? 'cover',
      rotation: next.rotation ?? basePlacement.rotation,
      opacity: next.opacity ?? basePlacement.opacity,
    },
  });

  if (template.productType === 'tshirt' || template.productType === 'hoodie') {
    return [
      preset('Centered', {}),
      preset('Oversized Front', {
        x: x - Math.round(width * 0.08),
        y: y + Math.round(height * 0.08),
        width: Math.round(width * 1.18),
        height: Math.round(height * 1.18),
      }),
      preset('Left Chest', {
        x: x - Math.round(width * 0.34),
        y: y - Math.round(height * 0.08),
        width: Math.round(width * 0.45),
        height: Math.round(height * 0.45),
      }),
      preset('Lower Print', {
        y: y + Math.round(height * 0.22),
        width: Math.round(width * 0.9),
        height: Math.round(height * 0.9),
      }),
    ];
  }

  if (template.productType === 'mug') {
    return [
      preset('Centered Wrap', {}),
      preset('Left Wrap', {
        x: x - Math.round(width * 0.18),
        width: Math.round(width * 0.82),
      }),
      preset('Right Wrap', {
        x: x + Math.round(width * 0.18),
        width: Math.round(width * 0.82),
      }),
      preset('Panoramic Wrap', {
        x: x - Math.round(width * 0.12),
        width: Math.round(width * 1.12),
      }),
    ];
  }

  return [
    preset('Centered', {}),
    preset('Expanded', {
      x: x - Math.round(width * 0.08),
      y: y - Math.round(height * 0.08),
      width: Math.round(width * 1.14),
      height: Math.round(height * 1.14),
    }),
    preset('Inset', {
      x: x + Math.round(width * 0.08),
      y: y + Math.round(height * 0.08),
      width: Math.round(width * 0.84),
      height: Math.round(height * 0.84),
    }),
  ];
}

function getSampleVariants(template: MockupTemplate): SampleVariant[] {
  const meta = getTemplateMeta(template);
  const colours =
    template.supportedColors.length > 0 ? template.supportedColors : meta.fallbackColours;
  const sizes = template.supportedSizes.length > 0 ? template.supportedSizes : meta.fallbackSizes;
  const primarySize = sizes[0] || 'Standard';
  const placements = buildPlacementPresets(template);
  const primaryColour = colours[0] || 'Default';

  return placements.map((placement, index) => ({
    key: `${template.id}-${primaryColour}-${primarySize}-${placement.label}-${index}`,
    variantColor: primaryColour,
    variantSize: primarySize,
    placementLabel: placement.label,
    placementOverride: placement.placementOverride
      ? {
          ...placement.placementOverride,
          fit: placement.placementOverride.fit ?? 'cover',
        }
      : undefined,
  }));
}

export function Shop() {
  const navigate = useNavigate();
  const { addToCart, setActiveCustomization } = useCart();
  const designRailRef = useRef<HTMLDivElement | null>(null);
  const [templates, setTemplates] = useState<MockupTemplate[]>([]);
  const [designs, setDesigns] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [selectedDesignId, setSelectedDesignId] = useState<string | null>(null);
  const [activeDesignCategory, setActiveDesignCategory] = useState('All');
  const [isGeneratingSamples, setIsGeneratingSamples] = useState(false);
  const [samplesError, setSamplesError] = useState<string | null>(null);
  const [samples, setSamples] = useState<ShopSample[]>([]);
  const [addedSampleKey, setAddedSampleKey] = useState<string | null>(null);

  useEffect(() => {
    const loadShopBuilder = async () => {
      try {
        const [loadedTemplates, loadedDesigns] = await Promise.all([
          getMockupTemplates(),
          getArtworks(),
        ]);

        setTemplates(loadedTemplates);
        setDesigns(loadedDesigns);
      } catch (loadError) {
        console.error('Failed to load shop builder data:', loadError);
        setError('The merch builder is currently unavailable.');
      } finally {
        setLoading(false);
      }
    };

    void loadShopBuilder();
  }, []);

  const selectedTemplate =
    templates.find((template) => template.id === selectedTemplateId) ?? null;
  const selectedDesign = designs.find((design) => design.id === selectedDesignId) ?? null;

  useEffect(() => {
    if (!selectedTemplate || !selectedDesign) {
      setSamples([]);
      setSamplesError(null);
      return;
    }

    let isCancelled = false;

    const generateSamples = async () => {
      setIsGeneratingSamples(true);
      setSamplesError(null);
      setSamples([]);

      const sampleVariants = getSampleVariants(selectedTemplate);
      const nextSamples: ShopSample[] = [];
      let failedSamples = 0;

      for (const variant of sampleVariants) {
        try {
          const response = await createMockupRender({
            artworkId: selectedDesign.backendArtworkId,
            sourceImageUrl: selectedDesign.imageUrl,
            sourcePrompt: selectedDesign.title,
            templateId: selectedTemplate.id,
            variantColor: variant.variantColor,
            variantSize: variant.variantSize,
            placementOverride: variant.placementOverride,
          });

          nextSamples.push({
            key: variant.key,
            variantColor: variant.variantColor,
            variantSize: variant.variantSize,
            placementLabel: variant.placementLabel,
            render: response.render,
          });
        } catch (sampleError) {
          failedSamples += 1;
          console.error(`Failed to generate shop sample for ${variant.placementLabel}:`, sampleError);
        }
      }

      if (isCancelled) {
        return;
      }

      setSamples(nextSamples);
      if (nextSamples.length === 0) {
        setSamplesError('No merch samples could be generated for this prop and design.');
      } else if (failedSamples > 0) {
        setSamplesError(
          `Loaded ${nextSamples.length} of ${sampleVariants.length} configured samples. Check the missing sample placements in the template config.`
        );
      }
      setIsGeneratingSamples(false);
    };

    void generateSamples();

    return () => {
      isCancelled = true;
    };
  }, [selectedDesign, selectedTemplate]);

  const selectedStep = useMemo(() => {
    if (!selectedTemplate) {
      return 1;
    }
    if (!selectedDesign) {
      return 2;
    }
    return 3;
  }, [selectedDesign, selectedTemplate]);

  const designCategories = useMemo(() => {
    return ['All', ...Array.from(new Set(designs.map((design) => design.category)))];
  }, [designs]);

  const filteredDesigns = useMemo(() => {
    if (activeDesignCategory === 'All') {
      return designs;
    }

    return designs.filter((design) => design.category === activeDesignCategory);
  }, [activeDesignCategory, designs]);

  const designRailItems = useMemo(() => {
    if (filteredDesigns.length === 0) {
      return [];
    }

    return [...filteredDesigns, ...filteredDesigns, ...filteredDesigns];
  }, [filteredDesigns]);

  useEffect(() => {
    if (!selectedTemplate || filteredDesigns.length === 0 || !designRailRef.current) {
      return;
    }

    const rail = designRailRef.current;
    const singleSetWidth = rail.scrollWidth / 3;
    rail.scrollLeft = singleSetWidth;
  }, [filteredDesigns.length, selectedTemplate]);

  const handleDesignRailScroll = () => {
    const rail = designRailRef.current;
    if (!rail || filteredDesigns.length === 0) {
      return;
    }

    const singleSetWidth = rail.scrollWidth / 3;
    if (rail.scrollLeft <= singleSetWidth * 0.25) {
      rail.scrollLeft += singleSetWidth;
    } else if (rail.scrollLeft >= singleSetWidth * 1.75) {
      rail.scrollLeft -= singleSetWidth;
    }
  };

  const handleAddSampleToCart = (sample: ShopSample) => {
    if (!selectedTemplate || !selectedDesign) {
      return;
    }

    const meta = getTemplateMeta(selectedTemplate);
    const cartItemId = `shop-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    addToCart({
      id: cartItemId,
      generatedArtworkId: selectedDesign.id,
      sourceArtworkId: selectedDesign.backendArtworkId,
      productType: selectedTemplate.productTypeDisplay,
      mockupImageUrl:
        sample.render.outputImage || sample.render.outputImageUrl || selectedTemplate.baseImage || '',
      selectedSize: sample.variantSize,
      selectedColour: sample.variantColor,
      quantity: 1,
      price: Number(selectedTemplate.config.base_price ?? meta.basePrice),
      templateId: selectedTemplate.id,
      backendRenderId: sample.render.id,
      placementOverride: sample.render.placementOverride ?? undefined,
      cropOverride: sample.render.cropOverride ?? undefined,
      userPrompt: selectedDesign.title,
      originalImageUrl: selectedDesign.imageUrl,
    });

    setAddedSampleKey(sample.key);
    window.setTimeout(() => {
      setAddedSampleKey((current) => (current === sample.key ? null : current));
    }, 1800);
  };

  const handleOpenSpecsSetup = () => {
    if (!selectedTemplate || !selectedDesign) {
      return;
    }

    const meta = getTemplateMeta(selectedTemplate);
    const customization: ActiveCustomization = {
      artworkId: selectedDesign.id,
      sourceArtworkId: selectedDesign.backendArtworkId,
      userPrompt: selectedDesign.title,
      imageUrl: selectedDesign.imageUrl,
      templateId: selectedTemplate.id,
      templateName: selectedTemplate.name,
      productType: selectedTemplate.productTypeDisplay,
      mockupImageUrl: selectedTemplate.baseImage || selectedDesign.imageUrl,
      templateBaseImageUrl: selectedTemplate.baseImage,
      templateMaskImageUrl: selectedTemplate.maskImage,
      templateShadowLayerUrl: selectedTemplate.shadowLayer,
      templateHighlightLayerUrl: selectedTemplate.highlightLayer,
      basePrice: Number(selectedTemplate.config.base_price ?? meta.basePrice),
      sizes:
        selectedTemplate.supportedSizes.length > 0
          ? [...selectedTemplate.supportedSizes]
          : [...meta.fallbackSizes],
      colours:
        selectedTemplate.supportedColors.length > 0
          ? [...selectedTemplate.supportedColors]
          : [...meta.fallbackColours],
      basePlacement: (() => {
        const basePlacement = getPlacementFromCandidate(
          (selectedTemplate.config as Record<string, unknown>)?.placement
        );
        return basePlacement
          ? {
              ...basePlacement,
              fit: basePlacement.fit ?? 'cover',
            }
          : null;
      })(),
    };

    setActiveCustomization(customization);
    navigate('/customize', { state: { customization } });
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="glass-card border-white/10 p-8 text-center text-xs font-bold uppercase tracking-[0.3em] text-gray-500">
          Loading merch builder
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="glass-card border-white/10 p-8 text-center text-sm text-neon-pink">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
      <header className="mb-12 sm:mb-16">
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-display font-black text-white uppercase tracking-tighter mb-4">
          Merch <span className="text-neon-pink neon-text-glow">Builder</span>
        </h1>
        <p className="text-gray-500 uppercase tracking-[0.25em] sm:tracking-[0.3em] text-[10px] sm:text-xs font-bold">
          Step 1: Pick a prop / Step 2: Pick a design / Step 3: Review live samples
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-10">
        {[
          { step: 1, label: 'Choose Prop', icon: Package2 },
          { step: 2, label: 'Choose Design', icon: Palette },
          { step: 3, label: 'Generated Samples', icon: Sparkles },
        ].map(({ step, label, icon: Icon }) => (
          <div
            key={step}
            className={cn(
              'rounded-2xl border px-5 py-4 flex items-center gap-3 transition-all',
              selectedStep === step
                ? 'border-neon-pink/40 bg-neon-pink/10 text-white'
                : 'border-white/10 bg-white/5 text-gray-400'
            )}
          >
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full border',
                selectedStep === step ? 'border-neon-pink/40 text-neon-pink' : 'border-white/10'
              )}
            >
              <Icon size={18} />
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.3em]">Step {step}</p>
              <p className="text-xs font-bold uppercase tracking-widest">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <section className="mb-14">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-neon-blue text-[10px] font-bold uppercase tracking-[0.35em] mb-2">
              Step 1
            </p>
            <h2 className="text-2xl sm:text-3xl font-display font-black text-white uppercase tracking-widest">
              Select A Prop
            </h2>
          </div>
          {selectedTemplate && (
            <span className="text-[10px] uppercase tracking-[0.3em] text-gray-500">
              Selected: {selectedTemplate.productTypeDisplay}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => {
                setSelectedTemplateId(template.id);
                setSamples([]);
                setSamplesError(null);
                setAddedSampleKey(null);
              }}
              className={cn(
                'overflow-hidden rounded-3xl border text-left transition-all',
                selectedTemplateId === template.id
                  ? 'border-neon-pink/40 bg-neon-pink/10'
                  : 'border-white/10 bg-white/5 hover:border-white/25'
              )}
            >
              <div className="aspect-square bg-cyber-black/60">
                <SmartImage
                  src={template.baseImage || ''}
                  alt={template.productTypeDisplay}
                  className="w-full h-full"
                  imgClassName="w-full h-full object-contain p-5"
                  loading="lazy"
                />
              </div>
              <div className="p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-white">
                  {template.productTypeDisplay}
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-gray-500 line-clamp-2">
                  {template.description || 'Backend mockup template'}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="mb-14">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-neon-blue text-[10px] font-bold uppercase tracking-[0.35em] mb-2">
              Step 2
            </p>
            <h2 className="text-2xl sm:text-3xl font-display font-black text-white uppercase tracking-widest">
              Select A Design
            </h2>
          </div>
          {selectedDesign && (
            <span className="text-[10px] uppercase tracking-[0.3em] text-gray-500">
              Selected: {selectedDesign.title}
            </span>
          )}
        </div>

        {!selectedTemplate ? (
          <div className="glass-card border-white/10 p-6 text-center text-xs font-bold uppercase tracking-[0.3em] text-gray-500">
            Pick a prop first to unlock design selection
          </div>
        ) : (
          <div className="space-y-5">
            <div className="-mx-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex w-max gap-3 px-2">
                {designCategories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => {
                      setActiveDesignCategory(category);
                      setAddedSampleKey(null);
                      if (
                        selectedDesignId &&
                        category !== 'All' &&
                        !designs.some(
                          (design) => design.id === selectedDesignId && design.category === category
                        )
                      ) {
                        setSelectedDesignId(null);
                      }
                    }}
                    className={cn(
                      'shrink-0 rounded-full border px-4 py-2 text-[10px] font-bold uppercase tracking-[0.28em] transition-all',
                      activeDesignCategory === category
                        ? 'border-neon-blue/40 bg-neon-blue/10 text-white'
                        : 'border-white/10 bg-white/5 text-gray-500 hover:border-white/25 hover:text-white'
                    )}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <div
              ref={designRailRef}
              onScroll={handleDesignRailScroll}
              className="-mx-2 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              <div className="flex w-max gap-4 px-2">
                {designRailItems.map((design, index) => (
                  <button
                    key={`${design.id}-${index}`}
                    type="button"
                    onClick={() => {
                      setSelectedDesignId(design.id);
                      setAddedSampleKey(null);
                    }}
                    className={cn(
                      'w-56 shrink-0 overflow-hidden rounded-3xl border bg-white/5 text-left transition-all',
                      selectedDesignId === design.id
                        ? 'border-neon-blue/40 bg-neon-blue/10'
                        : 'border-white/10 hover:border-white/25'
                    )}
                  >
                    <div className="aspect-[4/3]">
                      <SmartImage
                        src={design.thumbnailUrl || design.imageUrl}
                        alt={design.title}
                        className="w-full h-full"
                        imgClassName="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-4">
                      <p className="text-xs font-bold uppercase tracking-widest text-white line-clamp-1">
                        {design.title}
                      </p>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-gray-500 line-clamp-2">
                        {design.category}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      <section>
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-neon-blue text-[10px] font-bold uppercase tracking-[0.35em] mb-2">
              Step 3
            </p>
            <h2 className="text-2xl sm:text-3xl font-display font-black text-white uppercase tracking-widest">
              Available Samples
            </h2>
          </div>
          {isGeneratingSamples ? (
            <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-gray-500">
              <RefreshCw size={14} className="animate-spin" />
              Rendering Samples
            </span>
          ) : null}
        </div>

        {!selectedTemplate || !selectedDesign ? (
          <div className="glass-card border-white/10 p-6 text-center text-xs font-bold uppercase tracking-[0.3em] text-gray-500">
            Select a prop and a design to generate merch samples automatically
          </div>
        ) : !isGeneratingSamples && samples.length === 0 && samplesError ? (
          <div className="glass-card border-white/10 p-6 text-center text-sm text-neon-pink">
            {samplesError}
          </div>
        ) : isGeneratingSamples ? (
          <div className="glass-card border-white/10 p-10 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-neon-purple/25 bg-neon-purple/10 text-neon-purple">
              <RefreshCw size={22} className="animate-spin" />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-white">
              Building mockup samples
            </p>
            <p className="mt-2 text-[10px] uppercase tracking-[0.28em] text-gray-500">
              Applying your selected design to available prop variants
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {samplesError ? (
              <div className="rounded-3xl border border-amber-400/25 bg-amber-400/10 px-5 py-4 text-[10px] font-bold uppercase tracking-[0.28em] text-amber-100">
                {samplesError}
              </div>
            ) : null}

            <div className="rounded-3xl border border-neon-blue/20 bg-neon-blue/10 p-5 sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-neon-blue">
                    Separate Feature
                  </p>
                  <h3 className="mt-2 text-xl sm:text-2xl font-display font-black uppercase tracking-widest text-white">
                    Open Specs Setup
                  </h3>
                  <p className="mt-2 text-[10px] uppercase tracking-[0.28em] text-gray-300">
                    Customize this prop and design in a dedicated workspace. The backend samples below remain fixed presets.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenSpecsSetup}
                  className="rounded-2xl border border-white/15 bg-white px-5 py-3 text-xs font-black uppercase tracking-[0.28em] text-cyber-black transition-all hover:bg-neon-blue hover:text-white"
                >
                  Specs Setup
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            {samples.map((sample) => {
              const meta = getTemplateMeta(sample.render.template);
              const displayPrice = Number(sample.render.template.config.base_price ?? meta.basePrice);
              const imageUrl =
                sample.render.outputImage ||
                sample.render.outputImageUrl ||
                sample.render.template.baseImage ||
                selectedDesign.imageUrl;

              return (
                <div
                  key={sample.key}
                  className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 transition-all hover:border-neon-pink/35"
                >
                  <div className="aspect-square bg-cyber-black/70">
                    <SmartImage
                      src={imageUrl}
                      alt={`${sample.render.template.productTypeDisplay} sample`}
                      className="w-full h-full"
                      imgClassName="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-white">
                          {sample.render.template.productTypeDisplay}
                        </p>
                        <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-gray-500">
                          {sample.variantColor} • {sample.variantSize}
                        </p>
                        <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-neon-blue">
                          {sample.placementLabel}
                        </p>
                      </div>
                      <span className="text-lg font-display font-black text-white">
                        ${displayPrice.toFixed(2)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddSampleToCart(sample)}
                      className={cn(
                        'mt-5 w-full rounded-2xl px-4 py-3 text-[11px] font-black uppercase tracking-[0.24em] transition-all',
                        addedSampleKey === sample.key
                          ? 'bg-[#10b981] text-white'
                          : 'bg-white text-cyber-black hover:bg-neon-pink hover:text-white'
                      )}
                    >
                      {addedSampleKey === sample.key ? (
                        <span className="inline-flex items-center gap-2">
                          <CheckCircle2 size={16} />
                          Added
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2">
                          <ShoppingBag size={16} />
                          Add To Cart
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          </div>
        )}
      </section>
    </div>
  );
}
