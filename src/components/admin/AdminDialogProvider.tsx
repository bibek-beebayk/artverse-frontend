/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Replaces window.alert/confirm/prompt everywhere in the admin panel with an in-app modal that
// matches the rest of the panel's visual language, instead of the browser's native (unstyled,
// blocking, easily-missed-behind-the-tab) dialogs. Mounted once at the admin app root
// (AdminApp.tsx) — every admin page/component reaches it via useAdminDialog(), never its own
// local dialog state.
//
// Deliberately NOT built on AdminModal — AdminModal's docstring warns against ever nesting one
// inside another (Framer Motion's inline transform on the animated panel makes it the containing
// block for a descendant position:fixed element), and a confirm/alert can legitimately need to
// show up while an AdminModal create/edit form is already open (e.g. a save failing while the
// form modal is still on screen). Rendering this provider's overlay as a sibling at the app root,
// not a descendant of any AdminModal, avoids that clipping bug entirely — same fix pattern as
// MockupTemplatesPage's master/detail view, applied at the provider level instead of per-page.

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle } from "lucide-react";
import { cn } from "../../lib/utils.ts";

interface AlertOptions {
  title?: string;
  okLabel?: string;
}

interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button as destructive (neon-pink) — use for delete/deactivate-style
   * actions, matching AdminResourceTable's existing delete-confirmation copy/intent. */
  danger?: boolean;
}

interface PromptOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  defaultValue?: string;
  placeholder?: string;
}

interface AdminDialogContextValue {
  alert: (message: ReactNode, options?: AlertOptions) => Promise<void>;
  confirm: (message: ReactNode, options?: ConfirmOptions) => Promise<boolean>;
  prompt: (message: ReactNode, options?: PromptOptions) => Promise<string | null>;
}

type DialogState =
  | { kind: "alert"; message: ReactNode; options: AlertOptions }
  | { kind: "confirm"; message: ReactNode; options: ConfirmOptions }
  | { kind: "prompt"; message: ReactNode; options: PromptOptions };

const AdminDialogContext = createContext<AdminDialogContextValue | null>(null);

export function useAdminDialog(): AdminDialogContextValue {
  const ctx = useContext(AdminDialogContext);
  if (!ctx) {
    throw new Error("useAdminDialog() must be used within an AdminDialogProvider.");
  }
  return ctx;
}

function DialogPanel({
  state,
  promptValue,
  onPromptValueChange,
  onResolve,
}: {
  state: DialogState;
  promptValue: string;
  onPromptValueChange: (value: string) => void;
  onResolve: (result: boolean | string | null) => void;
}) {
  const isDanger = state.kind === "confirm" && state.options.danger;

  const handleBackdropResolve = () => {
    // Dismissing (Escape / click-outside) is always the safe/non-destructive outcome — never
    // treated as confirming a prompt or a destructive confirm.
    onResolve(state.kind === "prompt" ? null : false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-80 flex items-center justify-center bg-cyber-black/80 p-4 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      onKeyDown={(event) => {
        if (event.key === "Escape") handleBackdropResolve();
      }}
      onClick={handleBackdropResolve}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ type: "spring", damping: 32, stiffness: 320 }}
        className="glass-card relative w-full max-w-sm border-white/15 p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start gap-3">
          {isDanger && (
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neon-pink/30 bg-neon-pink/15 text-neon-pink">
              <AlertTriangle size={15} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            {state.options.title && (
              <h3 className="mb-1.5 text-sm font-display font-black uppercase tracking-widest text-white">
                {state.options.title}
              </h3>
            )}
            <div className="text-xs leading-relaxed text-gray-300">{state.message}</div>
          </div>
        </div>

        {state.kind === "prompt" && (
          <input
            autoFocus
            type="text"
            value={promptValue}
            placeholder={state.options.placeholder}
            onChange={(event) => onPromptValueChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onResolve(promptValue);
            }}
            className="mb-4 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-neon-purple/50 focus:outline-none"
          />
        )}

        <div className="flex justify-end gap-2">
          {state.kind !== "alert" && (
            <button
              type="button"
              onClick={() => onResolve(state.kind === "prompt" ? null : false)}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-300 hover:text-white"
            >
              {state.options.cancelLabel ?? "Cancel"}
            </button>
          )}
          <button
            type="button"
            autoFocus={state.kind !== "prompt"}
            onClick={() => onResolve(state.kind === "prompt" ? promptValue : true)}
            className={cn(
              "rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-colors",
              isDanger
                ? "bg-neon-pink text-white hover:bg-neon-pink/80"
                : "bg-white text-cyber-black hover:bg-neon-purple hover:text-white",
            )}
          >
            {state.kind === "alert"
              ? (state.options.okLabel ?? "OK")
              : state.kind === "confirm"
                ? (state.options.confirmLabel ?? "Confirm")
                : (state.options.confirmLabel ?? "OK")}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function AdminDialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState | null>(null);
  const [promptValue, setPromptValue] = useState("");
  const resolverRef = useRef<((result: boolean | string | null) => void) | null>(null);

  const resolve = useCallback((result: boolean | string | null) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setState(null);
  }, []);

  const alert = useCallback((message: ReactNode, options: AlertOptions = {}) => {
    return new Promise<void>((resolvePromise) => {
      resolverRef.current = () => resolvePromise();
      setState({ kind: "alert", message, options });
    });
  }, []);

  const confirm = useCallback((message: ReactNode, options: ConfirmOptions = {}) => {
    return new Promise<boolean>((resolvePromise) => {
      resolverRef.current = (result) => resolvePromise(Boolean(result));
      setState({ kind: "confirm", message, options });
    });
  }, []);

  const prompt = useCallback((message: ReactNode, options: PromptOptions = {}) => {
    setPromptValue(options.defaultValue ?? "");
    return new Promise<string | null>((resolvePromise) => {
      resolverRef.current = (result) => resolvePromise(typeof result === "string" ? result : null);
      setState({ kind: "prompt", message, options });
    });
  }, []);

  return (
    <AdminDialogContext.Provider value={{ alert, confirm, prompt }}>
      {children}
      <AnimatePresence>
        {state && (
          <DialogPanel
            state={state}
            promptValue={promptValue}
            onPromptValueChange={setPromptValue}
            onResolve={resolve}
          />
        )}
      </AnimatePresence>
    </AdminDialogContext.Provider>
  );
}
