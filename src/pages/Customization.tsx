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
  Crop,
  Type
} from 'lucide-react';
import { cn } from '../lib/utils.ts';
import { ImageModal } from '../components/Common.tsx';
import { TShirtTemplate } from '../components/TShirtTemplate.tsx';
import { createMockupRender } from '../lib/api.ts';
import type { ActiveCustomization, CropOverride, PartCustomization, PlacementOverride, TextElement } from '../types.ts';

const MIN_CROP_SIZE = 12;
const CROP_HANDLE_SIZE = 18;
const MIN_PLACEMENT_SIZE = 80;
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
type PlacementHandle = 'move' | 'se';

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
  const cornerRadius = Number(
    (placement as PlacementOverride & { corner_radius?: number }).corner_radius ??
      placement.cornerRadius ??
      0
  );

  if ([x, y, width, height].some((value) => Number.isNaN(value))) {
    return null;
  }

  return {
    x,
    y,
    width,
    height,
    cornerRadius: Number.isNaN(cornerRadius) ? 0 : cornerRadius,
    fit: typeof placement.fit === 'string' ? placement.fit : undefined,
    rotation:
      typeof placement.rotation === 'number' && !Number.isNaN(placement.rotation)
        ? placement.rotation
        : undefined,
    opacity:
      typeof placement.opacity === 'number' && !Number.isNaN(placement.opacity)
        ? placement.opacity
        : undefined,
  };
}

function extractPlacementFromConfig(config: Record<string, unknown> | undefined | null): PlacementOverride | null {
  const placement = (config as { placement?: unknown } | null | undefined)?.placement;
  if (!placement || typeof placement !== 'object') {
    return null;
  }
  return normalizePlacement(placement as ActiveCustomization['basePlacement']);
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

  const [activePart, setActivePart] = useState<string>('front');
  const [partsConfig, setPartsConfig] = useState<Record<string, PartCustomization>>({});
  const [selectedColour, setSelectedColour] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [isAdding, setIsAdding] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isRealisticPreviewOpen, setIsRealisticPreviewOpen] = useState(false);
  const [realisticPreviewUrl, setRealisticPreviewUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewRenderId, setPreviewRenderId] = useState<number | undefined>(undefined);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [isPreviewAssetLoading, setIsPreviewAssetLoading] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [designDimensions, setDesignDimensions] = useState<{ width: number; height: number } | null>(null);
  const [placementDraft, setPlacementDraft] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [cornerRadius, setCornerRadius] = useState(0);
  const [isPlacementDragging, setIsPlacementDragging] = useState(false);
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
  const previewStageRef = useRef<HTMLDivElement | null>(null);
  const cropStageRef = useRef<HTMLDivElement | null>(null);
  const draftCropRectRef = useRef<CropOverride>({
    left: 0,
    top: 0,
    width: 100,
    height: 100,
  });
  const cropAnimationFrameRef = useRef<number | null>(null);
  const placementDragState = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    handle: PlacementHandle;
    originPlacement: { x: number; y: number; width: number; height: number };
    width: number;
    height: number;
  } | null>(null);
  const cropDragState = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    handle: CropHandle;
    originRect: CropOverride;
    width: number;
    height: number;
  } | null>(null);

  const [textElements, setTextElements] = useState<TextElement[]>([]);
  const [activeTextId, setActiveTextId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'design' | 'text'>('design');
  const textDragState = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    id: string;
    originX: number;
    originY: number;
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    if (!activeCustomization && routeCustomization) {
      setActiveCustomization(routeCustomization);
    }
  }, [activeCustomization, routeCustomization, setActiveCustomization]);

  useEffect(() => {
    draftCropRectRef.current = draftCropRect;
  }, [draftCropRect]);

  useEffect(() => {
    return () => {
      if (cropAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(cropAnimationFrameRef.current);
      }
    };
  }, []);

  // Initialize selected defaults from active customization
  useEffect(() => {
    if (customization) {
      setPreviewRenderId(undefined);
      setPreviewLoading(false);
      setIsPreviewAssetLoading(true);
      setPreviewError(null);
      setDesignDimensions(null);
      setTemplateDimensions(null);
      setCropStudioImageDimensions(null);
      setPlacementDraft(null);
      setCornerRadius(0);
      setIsCropStudioOpen(false);
      setAppliedCropOverride(null);
      setDraftCropRect({ left: 0, top: 0, width: 100, height: 100 });
      if (customization.colours && customization.colours.length > 0) {
        setSelectedColour(customization.colours[0]);
      }
      if (customization.sizes && customization.sizes.length > 0) {
        setSelectedSize(customization.sizes[0]);
      }
      setTextElements(customization.textElements || []);
      setActiveTextId(null);
      setActiveTab('design');
      setPartsConfig(customization.partsConfig ? { ...customization.partsConfig } : {});
      setActivePart('front');
    }
  }, [customization]);

  const activeTemplatePart = useMemo(() => {
    if (!customization?.templateParts) {
      return null;
    }
    return customization.templateParts.find((part) => part.name === activePart) ?? null;
  }, [customization, activePart]);

  const previewResolvedPlacement = useMemo(() => {
    if (!customization?.basePlacement) {
      return null;
    }

    const activePlacement = placementDraft ?? {
      x: customization.basePlacement.x,
      y: customization.basePlacement.y,
      width: customization.basePlacement.width,
      height: customization.basePlacement.height,
    };

    return {
      x: Math.round(activePlacement.x),
      y: Math.round(activePlacement.y),
      width: Math.max(MIN_PLACEMENT_SIZE, Math.round(activePlacement.width)),
      height: Math.max(MIN_PLACEMENT_SIZE, Math.round(activePlacement.height)),
      cornerRadius: Math.max(0, Math.round(cornerRadius)),
      fit: customization.basePlacement.fit,
      rotation: customization.basePlacement.rotation,
      opacity: customization.basePlacement.opacity,
    };
  }, [cornerRadius, customization, placementDraft]);

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

  const handlePlacementPointerDown = (
    event: React.PointerEvent<HTMLElement>,
    handle: PlacementHandle
  ) => {
    if (!previewResolvedPlacement || !previewStageRef.current) {
      return;
    }

    const rect = previewStageRef.current.getBoundingClientRect();
    placementDragState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      handle,
      originPlacement: {
        x: previewResolvedPlacement.x,
        y: previewResolvedPlacement.y,
        width: previewResolvedPlacement.width,
        height: previewResolvedPlacement.height,
      },
      width: rect.width || 1,
      height: rect.height || 1,
    };
    setIsPlacementDragging(true);
    previewStageRef.current.setPointerCapture(event.pointerId);
  };

  const handlePlacementPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const activeDrag = placementDragState.current;
    if (
      !activeDrag ||
      activeDrag.pointerId !== event.pointerId ||
      !templateDimensions
    ) {
      return;
    }

    const deltaX = ((event.clientX - activeDrag.startX) / activeDrag.width) * templateDimensions.width;
    const deltaY = ((event.clientY - activeDrag.startY) / activeDrag.height) * templateDimensions.height;

    if (activeDrag.handle === 'move') {
      setPlacementDraft({
        x: clamp(
          Math.round(activeDrag.originPlacement.x + deltaX),
          0,
          templateDimensions.width - activeDrag.originPlacement.width
        ),
        y: clamp(
          Math.round(activeDrag.originPlacement.y + deltaY),
          0,
          templateDimensions.height - activeDrag.originPlacement.height
        ),
        width: activeDrag.originPlacement.width,
        height: activeDrag.originPlacement.height,
      });
      return;
    }

    const nextWidth = clamp(
      Math.round(activeDrag.originPlacement.width + deltaX),
      MIN_PLACEMENT_SIZE,
      templateDimensions.width - activeDrag.originPlacement.x
    );
    const nextHeight = clamp(
      Math.round(activeDrag.originPlacement.height + deltaY),
      MIN_PLACEMENT_SIZE,
      templateDimensions.height - activeDrag.originPlacement.y
    );

    setPlacementDraft({
      x: activeDrag.originPlacement.x,
      y: activeDrag.originPlacement.y,
      width: nextWidth,
      height: nextHeight,
    });
  };

  const handlePlacementPointerEnd = (event: React.PointerEvent<HTMLElement>) => {
    const activeDrag = placementDragState.current;
    if (activeDrag && activeDrag.pointerId === event.pointerId) {
      placementDragState.current = null;
      setIsPlacementDragging(false);
      if (previewStageRef.current?.hasPointerCapture(event.pointerId)) {
        previewStageRef.current.releasePointerCapture(event.pointerId);
      }
    }
  };

  const handleCropPointerDown = (event: React.PointerEvent<HTMLElement>, handle: CropHandle) => {
    event.preventDefault();
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

  const queueCropRectUpdate = (nextRect: CropOverride) => {
    draftCropRectRef.current = nextRect;
    if (cropAnimationFrameRef.current !== null) {
      return;
    }

    cropAnimationFrameRef.current = window.requestAnimationFrame(() => {
      cropAnimationFrameRef.current = null;
      setDraftCropRect(draftCropRectRef.current);
    });
  };

  const handleCropPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const activeDrag = cropDragState.current;
    if (!activeDrag || activeDrag.pointerId !== event.pointerId) {
      return;
    }
    event.preventDefault();

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

    queueCropRectUpdate({
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
      if (cropAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(cropAnimationFrameRef.current);
        cropAnimationFrameRef.current = null;
      }
      setDraftCropRect(draftCropRectRef.current);
    }
  };

  const getDefaultPlacementForPart = (partName: string): PlacementOverride | null => {
    const templatePart = customization?.templateParts?.find((part) => part.name === partName);
    return extractPlacementFromConfig(templatePart?.config) ?? customization?.basePlacement ?? null;
  };

  const handlePartChange = (nextPart: string) => {
    if (nextPart === activePart) {
      return;
    }

    const outgoingPartState: PartCustomization = {
      ...partsConfig[activePart],
      placementOverride: previewResolvedPlacement ?? undefined,
      cropOverride: appliedCropOverride ?? undefined,
      textElements,
    };

    const nextPartsConfig = { ...partsConfig, [activePart]: outgoingPartState };
    setPartsConfig(nextPartsConfig);

    const savedPart = nextPartsConfig[nextPart];
    const nextPlacement = savedPart?.placementOverride ?? getDefaultPlacementForPart(nextPart);

    setPlacementDraft(
      nextPlacement
        ? {
            x: nextPlacement.x,
            y: nextPlacement.y,
            width: nextPlacement.width,
            height: nextPlacement.height,
          }
        : null
    );
    setCornerRadius(nextPlacement?.cornerRadius ?? 0);
    setAppliedCropOverride(savedPart?.cropOverride ?? null);
    setDraftCropRect(savedPart?.cropOverride ?? { left: 0, top: 0, width: 100, height: 100 });
    setTextElements(savedPart?.textElements ?? []);
    setActiveTextId(null);
    setTemplateDimensions(null);
    setIsPreviewAssetLoading(true);
    setActivePart(nextPart);
  };

  const handleTextPointerDown = (event: React.PointerEvent<HTMLElement>, textId: string) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (!templateDimensions || !previewStageRef.current) return;
    
    const textEl = textElements.find(t => t.id === textId);
    if (!textEl) return;
    
    setActiveTextId(textId);
    
    const rect = previewStageRef.current.getBoundingClientRect();
    textDragState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      id: textId,
      originX: textEl.x,
      originY: textEl.y,
      width: rect.width || 1,
      height: rect.height || 1,
    };
    
    previewStageRef.current.setPointerCapture(event.pointerId);
  };

  const handleTextPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const activeDrag = textDragState.current;
    if (!activeDrag || activeDrag.pointerId !== event.pointerId || !templateDimensions) {
      return;
    }

    const deltaX = ((event.clientX - activeDrag.startX) / activeDrag.width) * templateDimensions.width;
    const deltaY = ((event.clientY - activeDrag.startY) / activeDrag.height) * templateDimensions.height;

    setTextElements(prev => prev.map(t => {
      if (t.id === activeDrag.id) {
        return {
          ...t,
          x: activeDrag.originX + deltaX,
          y: activeDrag.originY + deltaY,
        };
      }
      return t;
    }));
  };

  const handleTextPointerEnd = (event: React.PointerEvent<HTMLElement>) => {
    const activeDrag = textDragState.current;
    if (activeDrag && activeDrag.pointerId === event.pointerId) {
      textDragState.current = null;
      if (previewStageRef.current?.hasPointerCapture(event.pointerId)) {
        previewStageRef.current.releasePointerCapture(event.pointerId);
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
  const previewTemplateUrl =
    activeTemplatePart?.baseImage || customization.templateBaseImageUrl || customization.mockupImageUrl;
  const previewShadowLayerUrl = activeTemplatePart?.shadowLayer || customization.templateShadowLayerUrl;
  const previewHighlightLayerUrl = activeTemplatePart?.highlightLayer || customization.templateHighlightLayerUrl;
  const supportsLiveTemplatePreview = Boolean(previewTemplateUrl && previewResolvedPlacement);
  const showPreviewLoading = previewLoading || isPreviewAssetLoading;

  useEffect(() => {
    if (!customization?.basePlacement || !designDimensions) {
      return;
    }

    const basePlacement = customization.basePlacement;
    const designAspectRatio = designDimensions.width / designDimensions.height;
    const placementAspectRatio = basePlacement.width / basePlacement.height;

    let nextWidth = basePlacement.width;
    let nextHeight = basePlacement.height;

    if (designAspectRatio >= placementAspectRatio) {
      nextHeight = Math.max(
        MIN_PLACEMENT_SIZE,
        Math.round(basePlacement.width / Math.max(designAspectRatio, 0.01))
      );
    } else {
      nextWidth = Math.max(
        MIN_PLACEMENT_SIZE,
        Math.round(basePlacement.height * designAspectRatio)
      );
    }

    nextWidth = Math.min(nextWidth, basePlacement.width);
    nextHeight = Math.min(nextHeight, basePlacement.height);

    const centeredX = Math.round(basePlacement.x + (basePlacement.width - nextWidth) / 2);
    const centeredY = Math.round(basePlacement.y + (basePlacement.height - nextHeight) / 2);

    setPlacementDraft((current) => {
      if (
        current &&
        current.x === centeredX &&
        current.y === centeredY &&
        current.width === nextWidth &&
        current.height === nextHeight
      ) {
        return current;
      }

      return {
        x: centeredX,
        y: centeredY,
        width: nextWidth,
        height: nextHeight,
      };
    });
  }, [customization, designDimensions]);

  useEffect(() => {
    if (!customization) {
      setIsPreviewAssetLoading(false);
      return;
    }

    const assetUrls = Array.from(
      new Set(
        [previewTemplateUrl, customization.imageUrl].filter(
          (value): value is string => Boolean(value && value.trim())
        )
      )
    );

    if (customization.productType === 'tshirt' && !previewTemplateUrl) {
      setTemplateDimensions({ width: 1000, height: 1000 });
      setIsPreviewAssetLoading(false);
      return;
    }

    if (assetUrls.length === 0) {
      setIsPreviewAssetLoading(false);
      return;
    }

    let isCancelled = false;
    let remaining = assetUrls.length;
    setIsPreviewAssetLoading(true);

    const finish = () => {
      remaining -= 1;
      if (!isCancelled && remaining <= 0) {
        setIsPreviewAssetLoading(false);
      }
    };

    assetUrls.forEach((assetUrl) => {
      const image = new window.Image();
      image.onload = () => {
        if (
          !isCancelled &&
          assetUrl === customization.imageUrl &&
          image.naturalWidth > 0 &&
          image.naturalHeight > 0
        ) {
          setDesignDimensions((current) => {
            if (
              current?.width === image.naturalWidth &&
              current?.height === image.naturalHeight
            ) {
              return current;
            }

            return { width: image.naturalWidth, height: image.naturalHeight };
          });
        }
        if (
          !isCancelled &&
          assetUrl === previewTemplateUrl &&
          image.naturalWidth > 0 &&
          image.naturalHeight > 0
        ) {
          setTemplateDimensions((current) => {
            if (
              current?.width === image.naturalWidth &&
              current?.height === image.naturalHeight
            ) {
              return current;
            }

            return { width: image.naturalWidth, height: image.naturalHeight };
          });
        }
        finish();
      };
      image.onerror = finish;
      image.src = assetUrl;
    });

    return () => {
      isCancelled = true;
    };
  }, [customization, previewTemplateUrl]);

  
  const handleGenerateRealisticPreview = async () => {
    setIsPreviewAssetLoading(true);
    try {
      const response = await createMockupRender({
        templateId: customization.templateId,
        artworkId: customization.sourceArtworkId,
        sourceImageUrl: customization.imageUrl,
        sourcePrompt: customization.userPrompt,
        variantColor: selectedColour,
        variantSize: selectedSize,
        placementOverride: previewResolvedPlacement ?? undefined,
        cropOverride: appliedCropOverride,
        textElements,
        partName: activePart,
      });
      setRealisticPreviewUrl(response.render.outputImage || response.render.outputImageUrl || customization.mockupImageUrl);
      setIsRealisticPreviewOpen(true);
    } catch (error) {
      console.error('Failed to generate preview:', error);
      alert('Failed to generate realistic preview.');
    } finally {
      setIsPreviewAssetLoading(false);
    }
  };

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
        textElements,
        partName: activePart,
      });

      finalizedMockupUrl =
        response.render.outputImage || response.render.outputImageUrl || customization.mockupImageUrl;
      finalizedRenderId = response.render.id;
      setPreviewRenderId(response.render.id);

      const finalPartsConfig: Record<string, PartCustomization> = {
        ...partsConfig,
        [activePart]: {
          ...partsConfig[activePart],
          placementOverride: previewResolvedPlacement ?? undefined,
          cropOverride: cropOverride ?? undefined,
          textElements,
          mockupImageUrl: finalizedMockupUrl,
          backendRenderId: finalizedRenderId,
        },
      };
      setPartsConfig(finalPartsConfig);

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
        textElements,
        userPrompt: customization.userPrompt,
        originalImageUrl: customization.imageUrl,
        partsConfig: finalPartsConfig,
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
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8 sm:py-12 grid grid-cols-1 xl:grid-cols-[minmax(0,1.35fr)_minmax(420px,0.85fr)] gap-8 xl:gap-14 items-start">
        
        {/* Dynamic Display Mockup Box */}
        <section className="space-y-4 lg:space-y-6">
          <div className="sticky top-24 z-20 space-y-3 xl:static xl:space-y-6">
          <div className="rounded-2xl border border-neon-blue/15 bg-neon-blue/5 px-4 py-3 sm:hidden">
            <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-neon-blue">Live Preview</p>
            <p className="mt-1 text-[10px] uppercase tracking-widest text-gray-400">
              Keep adjusting the controls below. Your design updates here instantly.
            </p>
          </div>

          
          {customization.productType === 'tshirt' && (
            <div className="flex gap-4 border-b border-white/10 mb-4 px-2">
              {(customization.templateParts && customization.templateParts.length > 0
                ? customization.templateParts.map((part) => part.name)
                : ['front', 'back', 'left_sleeve', 'right_sleeve']
              ).map(part => (
                <button
                  key={part}
                  onClick={() => handlePartChange(part)}
                  className={cn(
                    "pb-2 text-xs uppercase tracking-widest border-b-2 transition-colors",
                    activePart === part ? "border-neon-blue text-neon-blue" : "border-transparent text-gray-500 hover:text-white"
                  )}
                >
                  {part.replace('_', ' ')}
                </button>
              ))}
            </div>
          )}
          
          <div className="relative min-h-[420px] sm:min-h-[560px] xl:min-h-[760px] rounded-3xl bg-cyber-gray/30 border border-white/5 flex items-center justify-center overflow-hidden p-3 sm:p-6 xl:p-8 group shadow-[0_0_50px_rgba(0,0,0,0.8)]">

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
                    ref={previewStageRef}
                    className={cn(
                      "relative h-full max-h-full w-full max-w-full selection-none transition-all duration-300",
                      showPreviewLoading && "opacity-60 scale-[0.99]",
                      isPlacementDragging ? "cursor-grabbing" : "cursor-default"
                    )}
                    style={{
                      aspectRatio: templateDimensions
                        ? `${templateDimensions.width}/${templateDimensions.height}`
                        : '1 / 1',
                    }}
                    onPointerMove={(e) => {
                      handlePlacementPointerMove(e);
                      handleTextPointerMove(e);
                    }}
                    onPointerUp={(e) => {
                      handlePlacementPointerEnd(e);
                      handleTextPointerEnd(e);
                    }}
                    onPointerCancel={(e) => {
                      handlePlacementPointerEnd(e);
                      handleTextPointerEnd(e);
                    }}
                  >
                    
                    {customization.productType === 'tshirt' && !previewTemplateUrl ? (
                      <TShirtTemplate activePart={activePart} className="absolute inset-0 w-full h-full pointer-events-none" />
                    ) : (
                      <img
                        src={previewTemplateUrl}
                        alt={customization.templateName || customization.productType}
                        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                        onLoad={(event) => {
                          setIsPreviewAssetLoading(false);
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
                        onError={() => {
                          setIsPreviewAssetLoading(false);
                        }}
                      />
                    )}


                    {previewPlacementStyle && (
                      <div
                        className={cn(
                          "absolute overflow-hidden flex items-center justify-center",
                          isPlacementDragging ? "cursor-grabbing" : "cursor-grab"
                        )}
                        style={{
                          ...previewPlacementStyle,
                          opacity: 0.96,
                          borderRadius: `${previewResolvedPlacement.cornerRadius ?? 0}px`,
                          touchAction: 'none',
                          zIndex: 10,
                        }}
                        onPointerDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          handlePlacementPointerDown(event, 'move');
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

                        <div className="pointer-events-none absolute inset-0 rounded-[inherit] border-2 border-neon-blue/80 shadow-[0_0_0_1px_rgba(255,255,255,0.65)_inset]" />
                        <div className="pointer-events-none absolute left-2 top-2 rounded-full bg-cyber-black/75 px-2 py-1 text-[8px] font-black uppercase tracking-[0.25em] text-neon-blue">
                          Drag To Move
                        </div>
                        <button
                          type="button"
                          className="absolute bottom-0 right-0 h-5 w-5 translate-x-1/2 translate-y-1/2 rounded-full border-2 border-white bg-neon-pink shadow-[0_0_0_4px_rgba(0,0,0,0.35)] cursor-nwse-resize"
                          style={{ touchAction: 'none' }}
                          onPointerDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            handlePlacementPointerDown(event, 'se');
                          }}
                          aria-label="Resize design"
                        />
                      </div>
                    )}

                    {previewShadowLayerUrl && (
                      <img
                        src={previewShadowLayerUrl}
                        alt=""
                        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                        aria-hidden="true"
                      />
                    )}

                    {previewHighlightLayerUrl && (
                      <img
                        src={previewHighlightLayerUrl}
                        alt=""
                        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                        aria-hidden="true"
                        style={{ zIndex: 30 }}
                      />
                    )}

                    {/* Text Elements */}
                    <div className="absolute inset-0 z-40 pointer-events-none" style={{ containerType: 'inline-size' }}>
                      {textElements.map((textEl) => (
                        <div
                          key={textEl.id}
                          className={cn(
                            "absolute whitespace-pre text-center origin-center transition-all",
                            activeTextId === textEl.id ? "outline outline-2 outline-neon-pink outline-offset-2" : "hover:outline hover:outline-1 hover:outline-white/50",
                            textDragState.current?.id === textEl.id ? "cursor-grabbing" : "cursor-grab pointer-events-auto"
                          )}
                          style={{
                            left: `${(textEl.x / templateDimensions.width) * 100}%`,
                            top: `${(textEl.y / templateDimensions.height) * 100}%`,
                            color: textEl.color,
                            fontFamily: textEl.fontFamily,
                            fontWeight: textEl.isBold ? 'bold' : 'normal',
                            fontStyle: textEl.isItalic ? 'italic' : 'normal',
                            fontSize: `${(textEl.fontSize / templateDimensions.width) * 100}cqi`,
                            letterSpacing: `${(textEl.letterSpacing || 0) / templateDimensions.width * 100}cqi`,
                            transform: `translate(-50%, -50%) rotate(${textEl.rotation || 0}deg)`,
                            touchAction: 'none'
                          }}
                          onPointerDown={(e) => handleTextPointerDown(e, textEl.id)}
                        >
                          {textEl.text}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <img 
                    src={customization.mockupImageUrl} 
                    alt={customization.productType} 
                    className={cn(
                      "w-full h-full object-contain selection-none pointer-events-none transition-all duration-500",
                      showPreviewLoading && "opacity-30 scale-[0.985]"
                    )}
                    onLoad={() => setIsPreviewAssetLoading(false)}
                    onError={() => setIsPreviewAssetLoading(false)}
                  />
                )}
              </div>
            )}

            {showPreviewLoading && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-cyber-black/58 backdrop-blur-[2px]">
                <div className="relative h-16 w-16">
                  <div className="absolute inset-0 rounded-full border-2 border-neon-blue/30" />
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-neon-blue border-r-neon-purple animate-spin" />
                  <div className="absolute inset-3 rounded-full border border-transparent border-b-neon-pink animate-spin [animation-direction:reverse] [animation-duration:1.3s]" />
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-white">
                    {previewLoading ? 'Finalizing Mockup' : 'Loading Preview'}
                  </p>
                  <p className="mt-2 text-[9px] uppercase tracking-widest text-gray-400">
                    {previewLoading
                      ? 'Saving your chosen placement to the backend'
                      : 'Preparing the mockup workspace'}
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
                {previewLoading
                  ? 'Finalizing backend render'
                  : isPreviewAssetLoading
                    ? 'Loading preview assets'
                    : 'Live preview mode active'}
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
                    Drag the print box on the preview to move it. Pull the pink handle to resize it.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPlacementDraft(
                      customization.basePlacement
                        ? {
                            x: customization.basePlacement.x,
                            y: customization.basePlacement.y,
                            width: customization.basePlacement.width,
                            height: customization.basePlacement.height,
                          }
                        : null
                    );
                    setCornerRadius(0);
                    setAppliedCropOverride(null);
                    setDraftCropRect({ left: 0, top: 0, width: 100, height: 100 });
                  }}
                  className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[9px] font-extrabold uppercase tracking-widest text-gray-300 transition-all hover:border-white/20 hover:text-white"
                >
                  Reset
                </button>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start gap-3">
                    <Move size={14} className="mt-0.5 text-neon-blue" />
                    <div>
                      <p className="text-[9px] font-extrabold uppercase tracking-[0.28em] text-white">
                        Direct Placement Mode
                      </p>
                      <p className="mt-2 text-[10px] uppercase tracking-widest text-gray-500">
                        Move and resize the design right on the preview instead of using sliders.
                      </p>
                    </div>
                  </div>
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
            <h1 className="text-3xl sm:text-4xl font-display font-black uppercase tracking-widest text-white mb-6">
              {customization.productType} Setup
            </h1>

            <div className="flex space-x-2 border-b border-white/10 mb-2">
              <button
                className={cn("px-4 py-3 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all", activeTab === 'design' ? "border-neon-blue text-neon-blue" : "border-transparent text-gray-400 hover:text-white")}
                onClick={() => setActiveTab('design')}
              >
                Design & Options
              </button>
              <button
                className={cn("px-4 py-3 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all flex items-center gap-2", activeTab === 'text' ? "border-neon-pink text-neon-pink" : "border-transparent text-gray-400 hover:text-white")}
                onClick={() => setActiveTab('text')}
              >
                <Type size={14} /> Add Text
              </button>
            </div>

            <div className="space-y-6 sm:space-y-8 py-6 sm:py-8">
              {activeTab === 'design' && (
                <>
                  {customization.basePlacement && (
                <div className="hidden lg:block space-y-5 sm:space-y-6 border-b border-white/5 pb-6 sm:pb-8">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <label className="flex items-center gap-2 text-[8px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-3">
                      <Move size={12} />
                      Direct Placement
                    </label>
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 leading-relaxed">
                      Drag the print box on the preview to reposition the design. Use the pink corner handle to resize it live.
                    </p>
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
                      setPlacementDraft(
                        customization.basePlacement
                          ? {
                              x: customization.basePlacement.x,
                              y: customization.basePlacement.y,
                              width: customization.basePlacement.width,
                              height: customization.basePlacement.height,
                            }
                          : null
                      );
                      setCornerRadius(0);
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
            </>
            )}

            {activeTab === 'text' && (
              <div className="space-y-6 border-b border-white/5 pb-6 sm:pb-8">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[10px] uppercase tracking-widest text-gray-500 leading-relaxed mb-4">
                    Add custom text layers. Drag the text on the preview to reposition.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const newId = `text-${Date.now()}`;
                      setTextElements(prev => [...prev, {
                        id: newId,
                        text: 'New Text',
                        fontFamily: 'Roboto',
                        color: '#ffffff',
                        fontSize: 48,
                        x: templateDimensions ? templateDimensions.width / 2 : 500,
                        y: templateDimensions ? templateDimensions.height / 2 : 500,
                        rotation: 0,
                        isBold: false,
                        isItalic: false
                      }]);
                      setActiveTextId(newId);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/30 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all"
                  >
                    <Type size={14} /> Add New Text Block
                  </button>
                </div>

                {textElements.length > 0 && (
                  <div className="space-y-4">
                    {textElements.map(textEl => (
                      <div key={textEl.id} className={cn("rounded-2xl border bg-white/5 p-4 transition-all", activeTextId === textEl.id ? "border-neon-pink" : "border-white/10")}>
                        <div className="flex items-center justify-between mb-4">
                          <input
                            type="text"
                            value={textEl.text}
                            onChange={(e) => setTextElements(prev => prev.map(t => t.id === textEl.id ? { ...t, text: e.target.value } : t))}
                            onFocus={() => setActiveTextId(textEl.id)}
                            className="bg-transparent border-b border-white/20 text-white focus:outline-none focus:border-neon-pink text-sm w-full mr-4"
                            placeholder="Type here..."
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setTextElements(prev => {
                                  const idx = prev.findIndex(t => t.id === textEl.id);
                                  if (idx === -1 || idx === prev.length - 1) return prev;
                                  const next = [...prev];
                                  [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                                  return next;
                                });
                              }}
                              className="text-gray-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest px-2"
                              title="Move Layer Forward"
                            >
                              Up
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setTextElements(prev => {
                                  const idx = prev.findIndex(t => t.id === textEl.id);
                                  if (idx <= 0) return prev;
                                  const next = [...prev];
                                  [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                                  return next;
                                });
                              }}
                              className="text-gray-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest px-2"
                              title="Move Layer Backward"
                            >
                              Down
                            </button>
                            <button
                              type="button"
                              onClick={() => setTextElements(prev => prev.filter(t => t.id !== textEl.id))}
                              className="text-gray-500 hover:text-neon-pink transition-colors text-xs font-bold uppercase tracking-widest ml-2"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        {activeTextId === textEl.id && (
                          <div className="space-y-4 pt-4 border-t border-white/10">
                            <div>
                              <label className="block text-[8px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-2">Font Size</label>
                              <input
                                type="range"
                                min={12}
                                max={200}
                                value={textEl.fontSize}
                                onChange={(e) => setTextElements(prev => prev.map(t => t.id === textEl.id ? { ...t, fontSize: Number(e.target.value) } : t))}
                                className="w-full accent-[var(--color-neon-pink)]"
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-2">Rotation</label>
                              <input
                                type="range"
                                min={-180}
                                max={180}
                                value={textEl.rotation || 0}
                                onChange={(e) => setTextElements(prev => prev.map(t => t.id === textEl.id ? { ...t, rotation: Number(e.target.value) } : t))}
                                className="w-full accent-[var(--color-neon-pink)]"
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-2">Letter Spacing</label>
                              <input
                                type="range"
                                min={-20}
                                max={100}
                                value={textEl.letterSpacing || 0}
                                onChange={(e) => setTextElements(prev => prev.map(t => t.id === textEl.id ? { ...t, letterSpacing: Number(e.target.value) } : t))}
                                className="w-full accent-[var(--color-neon-pink)]"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[8px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-2">Color</label>
                                <input
                                  type="color"
                                  value={textEl.color}
                                  onChange={(e) => setTextElements(prev => prev.map(t => t.id === textEl.id ? { ...t, color: e.target.value } : t))}
                                  className="w-full h-8 rounded bg-transparent cursor-pointer"
                                />
                              </div>
                              <div>
                                <label className="block text-[8px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-2">Font</label>
                                <select
                                  value={textEl.fontFamily}
                                  onChange={(e) => setTextElements(prev => prev.map(t => t.id === textEl.id ? { ...t, fontFamily: e.target.value } : t))}
                                  className="w-full bg-cyber-black border border-white/20 text-white text-xs p-1.5 rounded outline-none focus:border-neon-pink"
                                  style={{ fontFamily: textEl.fontFamily }}
                                >
                                  <option value="Roboto" style={{ fontFamily: 'Roboto' }}>Roboto</option>
                                  <option value="Impact" style={{ fontFamily: 'Impact' }}>Impact</option>
                                  <option value="Pacifico" style={{ fontFamily: 'Pacifico' }}>Pacifico</option>
                                  <option value="Orbitron" style={{ fontFamily: 'Orbitron' }}>Orbitron</option>
                                  <option value="Rajdhani" style={{ fontFamily: 'Rajdhani' }}>Rajdhani</option>
                                  <option value="Audiowide" style={{ fontFamily: 'Audiowide' }}>Audiowide</option>
                                </select>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 mt-2">
                              <button
                                type="button"
                                onClick={() => setTextElements(prev => prev.map(t => t.id === textEl.id ? { ...t, isBold: !t.isBold } : t))}
                                className={cn("px-3 py-1.5 rounded border text-xs font-bold transition-colors", textEl.isBold ? "bg-neon-blue text-cyber-black border-neon-blue" : "bg-transparent text-gray-400 border-white/20 hover:border-white/50")}
                              >
                                BOLD
                              </button>
                              <button
                                type="button"
                                onClick={() => setTextElements(prev => prev.map(t => t.id === textEl.id ? { ...t, isItalic: !t.isItalic } : t))}
                                className={cn("px-3 py-1.5 rounded border text-xs italic transition-colors", textEl.isItalic ? "bg-neon-pink text-white border-neon-pink" : "bg-transparent text-gray-400 border-white/20 hover:border-white/50")}
                              >
                                ITALIC
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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
              onClick={handleGenerateRealisticPreview}
              disabled={showPreviewLoading}
              className={cn(
                "w-full flex items-center justify-center gap-3 px-8 py-4 mb-4 rounded-full font-bold uppercase tracking-widest text-xs transition-all duration-300 border-2",
                showPreviewLoading 
                  ? "border-cyber-gray text-gray-500 cursor-not-allowed" 
                  : "border-neon-pink text-neon-pink hover:bg-neon-pink/10 hover:shadow-neon-pink"
              )}
            >
              <Maximize2 size={16} />
              Generate Realistic Preview
            </button>
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
                      style={{ aspectRatio: cropStudioAspectRatio, touchAction: 'none', overscrollBehavior: 'contain' }}
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
                          touchAction: 'none',
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
                            style={{ width: `${CROP_HANDLE_SIZE}px`, height: `${CROP_HANDLE_SIZE}px`, touchAction: 'none' }}
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
        artworkId={customization.artworkId || undefined}
      />
      <ImageModal
        isOpen={isRealisticPreviewOpen}
        onClose={() => setIsRealisticPreviewOpen(false)}
        imageUrl={realisticPreviewUrl || ''}
        title={`Realistic Preview of ${activePart}`}
      />
    </div>
  );
}
