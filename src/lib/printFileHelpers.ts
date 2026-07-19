import type { MockupTemplatePart, PrintFileResult } from '../types.ts';

/** Explicit states for the *production print-file* generation flow — deliberately its own type,
 * never reusing `SaveStatus` or any mockup-preview-render status, so "saving the design" vs
 * "generating production files" vs "rendering a mockup preview" can never be conflated in the
 * UI (see Customization.tsx's "Mockup Preview" / "Production Print Files" labelling). */
export type PrintFileGenerationState = 'idle' | 'saving' | 'generating' | 'completed' | 'partial' | 'failed';

/** Why a part isn't showing a generated/reused/failed result. `skipped-empty` and
 * `skipped-unsupported` are both reconstructed on the frontend — the backend silently omits
 * unconfigured/unsupported parts from its response rather than reporting a status for them (see
 * `DesignProjectGeneratePrintFilesView` on the backend), so the UI has to infer *why* a
 * template part it knows about is missing from the API result. */
export type PrintFilePartDisplayStatus = 'generated' | 'reused' | 'failed' | 'skipped-empty' | 'skipped-unsupported';

export interface PrintFilePartDisplayResult {
  partName: string;
  displayStatus: PrintFilePartDisplayStatus;
  width?: number | null;
  height?: number | null;
  dpi?: number | null;
  printFileUrl?: string | null;
  error?: string | null;
}

/** Rolls up per-part API results plus every template part the editor knows about into one
 * display list — including parts the backend never mentioned at all, labelled with *why* they
 * were skipped, so the panel never silently drops a part the customer might expect to see.
 * Every part the backend actually generated/reused/failed for is already in `apiResults` (the
 * view reports `status: "failed"` rather than omitting a configured-but-broken part — see
 * `DesignProjectGeneratePrintFilesView`) — a part missing from `apiResults` entirely was
 * therefore always empty or unsupported, never silently dropped for any other reason. */
export function buildPrintFileDisplayResults(params: {
  templateParts: MockupTemplatePart[] | undefined;
  supportedPrintAreas: Set<string> | null;
  apiResults: PrintFileResult[];
}): PrintFilePartDisplayResult[] {
  const { templateParts, supportedPrintAreas, apiResults } = params;
  const resultsByPart = new Map(apiResults.map((result) => [result.partName, result]));
  const allPartNames = new Set<string>([
    ...(templateParts ?? []).map((part) => part.name),
    ...apiResults.map((result) => result.partName),
  ]);

  return Array.from(allPartNames).map((partName) => {
    const apiResult = resultsByPart.get(partName);
    if (apiResult) {
      const displayStatus: PrintFilePartDisplayStatus =
        apiResult.status === 'failed' ? 'failed' : apiResult.reused ? 'reused' : 'generated';
      return {
        partName,
        displayStatus,
        width: apiResult.width,
        height: apiResult.height,
        dpi: apiResult.dpi,
        printFileUrl: apiResult.printFileUrl,
        error: apiResult.error,
      };
    }

    const isSupported = !supportedPrintAreas || supportedPrintAreas.has(partName);
    const displayStatus: PrintFilePartDisplayStatus = !isSupported ? 'skipped-unsupported' : 'skipped-empty';
    return { partName, displayStatus };
  });
}

/** The overall banner state once generation has actually run — 'partial' when some parts
 * succeeded (generated or reused) and others genuinely failed; 'failed' only when nothing
 * succeeded at all. Skipped parts (empty/unsupported) don't count as failures on their own —
 * they were never expected to produce a file. */
export function derivePrintFileGenerationState(results: PrintFilePartDisplayResult[]): 'completed' | 'partial' | 'failed' {
  const failed = results.filter((result) => result.displayStatus === 'failed');
  const succeeded = results.filter((result) => result.displayStatus === 'generated' || result.displayStatus === 'reused');
  if (failed.length === 0) return 'completed';
  if (succeeded.length === 0) return 'failed';
  return 'partial';
}

/** Human-readable label for a per-part status row — kept separate from the raw status value so
 * copy changes don't ripple through the state-derivation logic above. */
export function printFilePartStatusLabel(status: PrintFilePartDisplayStatus): string {
  switch (status) {
    case 'generated':
      return 'Generated';
    case 'reused':
      return 'Reused existing file';
    case 'failed':
      return 'Failed';
    case 'skipped-unsupported':
      return 'Skipped — not supported by this colour/size';
    case 'skipped-empty':
      return 'Skipped — nothing configured on this part';
    default:
      return status;
  }
}
