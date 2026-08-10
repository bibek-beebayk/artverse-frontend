/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils.ts";

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** "lg" for forms with several image fields and/or the placement editor, which need more
   * room than a flat text-field form does. Defaults to "md". */
  size?: "md" | "lg";
}

// Centered admin create/edit dialog — same glass-card/backdrop/close-button chrome as
// src/components/editor/EditorSheet.tsx, adapted to a centered panel (appropriate for a desktop
// admin form) instead of a mobile bottom sheet.
//
// IMPORTANT: never nest one AdminModal inside another. Framer Motion keeps an inline `transform`
// on the animated panel even at rest (`scale: 1`), which makes that panel the containing block
// for any descendant `position: fixed` element — a second AdminModal mounted inside it would
// render clipped to the first modal's box instead of the viewport. Compose "modal that opens
// another modal" flows as sibling state on the same page instead (see MockupTemplatesPage.tsx's
// Parts tab, which replaced an earlier Manage-Parts-modal-containing-a-part-editor-modal design
// for exactly this reason).
export function AdminModal({ isOpen, onClose, title, children, size = "md" }: AdminModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-cyber-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-modal-title"
          onKeyDown={(event) => {
            if (event.key === "Escape") onClose();
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className={cn(
              "glass-card relative flex max-h-[85vh] w-full flex-col overflow-hidden border-white/15 p-0",
              size === "lg" ? "max-w-3xl" : "max-w-lg",
            )}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h3 id="admin-modal-title" className="text-sm font-display font-black uppercase tracking-widest text-white">
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
