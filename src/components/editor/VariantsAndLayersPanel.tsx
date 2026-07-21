import {
  Layers,
  Palette,
  Move,
  Crop,
  Sparkles,
  AlertCircle,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Copy as CopyIcon,
  Type,
  Trash2,
} from 'lucide-react';
import { cn } from '../../lib/utils.ts';
import type { CropOverride, TextElement } from '../../types.ts';

interface VariantsAndLayersPanelProps {
  // Variants
  colours: string[];
  selectedColour: string;
  onSelectColour: (colour: string) => void;
  sizes: string[];
  selectedSize: string;
  onSelectSize: (size: string) => void;
  describeOptionSellability: (kind: 'colour' | 'size', value: string) => { disabled: boolean; reason: string | null };

  // Layers — active part's design image
  activePartImageUrl?: string;
  activePartHasImage: boolean;
  imageQualityWarnings: string[];
  onRemoveImage: () => void;
  cornerRadius: number;
  onCornerRadiusChange: (value: number) => void;
  onCornerRadiusPointerDown: () => void;
  onCornerRadiusPointerUp: () => void;
  hasAppliedCrop: boolean;
  appliedCropOverride: CropOverride | null;
  onOpenCropStudio: () => void;
  onClearCrop: () => void;
  onResetPlacement: () => void;

  // Layers — text
  textElements: TextElement[];
  activeTextId: string | null;
  onAddText: () => void;
  onSetActiveText: (id: string) => void;
  onRenameText: (id: string, name: string) => void;
  onToggleLock: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onDuplicateText: (id: string) => void;
  onMoveTextUp: (id: string) => void;
  onMoveTextDown: (id: string) => void;
  onDeleteText: (id: string) => void;
  onUpdateText: (id: string, changes: Partial<TextElement>, options?: { recordHistory?: boolean }) => void;
  beginContinuousEdit: () => void;
  endContinuousEdit: () => void;
}

const SECTION_LABEL = 'flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.3em] text-gray-400 mb-3';
const SWATCH_IDLE =
  'px-4 py-2 text-[9px] font-extrabold uppercase tracking-widest rounded-lg border transition-all bg-white/5 border-white/10 text-gray-400 hover:text-white';
const SWATCH_DISABLED = 'bg-white/5 border-white/5 text-gray-600 cursor-not-allowed opacity-50';

/** Variants (colour/size) + Layers (the active part's design image, with its placement/crop
 * controls, and the text-layer stack) — the reference's "Variants and layers" panel. Rendered
 * once as content; the caller mounts it as a static desktop `<aside>` or inside a mobile
 * `EditorSheet`. All handlers are the exact same functions Customization.tsx already defines —
 * nothing here re-implements any editing logic, it only presents it. */
export function VariantsAndLayersPanel({
  colours,
  selectedColour,
  onSelectColour,
  sizes,
  selectedSize,
  onSelectSize,
  describeOptionSellability,
  activePartImageUrl,
  activePartHasImage,
  imageQualityWarnings,
  onRemoveImage,
  cornerRadius,
  onCornerRadiusChange,
  onCornerRadiusPointerDown,
  onCornerRadiusPointerUp,
  hasAppliedCrop,
  appliedCropOverride,
  onOpenCropStudio,
  onClearCrop,
  onResetPlacement,
  textElements,
  activeTextId,
  onAddText,
  onSetActiveText,
  onRenameText,
  onToggleLock,
  onToggleVisibility,
  onDuplicateText,
  onMoveTextUp,
  onMoveTextDown,
  onDeleteText,
  onUpdateText,
  beginContinuousEdit,
  endContinuousEdit,
}: VariantsAndLayersPanelProps) {
  return (
    <div className="space-y-8">
      {(colours.length > 0 || sizes.length > 0) && (
        <section>
          <h2 className={SECTION_LABEL}>
            <Palette size={13} /> Variants
          </h2>
          <div className="space-y-5">
            {colours.length > 0 && (
              <div>
                <p className="mb-2 text-[8px] font-bold uppercase tracking-[0.3em] text-gray-500">Colors</p>
                <div className="flex flex-wrap gap-2.5">
                  {colours.map((colour) => {
                    const { disabled, reason } = describeOptionSellability('colour', colour);
                    return (
                      <button
                        key={colour}
                        disabled={disabled}
                        title={reason ?? undefined}
                        onClick={() => !disabled && onSelectColour(colour)}
                        className={cn(
                          SWATCH_IDLE,
                          disabled ? SWATCH_DISABLED : selectedColour === colour && 'bg-white text-cyber-black border-white'
                        )}
                      >
                        {colour}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {sizes.length > 0 && (
              <div>
                <p className="mb-2 text-[8px] font-bold uppercase tracking-[0.3em] text-gray-500">Size</p>
                <div className="flex flex-wrap gap-2.5">
                  {sizes.map((size) => {
                    const { disabled, reason } = describeOptionSellability('size', size);
                    return (
                      <button
                        key={size}
                        disabled={disabled}
                        title={reason ?? undefined}
                        onClick={() => !disabled && onSelectSize(size)}
                        className={cn(
                          SWATCH_IDLE,
                          disabled ? SWATCH_DISABLED : selectedSize === size && 'bg-white text-cyber-black border-white'
                        )}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <section>
        <h2 className={SECTION_LABEL}>
          <Layers size={13} /> Layers
        </h2>

        {activePartHasImage && (
          <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-start gap-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-cyber-black/60">
                {activePartImageUrl && (
                  <img src={activePartImageUrl} alt="Active design layer" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] font-bold uppercase tracking-widest text-white">Design Image</p>
                <p className="mt-1 text-[9px] uppercase tracking-widest text-gray-500">
                  {imageQualityWarnings.length > 0 ? 'Resolution may be low for this print area' : 'Ready for print'}
                </p>
              </div>
              <button
                type="button"
                onClick={onRemoveImage}
                aria-label="Remove design image"
                className="shrink-0 rounded-lg p-1.5 text-gray-500 transition-colors hover:text-neon-pink"
              >
                <Trash2 size={14} />
              </button>
            </div>

            {imageQualityWarnings.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {imageQualityWarnings.map((warning) => (
                  <div key={warning} className="flex items-start gap-1.5 text-[9px] uppercase tracking-wide text-amber-300">
                    <AlertCircle size={11} className="mt-0.5 shrink-0" />
                    <span className="normal-case tracking-normal">{warning}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 space-y-4 border-t border-white/10 pt-4">
              <div>
                <div className="mb-2 flex items-center justify-between text-[9px] uppercase tracking-widest text-gray-500">
                  <span className="inline-flex items-center gap-1.5">
                    <Sparkles size={11} /> Corner Radius
                  </span>
                  <span>{cornerRadius}px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={120}
                  step={2}
                  value={cornerRadius}
                  onPointerDown={onCornerRadiusPointerDown}
                  onChange={(event) => onCornerRadiusChange(Number(event.target.value))}
                  onPointerUp={onCornerRadiusPointerUp}
                  className="w-full accent-neon-blue"
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-[0.3em] text-gray-400">
                    <Crop size={11} /> Crop
                  </p>
                  <p className="mt-1 truncate text-[9px] uppercase tracking-widest text-gray-500">
                    {hasAppliedCrop
                      ? `Applied • ${Math.round(appliedCropOverride?.width ?? 100)} × ${Math.round(appliedCropOverride?.height ?? 100)}`
                      : 'Full design visible'}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={onOpenCropStudio}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-widest text-gray-300 transition-all hover:border-white/20 hover:text-white"
                  >
                    {hasAppliedCrop ? 'Edit' : 'Crop'}
                  </button>
                  {hasAppliedCrop && (
                    <button
                      type="button"
                      onClick={onClearCrop}
                      className="rounded-lg border border-neon-pink/30 bg-neon-pink/10 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-widest text-neon-pink transition-all hover:bg-neon-pink hover:text-white"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={onResetPlacement}
                className="inline-flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-gray-400 transition-colors hover:text-white"
              >
                <Move size={11} /> Reset Placement
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onAddText}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white transition-all hover:border-white/30 hover:bg-white/20"
        >
          <Type size={14} /> Add New Text Block
        </button>

        {textElements.length > 0 && (
          <div className="space-y-4">
            {textElements.map((textEl) => (
              <div
                key={textEl.id}
                className={cn(
                  'rounded-2xl border bg-white/5 p-4 transition-all',
                  activeTextId === textEl.id ? 'border-neon-pink' : 'border-white/10',
                  textEl.isHidden && 'opacity-50'
                )}
              >
                <div className="mb-4 flex items-center justify-between gap-2">
                  <input
                    type="text"
                    value={textEl.layerName ?? ''}
                    onFocus={() => {
                      onSetActiveText(textEl.id);
                      beginContinuousEdit();
                    }}
                    onChange={(event) => onRenameText(textEl.id, event.target.value)}
                    onBlur={endContinuousEdit}
                    className="mr-2 min-w-0 w-full border-b border-white/20 bg-transparent text-sm text-white focus:border-neon-pink focus:outline-none"
                    placeholder={textEl.text.slice(0, 24) || 'Text layer'}
                  />
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onToggleLock(textEl.id)}
                      className={cn('rounded p-1.5 transition-colors', textEl.isLocked ? 'text-neon-blue' : 'text-gray-500 hover:text-white')}
                      title={textEl.isLocked ? 'Unlock layer' : 'Lock layer (prevents dragging on the preview)'}
                    >
                      {textEl.isLocked ? <Lock size={13} /> : <Unlock size={13} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleVisibility(textEl.id)}
                      className={cn('rounded p-1.5 transition-colors', textEl.isHidden ? 'text-neon-pink' : 'text-gray-500 hover:text-white')}
                      title={textEl.isHidden ? 'Show layer' : 'Hide layer (kept, just not shown or printed)'}
                    >
                      {textEl.isHidden ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDuplicateText(textEl.id)}
                      className="rounded p-1.5 text-gray-500 transition-colors hover:text-white"
                      title="Duplicate layer"
                    >
                      <CopyIcon size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onMoveTextUp(textEl.id)}
                      className="px-1.5 text-xs font-bold uppercase tracking-widest text-gray-500 transition-colors hover:text-white"
                      title="Move Layer Forward"
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      onClick={() => onMoveTextDown(textEl.id)}
                      className="px-1.5 text-xs font-bold uppercase tracking-widest text-gray-500 transition-colors hover:text-white"
                      title="Move Layer Backward"
                    >
                      Down
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteText(textEl.id)}
                      className="pl-1.5 text-xs font-bold uppercase tracking-widest text-gray-500 transition-colors hover:text-neon-pink"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {activeTextId === textEl.id && (
                  <div className="space-y-4 border-t border-white/10 pt-4">
                    <div>
                      <label className="mb-2 block text-[8px] font-bold uppercase tracking-[0.3em] text-gray-400">Text</label>
                      <textarea
                        value={textEl.text}
                        onFocus={beginContinuousEdit}
                        onChange={(event) => onUpdateText(textEl.id, { text: event.target.value }, { recordHistory: false })}
                        onBlur={endContinuousEdit}
                        rows={2}
                        className="w-full resize-y rounded border border-white/20 bg-cyber-black p-2 text-sm text-white outline-none focus:border-neon-pink"
                        placeholder="Type here... (use a new line for multi-line text)"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-[8px] font-bold uppercase tracking-[0.3em] text-gray-400">Font Size</label>
                      <input
                        type="range"
                        min={12}
                        max={200}
                        value={textEl.fontSize}
                        onPointerDown={beginContinuousEdit}
                        onChange={(event) => onUpdateText(textEl.id, { fontSize: Number(event.target.value) }, { recordHistory: false })}
                        onPointerUp={endContinuousEdit}
                        className="w-full accent-neon-pink"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-[8px] font-bold uppercase tracking-[0.3em] text-gray-400">Rotation</label>
                      <input
                        type="range"
                        min={-180}
                        max={180}
                        value={textEl.rotation || 0}
                        onPointerDown={beginContinuousEdit}
                        onChange={(event) => onUpdateText(textEl.id, { rotation: Number(event.target.value) }, { recordHistory: false })}
                        onPointerUp={endContinuousEdit}
                        className="w-full accent-neon-pink"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-[8px] font-bold uppercase tracking-[0.3em] text-gray-400">Letter Spacing</label>
                      <input
                        type="range"
                        min={-20}
                        max={100}
                        value={textEl.letterSpacing || 0}
                        onPointerDown={beginContinuousEdit}
                        onChange={(event) => onUpdateText(textEl.id, { letterSpacing: Number(event.target.value) }, { recordHistory: false })}
                        onPointerUp={endContinuousEdit}
                        className="w-full accent-neon-pink"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-[8px] font-bold uppercase tracking-[0.3em] text-gray-400">Line Spacing</label>
                      <input
                        type="range"
                        min={0.8}
                        max={2.5}
                        step={0.1}
                        value={textEl.lineHeight ?? 1.2}
                        onPointerDown={beginContinuousEdit}
                        onChange={(event) => onUpdateText(textEl.id, { lineHeight: Number(event.target.value) }, { recordHistory: false })}
                        onPointerUp={endContinuousEdit}
                        className="w-full accent-neon-pink"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-[8px] font-bold uppercase tracking-[0.3em] text-gray-400">Alignment</label>
                      <div className="flex gap-2">
                        {(['left', 'center', 'right'] as const).map((align) => (
                          <button
                            key={align}
                            type="button"
                            onClick={() => onUpdateText(textEl.id, { textAlign: align })}
                            className={cn(
                              'flex-1 rounded border px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest transition-colors',
                              (textEl.textAlign ?? 'center') === align
                                ? 'border-neon-blue bg-neon-blue text-cyber-black'
                                : 'border-white/20 bg-transparent text-gray-400 hover:border-white/50'
                            )}
                          >
                            {align}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-2 block text-[8px] font-bold uppercase tracking-[0.3em] text-gray-400">Color</label>
                        <input
                          type="color"
                          value={textEl.color}
                          onFocus={beginContinuousEdit}
                          onChange={(event) => onUpdateText(textEl.id, { color: event.target.value }, { recordHistory: false })}
                          onBlur={endContinuousEdit}
                          className="h-8 w-full cursor-pointer rounded bg-transparent"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-[8px] font-bold uppercase tracking-[0.3em] text-gray-400">Font</label>
                        <select
                          value={textEl.fontFamily}
                          onChange={(event) => onUpdateText(textEl.id, { fontFamily: event.target.value })}
                          className="w-full rounded border border-white/20 bg-cyber-black p-1.5 text-xs text-white outline-none focus:border-neon-pink"
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
                    <div className="mt-2 flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => onUpdateText(textEl.id, { isBold: !textEl.isBold })}
                        className={cn(
                          'rounded border px-3 py-1.5 text-xs font-bold transition-colors',
                          textEl.isBold ? 'border-neon-blue bg-neon-blue text-cyber-black' : 'border-white/20 bg-transparent text-gray-400 hover:border-white/50'
                        )}
                      >
                        BOLD
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateText(textEl.id, { isItalic: !textEl.isItalic })}
                        className={cn(
                          'rounded border px-3 py-1.5 text-xs italic transition-colors',
                          textEl.isItalic ? 'border-neon-pink bg-neon-pink text-white' : 'border-white/20 bg-transparent text-gray-400 hover:border-white/50'
                        )}
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
      </section>
    </div>
  );
}
