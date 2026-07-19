import type { DesignProjectWriteInput } from './api.ts';
import type {
  ActiveCustomization,
  CropOverride,
  DesignPlacement,
  DesignProject,
  PartCustomization,
  PlacementOverride,
  TextElement,
} from '../types.ts';

const DEFAULT_PLACEMENT: PlacementOverride = { x: 0, y: 0, width: 0, height: 0, fit: 'contain', rotation: 0, opacity: 1, cornerRadius: 0 };
const DEFAULT_CROP: CropOverride = { left: 0, top: 0, width: 100, height: 100 };

/** partsConfig[partName] (editor state) -> a DesignPlacement ready to send to the backend. */
export function mapPartCustomizationToPlacement(partName: string, part: PartCustomization): DesignPlacement {
  return {
    partName,
    sourceArtworkId: part.sourceArtworkId ?? null,
    sourceGeneratedImageId: part.sourceGeneratedImageId ?? null,
    sourceImageUrl: part.imageUrl && !part.imageUrl.startsWith('data:') ? part.imageUrl : '',
    sourcePrompt: part.userPrompt ?? '',
    placementOverride: part.placementOverride ?? DEFAULT_PLACEMENT,
    cropOverride: part.cropOverride ?? DEFAULT_CROP,
    textElements: part.textElements ?? [],
    previewRenderId: part.backendRenderId ?? null,
    previewUrl: part.mockupImageUrl ?? '',
    printFileUrl: part.printFileUrl ?? '',
    metadata: {},
  };
}

/** A DesignPlacement from the backend -> partsConfig[partName] (editor state) shape. A part
 * reopened from a saved project starts clean (isDirty: false) — if it's actually missing a
 * render ID or preview URL, partNeedsRender() below still catches that independently of
 * isDirty, so this doesn't risk skipping a part that genuinely needs rendering. */
export function mapPlacementToPartCustomization(placement: DesignPlacement): PartCustomization {
  return {
    sourceArtworkId: placement.sourceArtworkId ?? undefined,
    sourceGeneratedImageId: placement.sourceGeneratedImageId ?? undefined,
    imageUrl: placement.sourceImageUrl || undefined,
    userPrompt: placement.sourcePrompt || undefined,
    placementOverride: placement.placementOverride,
    cropOverride: placement.cropOverride,
    textElements: placement.textElements,
    mockupImageUrl: placement.previewUrl || undefined,
    backendRenderId: placement.previewRenderId ?? undefined,
    printFileUrl: placement.printFileUrl || undefined,
    // A part reopened from a saved project is exactly what's currently on the server, so its
    // production file (if any) is not stale relative to what's in the editor right now.
    isPrintFileStale: false,
    isDirty: false,
  };
}

/** Reopening a saved project: DesignProject -> the editor's ActiveCustomization + partsConfig. */
export function mapDesignProjectToActiveCustomization(
  project: DesignProject,
  meta: { basePrice: number; sizes: string[]; colours: string[] },
): ActiveCustomization {
  const partsConfig: Record<string, PartCustomization> = {};
  for (const placement of project.placements) {
    partsConfig[placement.partName] = mapPlacementToPartCustomization(placement);
  }

  const frontPlacement = project.placements.find((placement) => placement.partName === 'front') ?? project.placements[0];
  const primaryImageUrl = frontPlacement?.sourceImageUrl || project.sourceImageUrl || project.mockupTemplate.baseImage || '';

  return {
    artworkId: String(project.id),
    sourceArtworkId: project.sourceArtworkId ?? frontPlacement?.sourceArtworkId ?? undefined,
    sourceGeneratedImageId: project.sourceGeneratedImageId ?? frontPlacement?.sourceGeneratedImageId ?? undefined,
    userPrompt: project.sourcePrompt || frontPlacement?.sourcePrompt || '',
    imageUrl: primaryImageUrl,
    templateId: project.mockupTemplate.id,
    templateName: project.mockupTemplate.name,
    productType: project.mockupTemplate.productType,
    mockupImageUrl: frontPlacement?.previewUrl || project.thumbnailUrl || project.thumbnail || project.mockupTemplate.baseImage || '',
    templateBaseImageUrl: project.mockupTemplate.baseImage,
    templateMaskImageUrl: project.mockupTemplate.maskImage,
    templateShadowLayerUrl: project.mockupTemplate.shadowLayer,
    templateHighlightLayerUrl: project.mockupTemplate.highlightLayer,
    templateParts: project.mockupTemplate.parts,
    basePrice: meta.basePrice,
    sizes: meta.sizes,
    colours: meta.colours,
    basePlacement: frontPlacement?.placementOverride ?? null,
    textElements: frontPlacement?.textElements,
    partsConfig,
    designProjectId: project.id,
    productId: project.product?.id,
    selectedVariantId: project.selectedVariant?.id,
  };
}

/** Editor state -> the payload sent to createDesignProject/updateDesignProject. */
export function mapEditorStateToDesignProjectWriteInput(params: {
  name?: string;
  mockupTemplateId: number;
  productId?: number | null;
  selectedVariantId?: number | null;
  selectedColor?: string;
  selectedSize?: string;
  sourceArtworkId?: number | null;
  sourceGeneratedImageId?: number | null;
  sourceImageUrl?: string;
  sourcePrompt?: string;
  thumbnailUrl?: string;
  partsConfig: Record<string, PartCustomization>;
}): DesignProjectWriteInput {
  const placements = Object.entries(params.partsConfig).map(([partName, part]) =>
    mapPartCustomizationToPlacement(partName, part),
  );

  return {
    name: params.name,
    productId: params.productId,
    mockupTemplateId: params.mockupTemplateId,
    selectedVariantId: params.selectedVariantId,
    selectedColor: params.selectedColor,
    selectedSize: params.selectedSize,
    sourceArtworkId: params.sourceArtworkId,
    sourceGeneratedImageId: params.sourceGeneratedImageId,
    sourceImageUrl: params.sourceImageUrl,
    sourcePrompt: params.sourcePrompt,
    thumbnailUrl: params.thumbnailUrl,
    placements,
  };
}

/** Does this part have anything worth saving/rendering (an image, or text)? */
export function isPartConfigured(part: PartCustomization | undefined): boolean {
  if (!part) return false;
  return Boolean(
    part.sourceArtworkId || part.sourceGeneratedImageId || part.imageUrl || (part.textElements && part.textElements.length > 0),
  );
}

/** Should this part be (re)rendered before checkout? A configured part needs rendering when
 * it's marked dirty, or it's missing a render ID, or it's missing a preview URL — an empty
 * (unconfigured) part never needs rendering. Reusing a valid existing render for a part that
 * needs none of the above is what avoids unnecessary re-renders. */
export function partNeedsRender(part: PartCustomization | undefined): boolean {
  if (!isPartConfigured(part)) return false;
  return Boolean(part!.isDirty || !part!.backendRenderId || !part!.mockupImageUrl);
}

/** Pure merge used by both the interactive editor (via a setPartsConfig-wrapping helper) and
 * the checkout finalization loop (on a local accumulator) — one place that decides how a part
 * update affects isDirty (mockup-preview staleness) AND isPrintFileStale (production-file
 * staleness), instead of each call site tracking either by hand. Both default to being marked
 * true together on a printable-property edit (most callers); pass `markDirty: false` for
 * non-printable bookkeeping such as recording a fresh render or a fresh production file, where
 * `changes` should explicitly set whichever of the two flags actually just became clean. */
export function withPartUpdate(
  partsConfig: Record<string, PartCustomization>,
  partName: string,
  changes: Partial<PartCustomization>,
  options?: { markDirty?: boolean },
): Record<string, PartCustomization> {
  const existing = partsConfig[partName];
  const isPrintableEdit = options?.markDirty !== false;
  return {
    ...partsConfig,
    [partName]: {
      ...existing,
      ...changes,
      isDirty: isPrintableEdit ? true : (changes.isDirty ?? existing?.isDirty),
      isPrintFileStale: isPrintableEdit ? (changes.isPrintFileStale ?? true) : (changes.isPrintFileStale ?? existing?.isPrintFileStale),
    },
  };
}
