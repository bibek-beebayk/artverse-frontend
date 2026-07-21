import { Palette, Plus, Layers } from 'lucide-react';

interface EditorBottomNavProps {
  onOpenActions: () => void;
  onOpenVariants: () => void;
  onOpenLayers: () => void;
}

const NAV_BUTTON =
  'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[9px] font-bold uppercase tracking-widest text-gray-400 transition-colors hover:text-white';

/** Mobile-only fixed bottom bar: Variants / + / Layers, matching the reference's editor nav. */
export function EditorBottomNav({ onOpenActions, onOpenVariants, onOpenLayers }: EditorBottomNavProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center border-t border-white/10 bg-cyber-black/95 px-4 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <button type="button" onClick={onOpenVariants} className={NAV_BUTTON}>
        <Palette size={17} />
        Variants
      </button>
      <div className="flex flex-1 items-center justify-center">
        <button
          type="button"
          onClick={onOpenActions}
          aria-label="Add artwork"
          className="-translate-y-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-cyber-black shadow-[0_0_15px_rgba(255,255,255,0.2)] transition-all hover:bg-neon-purple hover:text-white"
        >
          <Plus size={22} />
        </button>
      </div>
      <button type="button" onClick={onOpenLayers} className={NAV_BUTTON}>
        <Layers size={17} />
        Layers
      </button>
    </nav>
  );
}
