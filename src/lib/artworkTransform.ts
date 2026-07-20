/** The admin-configured, non-draggable print boundary for a template part (mirrors the
 * backend's `get_fixed_print_area()` / the editor's `activeFixedPrintArea`) — the space a
 * default artwork placement should be centered/fit within, not the full template canvas. */
export interface FixedPrintArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ArtworkTransform {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The default placement for a newly-attached artwork (Gallery selection, Upload, or an
 * AI-generated result) — fit the source image inside the fixed print area preserving aspect
 * ratio ("contain"), centered, never exceeding the area's bounds. The user can drag/resize
 * afterward; this only sets the starting point. Mirrors the same contain-and-center math the
 * editor already uses when first sizing a design against `basePlacement` (see the effect in
 * Customization.tsx keyed on `designDimensions`) — kept here as one reusable, pure, testable
 * function instead of being duplicated per artwork-source entry point (Gallery/Upload/AI). */
export function createDefaultArtworkTransform(
  sourceWidth: number,
  sourceHeight: number,
  printArea: FixedPrintArea,
): ArtworkTransform {
  if (sourceWidth <= 0 || sourceHeight <= 0 || printArea.width <= 0 || printArea.height <= 0) {
    return { x: printArea.x, y: printArea.y, width: printArea.width, height: printArea.height };
  }

  const sourceAspect = sourceWidth / sourceHeight;
  const areaAspect = printArea.width / printArea.height;

  let width: number;
  let height: number;
  if (sourceAspect >= areaAspect) {
    // Source is relatively wider than the print area — width-bound.
    width = printArea.width;
    height = width / sourceAspect;
  } else {
    // Source is relatively taller — height-bound.
    height = printArea.height;
    width = height * sourceAspect;
  }

  return {
    x: printArea.x + (printArea.width - width) / 2,
    y: printArea.y + (printArea.height - height) / 2,
    width,
    height,
  };
}
