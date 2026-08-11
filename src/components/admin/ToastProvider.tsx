/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Transient, color-coded, auto-dismissing feedback for admin panel CRUD/actions (create/update/
// delete a resource, activate/deactivate, sync from Printify, bulk actions, ...) — distinct from
// AdminDialogProvider, which is for things that need a decision (confirm/prompt) or a message the
// user must actively dismiss (a blocking form-save failure). A toast never blocks interaction and
// never needs a click to go away, so it's the right fit for "here's what just happened," not
// "you need to decide something" or "read this before continuing."
//
// Mounted once at the admin app root (AdminApp.tsx), same placement rationale as
// AdminDialogProvider: rendered as a sibling to AdminLayout, not a descendant of any AdminModal,
// so it's never at risk of the nested-modal clipping bug AdminModal's docstring warns about.

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "../../lib/utils.ts";

export type ToastVariant = "success" | "error" | "warning" | "info";

interface ToastOptions {
  title?: string;
  /** Milliseconds before auto-dismiss. Defaults by variant (errors stay up longer) — pass 0 to
   * disable auto-dismiss entirely (the user must close it manually). */
  duration?: number;
}

interface ToastItem {
  id: number;
  variant: ToastVariant;
  message: ReactNode;
  title?: string;
}

interface ToastContextValue {
  show: (variant: ToastVariant, message: ReactNode, options?: ToastOptions) => void;
  success: (message: ReactNode, options?: ToastOptions) => void;
  error: (message: ReactNode, options?: ToastOptions) => void;
  warning: (message: ReactNode, options?: ToastOptions) => void;
  info: (message: ReactNode, options?: ToastOptions) => void;
}

const DEFAULT_DURATION: Record<ToastVariant, number> = {
  success: 4000,
  info: 4000,
  warning: 5500,
  error: 6500,
};

const VARIANT_STYLES: Record<ToastVariant, { icon: typeof CheckCircle2; classes: string; iconClass: string }> = {
  success: {
    icon: CheckCircle2,
    classes: "border-neon-blue/30 bg-neon-blue/10",
    iconClass: "text-neon-blue",
  },
  error: {
    icon: XCircle,
    classes: "border-neon-pink/30 bg-neon-pink/10",
    iconClass: "text-neon-pink",
  },
  warning: {
    icon: AlertTriangle,
    classes: "border-yellow-400/30 bg-yellow-400/10",
    iconClass: "text-yellow-400",
  },
  info: {
    icon: Info,
    classes: "border-white/15 bg-white/5",
    iconClass: "text-gray-300",
  },
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast() must be used within a ToastProvider.");
  }
  return ctx;
}

let nextToastId = 1;

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const style = VARIANT_STYLES[toast.variant];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 32, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 32, scale: 0.95 }}
      transition={{ type: "spring", damping: 30, stiffness: 340 }}
      role="status"
      className={cn(
        "glass-card pointer-events-auto flex w-80 items-start gap-3 border p-3.5 shadow-lg",
        style.classes,
      )}
    >
      <style.icon size={17} className={cn("mt-0.5 shrink-0", style.iconClass)} />
      <div className="min-w-0 flex-1">
        {toast.title && (
          <div className="mb-0.5 text-[10px] font-black uppercase tracking-widest text-white">{toast.title}</div>
        )}
        <div className="text-xs leading-relaxed text-gray-300">{toast.message}</div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 text-gray-500 hover:text-white"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const show = useCallback(
    (variant: ToastVariant, message: ReactNode, options: ToastOptions = {}) => {
      const id = nextToastId++;
      setToasts((prev) => [...prev, { id, variant, message, title: options.title }]);
      const duration = options.duration ?? DEFAULT_DURATION[variant];
      if (duration > 0) {
        timersRef.current.set(
          id,
          setTimeout(() => dismiss(id), duration),
        );
      }
    },
    [dismiss],
  );

  const value: ToastContextValue = {
    show,
    success: (message, options) => show("success", message, options),
    error: (message, options) => show("error", message, options),
    warning: (message, options) => show("warning", message, options),
    info: (message, options) => show("info", message, options),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-100 flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <ToastCard key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
