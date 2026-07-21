import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface EditorSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/** Shared mobile bottom-sheet chrome (backdrop + slide-up panel + close button) — reused by
 * whichever editor panel needs an overlay presentation on small screens. Viewport-agnostic on
 * purpose: callers decide when to mount it (typically behind a `lg:hidden` trigger), it never
 * checks screen size itself. Sits at z-[45] — above the canvas/top bar/bottom nav (z-40 and
 * below) and below the three existing full-screen modals (Crop Studio z-50, Gallery/AI z-[200]),
 * so nothing about those needs to change. */
export function EditorSheet({ isOpen, onClose, title, children }: EditorSheetProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[45] flex items-end justify-center bg-cyber-black/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="editor-sheet-title"
          onKeyDown={(event) => {
            if (event.key === 'Escape') onClose();
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="glass-card relative flex max-h-[80vh] w-full flex-col overflow-hidden rounded-b-none border-b-0 border-white/15 p-0"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h3 id="editor-sheet-title" className="text-sm font-display font-black uppercase tracking-widest text-white">
                {title}
              </h3>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-300 hover:text-white"
              >
                <X size={15} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
