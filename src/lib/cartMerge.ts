import type { DesignProjectWriteInput } from './api.ts';
import { mapEditorStateToDesignProjectWriteInput } from './designProjectMapping.ts';
import type { CartItem, PartCustomization, ProductVariant } from '../types.ts';

/** Case-insensitive colour/size match — guest CartItems store the selected colour/size as
 * plain display strings (whatever the customization editor showed at the time), which may not
 * match a ProductVariant's stored casing exactly. */
export function findMatchingVariant(
  variants: ProductVariant[],
  colour: string,
  size: string
): ProductVariant | undefined {
  const normalize = (value: string) => value.trim().toLowerCase();
  return variants.find(
    (variant) => normalize(variant.colorName) === normalize(colour) && normalize(variant.size) === normalize(size)
  );
}

/** A guest (localStorage-only) CartItem never has a real backend DesignProject — it only went
 * through the anonymous customization flow, which today skips `persistDesignProject()`
 * entirely (see `Customization.tsx`'s `if (user)` guard around that call). To merge it into the
 * backend cart on login, one has to be created first. Reuses the same
 * `mapEditorStateToDesignProjectWriteInput` the authenticated save flow already uses, rather
 * than re-deriving the placement/crop/text payload shape here. */
export function buildDesignProjectInputForGuestItem(item: CartItem, variant: ProductVariant): DesignProjectWriteInput {
  const partsConfig: Record<string, PartCustomization> =
    item.partsConfig ??
    {
      front: {
        imageUrl: item.originalImageUrl,
        placementOverride: item.placementOverride,
        cropOverride: item.cropOverride,
        textElements: item.textElements,
        backendRenderId: item.backendRenderId,
        mockupImageUrl: item.mockupImageUrl,
      },
    };

  return mapEditorStateToDesignProjectWriteInput({
    mockupTemplateId: item.templateId!,
    productId: variant.productId ?? undefined,
    selectedVariantId: variant.id,
    selectedColor: item.selectedColour,
    selectedSize: item.selectedSize,
    sourceArtworkId: item.sourceArtworkId,
    sourceImageUrl: item.originalImageUrl,
    sourcePrompt: item.userPrompt,
    thumbnailUrl: item.mockupImageUrl,
    partsConfig,
  });
}
