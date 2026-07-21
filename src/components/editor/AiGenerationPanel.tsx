import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, Wand2, Check } from 'lucide-react';

interface AspectRatioOption {
  value: string;
  label: string;
}

interface AiGenerationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: string;
  onPromptChange: (value: string) => void;
  aspectRatio: string;
  onAspectRatioChange: (value: string) => void;
  aspectRatioOptions: readonly AspectRatioOption[];
  error: string | null;
  generatedImageUrl: string | null;
  isGenerating: boolean;
  isApplying: boolean;
  onGenerate: () => void;
  onApply: () => void;
}

/** "Generate with AI" panel — embedded, never navigates away. Generation itself goes through the
 * shared useAiGeneration() hook (see Customization.tsx); this component is purely presentational
 * — it owns no request/status logic of its own. Selecting a result promotes it to a private
 * SourceDesignAsset server-side and applies it to the active part (routed through the same
 * replacement-confirmation path as Gallery/Upload). */
export function AiGenerationPanel({
  isOpen,
  onClose,
  prompt,
  onPromptChange,
  aspectRatio,
  onAspectRatioChange,
  aspectRatioOptions,
  error,
  generatedImageUrl,
  isGenerating,
  isApplying,
  onGenerate,
  onApply,
}: AiGenerationPanelProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-cyber-black/85 px-4 py-8 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ai-panel-title"
          onKeyDown={(event) => {
            if (event.key === 'Escape') onClose();
          }}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            className="glass-card relative w-full max-w-lg border-white/15 p-6"
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 id="ai-panel-title" className="text-lg font-display font-black uppercase tracking-widest text-white">
                Generate with AI
              </h3>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close AI generation panel"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-300 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <label htmlFor="ai-prompt" className="mb-2 block text-[9px] font-bold uppercase tracking-widest text-gray-400">
              Prompt
            </label>
            <textarea
              id="ai-prompt"
              value={prompt}
              onChange={(event) => onPromptChange(event.target.value)}
              placeholder="Describe the design you want..."
              rows={3}
              className="mb-4 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none focus:border-neon-purple/50"
            />

            <label htmlFor="ai-aspect-ratio" className="mb-2 block text-[9px] font-bold uppercase tracking-widest text-gray-400">
              Aspect Ratio
            </label>
            <select
              id="ai-aspect-ratio"
              value={aspectRatio}
              onChange={(event) => onAspectRatioChange(event.target.value)}
              className="mb-5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-neon-purple/50"
            >
              {aspectRatioOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {error && (
              <div className="mb-4 rounded-xl border border-neon-pink/25 bg-neon-pink/10 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-neon-pink">
                {error}
              </div>
            )}

            {generatedImageUrl && (
              <div className="mb-5 overflow-hidden rounded-2xl border border-white/10">
                <img src={generatedImageUrl} alt="AI generated design preview" className="w-full" />
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-neon-purple/40 bg-neon-purple/10 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-neon-purple/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                {isGenerating ? 'Generating...' : generatedImageUrl ? 'Regenerate' : 'Generate'}
              </button>
              {generatedImageUrl && (
                <button
                  type="button"
                  onClick={onApply}
                  disabled={isApplying}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-[10px] font-black uppercase tracking-widest text-cyber-black transition-all hover:bg-neon-purple hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isApplying ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  {isApplying ? 'Saving...' : 'Use This Design'}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
