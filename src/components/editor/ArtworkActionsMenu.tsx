import { Image as ImageIcon, Upload, Wand2, Type, Trash2, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils.ts';

interface ArtworkActionsMenuProps {
  layout: 'rail' | 'list';
  onOpenGallery: () => void;
  onUploadClick: () => void;
  isUploading: boolean;
  uploadProgress?: number;
  onGenerateAI: () => void;
  onAddText: () => void;
  onRemove: () => void;
  canRemove: boolean;
}

const ACTION_BUTTON_BASE =
  'flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 text-gray-200 transition-all hover:border-neon-blue/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-50';

/** The five ways to put artwork on the active part: Gallery / Upload / AI / Add Text / Remove.
 * Rendered once — the caller mounts it as a vertical icon rail on desktop (`layout="rail"`) or
 * as full-width labeled rows inside a mobile EditorSheet (`layout="list"`); same buttons, same
 * handlers, only the container styling differs. */
export function ArtworkActionsMenu({
  layout,
  onOpenGallery,
  onUploadClick,
  isUploading,
  uploadProgress,
  onGenerateAI,
  onAddText,
  onRemove,
  canRemove,
}: ArtworkActionsMenuProps) {
  const isRail = layout === 'rail';
  // Once the active part has artwork, these two actions read as "replace what's there" rather
  // than "add something new" — Upload/Add Text/Remove already say what they do either way.
  const galleryLabel = canRemove ? 'Replace' : 'Gallery';
  const aiLabel = canRemove ? 'Generate' : 'AI';
  const uploadLabel = isUploading
    ? uploadProgress && uploadProgress > 0
      ? `${uploadProgress}%`
      : 'Uploading'
    : 'Upload';

  return (
    <div
      role="toolbar"
      aria-label="Artwork actions"
      className={isRail ? 'flex flex-col items-center gap-2' : 'flex flex-col gap-2'}
    >
      <button
        type="button"
        onClick={onOpenGallery}
        aria-label={canRemove ? 'Replace design from gallery' : 'Choose design from gallery'}
        className={cn(ACTION_BUTTON_BASE, isRail ? 'h-14 w-14 flex-col justify-center gap-1 px-1 text-center' : 'w-full px-4 py-3')}
      >
        <ImageIcon size={isRail ? 17 : 15} />
        <span className={isRail ? 'text-[8px] font-bold uppercase tracking-wide' : 'text-[10px] font-bold uppercase tracking-widest'}>
          {galleryLabel}
        </span>
      </button>
      <button
        type="button"
        onClick={onUploadClick}
        disabled={isUploading}
        aria-label={canRemove ? 'Upload a replacement design' : 'Upload a design'}
        className={cn(ACTION_BUTTON_BASE, isRail ? 'h-14 w-14 flex-col justify-center gap-1 px-1 text-center' : 'w-full px-4 py-3')}
      >
        {isUploading ? <Loader2 size={isRail ? 17 : 15} className="animate-spin" /> : <Upload size={isRail ? 17 : 15} />}
        <span className={isRail ? 'text-[8px] font-bold uppercase tracking-wide' : 'text-[10px] font-bold uppercase tracking-widest'}>
          {uploadLabel}
        </span>
      </button>
      <button
        type="button"
        onClick={onGenerateAI}
        aria-label={canRemove ? 'Generate a replacement design with AI' : 'Generate a design with AI'}
        className={cn(ACTION_BUTTON_BASE, isRail ? 'h-14 w-14 flex-col justify-center gap-1 px-1 text-center' : 'w-full px-4 py-3')}
      >
        <Wand2 size={isRail ? 17 : 15} />
        <span className={isRail ? 'text-[8px] font-bold uppercase tracking-wide' : 'text-[10px] font-bold uppercase tracking-widest'}>
          {aiLabel}
        </span>
      </button>
      <button
        type="button"
        onClick={onAddText}
        aria-label="Add a text layer"
        className={cn(ACTION_BUTTON_BASE, isRail ? 'h-14 w-14 flex-col justify-center gap-1 px-1 text-center' : 'w-full px-4 py-3')}
      >
        <Type size={isRail ? 17 : 15} />
        <span className={isRail ? 'text-[8px] font-bold uppercase tracking-wide' : 'text-[10px] font-bold uppercase tracking-widest'}>
          Add Text
        </span>
      </button>
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove the current design from this part"
          className={cn(
            'flex items-center gap-2.5 rounded-xl border border-neon-pink/30 bg-neon-pink/10 text-neon-pink transition-all hover:bg-neon-pink hover:text-white',
            isRail ? 'h-14 w-14 flex-col justify-center gap-1 px-1 text-center' : 'w-full px-4 py-3'
          )}
        >
          <Trash2 size={isRail ? 17 : 15} />
          <span className={isRail ? 'text-[8px] font-bold uppercase tracking-wide' : 'text-[10px] font-bold uppercase tracking-widest'}>
            Remove
          </span>
        </button>
      )}
    </div>
  );
}
