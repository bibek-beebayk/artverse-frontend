import { useState } from 'react';
import { ChevronLeft, Info, Undo2, Redo2, Save, Check, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils.ts';

type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

interface EditorTopBarProps {
  onBack: () => void;
  productType: string;
  templateName?: string;
  variantSummary: string | null;
  undoDisabled: boolean;
  redoDisabled: boolean;
  onUndo: () => void;
  onRedo: () => void;
  isPreviewMode: boolean;
  onSelectEdit: () => void;
  onSelectPreview: () => void;
  previewDisabled: boolean;
  saveStatus: SaveStatus;
  saveError: string | null;
  onSave: () => void;
}

const SAVE_STATUS_STYLE: Record<SaveStatus, string> = {
  idle: 'border-white/10 bg-white/5 text-gray-300 hover:border-white/30 hover:text-white',
  dirty: 'border-neon-blue/40 bg-neon-blue/10 text-neon-blue hover:bg-neon-blue/20',
  saving: 'border-white/10 bg-white/5 text-gray-400',
  saved: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-400',
  error: 'border-neon-pink/40 bg-neon-pink/10 text-neon-pink',
};

const SAVE_STATUS_LABEL: Record<SaveStatus, string> = {
  idle: 'Save',
  dirty: 'Save',
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Save failed',
};

/** Full-screen editor's own top bar — back, product info, Edit/Preview, Save. Renders instead
 * of the site's global Navbar on /customize* (see App.tsx's LayoutRoute split). */
export function EditorTopBar({
  onBack,
  productType,
  templateName,
  variantSummary,
  undoDisabled,
  redoDisabled,
  onUndo,
  onRedo,
  isPreviewMode,
  onSelectEdit,
  onSelectPreview,
  previewDisabled,
  saveStatus,
  saveError,
  onSave,
}: EditorTopBarProps) {
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-white/10 bg-cyber-black/95 px-3 py-3 backdrop-blur-xl sm:px-5">
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-300 transition-all hover:border-white/30 hover:text-white"
        >
          <ChevronLeft size={17} />
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsInfoOpen((open) => !open)}
            aria-label="Product info"
            aria-expanded={isInfoOpen}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-full border transition-all',
              isInfoOpen
                ? 'border-neon-blue/50 bg-neon-blue/10 text-neon-blue'
                : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/30 hover:text-white'
            )}
          >
            <Info size={16} />
          </button>
          {isInfoOpen && (
            <div className="absolute left-0 top-11 z-10 w-64 rounded-2xl border border-white/10 bg-cyber-gray/95 p-4 shadow-[0_10px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl">
              <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-neon-blue">{productType}</p>
              {templateName && (
                <p className="mt-1 text-[10px] uppercase tracking-widest text-gray-400">{templateName}</p>
              )}
              {variantSummary && (
                <p className="mt-2 text-[10px] uppercase tracking-widest text-gray-500">{variantSummary}</p>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onUndo}
          disabled={undoDisabled}
          title="Undo (Ctrl/Cmd+Z)"
          className="hidden h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-300 transition-all hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 sm:flex"
        >
          <Undo2 size={15} />
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={redoDisabled}
          title="Redo (Ctrl/Cmd+Shift+Z)"
          className="hidden h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-300 transition-all hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 sm:flex"
        >
          <Redo2 size={15} />
        </button>
      </div>

      <div className="flex items-center overflow-hidden rounded-full border border-white/10 bg-white/5 p-1 text-[9px] font-bold uppercase tracking-widest">
        <button
          type="button"
          onClick={onSelectEdit}
          className={cn(
            'rounded-full px-3.5 py-1.5 transition-all sm:px-4',
            !isPreviewMode ? 'bg-white text-cyber-black' : 'text-gray-400 hover:text-white'
          )}
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onSelectPreview}
          disabled={previewDisabled}
          title={previewDisabled ? 'Add a design to this part first' : undefined}
          className={cn(
            'rounded-full px-3.5 py-1.5 transition-all sm:px-4',
            isPreviewMode ? 'bg-white text-cyber-black' : 'text-gray-400 hover:text-white',
            previewDisabled && 'cursor-not-allowed opacity-40 hover:text-gray-400'
          )}
        >
          Preview
        </button>
      </div>

      <button
        type="button"
        onClick={onSave}
        disabled={saveStatus === 'saving'}
        title={saveStatus === 'error' ? saveError || undefined : undefined}
        className={cn(
          'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[9px] font-black uppercase tracking-widest transition-all disabled:cursor-not-allowed sm:px-4',
          SAVE_STATUS_STYLE[saveStatus]
        )}
      >
        {saveStatus === 'saving' && <Loader2 size={13} className="animate-spin" />}
        {saveStatus === 'saved' && <Check size={13} />}
        {saveStatus === 'error' && <AlertCircle size={13} />}
        {(saveStatus === 'idle' || saveStatus === 'dirty') && <Save size={13} />}
        <span className="hidden sm:inline">{SAVE_STATUS_LABEL[saveStatus]}</span>
      </button>
    </header>
  );
}
