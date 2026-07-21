import { RefreshCw, FileOutput, Loader2, ExternalLink } from 'lucide-react';
import { cn } from '../../lib/utils.ts';
import { printFilePartStatusLabel, type PrintFileGenerationState, type PrintFilePartDisplayResult } from '../../lib/printFileHelpers.ts';
import type { PartCustomization } from '../../types.ts';

interface ProductionFilePanelProps {
  generationState: PrintFileGenerationState;
  generationError: string | null;
  results: PrintFilePartDisplayResult[];
  partsConfig: Record<string, PartCustomization>;
  onRefreshStatus: () => void;
  onGenerate: () => void;
  refreshDisabled: boolean;
  generateDisabled: boolean;
}

/** Development/admin action — generates the actual production print files (see
 * DEVELOPER_GUIDE.md §2.5b), never a mockup preview. Kept visually and functionally separate
 * from the "Generate Realistic Preview" render elsewhere: different state, different button,
 * different result list, and it never touches the cart or Printify. The parent gates whether
 * this renders at all (see canManageProductionFiles in Customization.tsx) — this component has
 * no opinion on who's allowed to see it. */
export function ProductionFilePanel({
  generationState,
  generationError,
  results,
  partsConfig,
  onRefreshStatus,
  onGenerate,
  refreshDisabled,
  generateDisabled,
}: ProductionFilePanelProps) {
  return (
    <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-neon-purple">
            Production Print Files <span className="text-gray-500">(development/admin)</span>
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-widest text-gray-500">
            Transparent, full-resolution files for fulfilment — not the mockup preview above.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefreshStatus}
            disabled={refreshDisabled}
            title="Check the latest status without generating anything new"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-gray-300 transition-all hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RefreshCw size={12} /> Refresh Status
          </button>
          <button
            type="button"
            onClick={onGenerate}
            disabled={generateDisabled}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neon-purple/40 bg-neon-purple/10 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-neon-purple transition-all hover:bg-neon-purple hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-neon-purple/10 disabled:hover:text-neon-purple"
          >
            {generationState === 'saving' || generationState === 'generating' ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <FileOutput size={12} />
            )}
            Generate Print Files
          </button>
        </div>
      </div>

      {generationState === 'saving' && (
        <p className="text-[10px] uppercase tracking-widest text-gray-400">Saving design…</p>
      )}
      {generationState === 'generating' && (
        <p className="text-[10px] uppercase tracking-widest text-gray-400">Generating print files…</p>
      )}
      {generationState === 'completed' && (
        <p className="text-[10px] uppercase tracking-widest text-emerald-400">Production files up to date.</p>
      )}
      {generationState === 'partial' && (
        <p className="text-[10px] uppercase tracking-widest text-amber-400">Production files partially generated — see per-part results below.</p>
      )}
      {generationState === 'failed' && (
        <p className="text-[10px] uppercase tracking-widest text-neon-pink">
          {generationError || 'Print file generation failed.'}
        </p>
      )}
      {generationState !== 'failed' && generationError && (
        <p className="text-[10px] uppercase tracking-widest text-neon-pink">{generationError}</p>
      )}

      {results.length > 0 && (
        <div className="space-y-2 pt-1">
          {results.map((result) => {
            const isStale = partsConfig[result.partName]?.isPrintFileStale === true;
            const isFailure = result.displayStatus === 'failed';
            const isSkipped = result.displayStatus === 'skipped-empty' || result.displayStatus === 'skipped-unsupported';
            return (
              <div
                key={result.partName}
                className={cn(
                  'rounded-xl border px-3 py-2 text-[10px] uppercase tracking-widest',
                  isFailure
                    ? 'border-neon-pink/30 bg-neon-pink/5 text-neon-pink'
                    : isSkipped
                      ? 'border-white/5 bg-white/[0.02] text-gray-500'
                      : 'border-white/10 bg-white/5 text-gray-300'
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-white">
                    {result.partName}
                    {isStale && !isSkipped && (
                      <span className="ml-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[8px] font-bold text-amber-300 normal-case tracking-normal">
                        Stale — regenerate to match current design
                      </span>
                    )}
                  </span>
                  <span>{printFilePartStatusLabel(result.displayStatus)}</span>
                </div>
                {!isSkipped && !isFailure && (
                  <p className="mt-1 normal-case tracking-normal text-gray-400">
                    {result.width && result.height ? `${result.width} × ${result.height} px` : null}
                    {result.dpi ? ` · ${result.dpi} DPI` : null}
                    {' · Transparent PNG'}
                  </p>
                )}
                {isFailure && result.error && (
                  <p className="mt-1 normal-case tracking-normal">{result.error}</p>
                )}
                {result.printFileUrl && (
                  <a
                    href={result.printFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-neon-blue normal-case tracking-normal hover:underline"
                  >
                    <ExternalLink size={11} /> Open Print File
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
