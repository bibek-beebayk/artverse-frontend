/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { cn } from "../../lib/utils.ts";

// Visual replacement for hand-typing MockupTemplatePart.config/safe_area/bleed_area as raw
// JSON. Placement math mirrors the Django admin's existing widget (apps/generator/static/
// generator/admin/mockup_config_editor.js) exactly: config.placement.{x,y,width,height} are
// pixels in the base image's NATURAL (intrinsic) resolution, not percentages. Safe-area/bleed-
// area math mirrors the customer-facing renderer (Customization.tsx's previewSafeAreaStyle/
// previewBleedAreaStyle) exactly: safe_area is a percentage *of the placement box itself* (not
// the whole image), bleed_area is pixels expanding *outward from the placement box's edges* (not
// from the image edges) — so what an admin sees here is pixel-for-pixel what a customer sees.
// Move = drag anywhere in a box; resize = drag its handle. Everything outside `placement` in the
// config object (e.g. sample_placements) is preserved untouched — only `config.placement` is
// written by the visual controls.

interface Placement {
  x: number;
  y: number;
  width: number;
  height: number;
  fit?: string;
  rotation?: number;
  opacity?: number;
  corner_radius?: number;
}

interface SafeArea {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface BleedArea {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

type Rect = { x: number; y: number; width: number; height: number };
type BleedEdge = "top" | "right" | "bottom" | "left";

type DragState =
  | { mode: "move" | "resize"; startClientX: number; startClientY: number; start: Placement; stageWidth: number; stageHeight: number }
  | {
      mode: "safeMove" | "safeResize";
      startClientX: number;
      startClientY: number;
      start: SafeArea;
      placementSnapshot: Placement;
      stageWidth: number;
      stageHeight: number;
    }
  | {
      mode: "bleedEdge";
      edge: BleedEdge;
      startClientX: number;
      startClientY: number;
      start: BleedArea;
      stageWidth: number;
      stageHeight: number;
    };

// Plain `Omit<Union, K>` doesn't distribute over the union members (a well-known TS gotcha —
// `keyof` of a union is only the *shared* keys), which silently drops member-specific fields
// like `edge`/`placementSnapshot`. This forces distribution so each branch keeps its own shape.
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type DragInit = DistributiveOmit<DragState, "startClientX" | "startClientY" | "stageWidth" | "stageHeight">;

const DEFAULT_PLACEMENT: Placement = {
  x: 100,
  y: 100,
  width: 300,
  height: 300,
  fit: "contain",
  rotation: 0,
  opacity: 1,
  corner_radius: 0,
};
const DEFAULT_SAFE_AREA: SafeArea = { left: 5, top: 5, width: 90, height: 90 };
const DEFAULT_BLEED_AREA: BleedArea = { top: 0, right: 0, bottom: 0, left: 0 };

function parseJsonObject<T extends object>(value: string | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? { ...fallback, ...parsed } : fallback;
  } catch {
    return fallback;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

// Percentage-of-placement-box, matching Customization.tsx's previewSafeAreaStyle math exactly.
function safeAreaPxRect(placement: Placement, safeArea: SafeArea): Rect {
  return {
    x: placement.x + (safeArea.left / 100) * placement.width,
    y: placement.y + (safeArea.top / 100) * placement.height,
    width: (safeArea.width / 100) * placement.width,
    height: (safeArea.height / 100) * placement.height,
  };
}

// Pixels expanding outward from the placement box's edges, matching previewBleedAreaStyle.
function bleedAreaPxRect(placement: Placement, bleedArea: BleedArea): Rect {
  return {
    x: placement.x - bleedArea.left,
    y: placement.y - bleedArea.top,
    width: placement.width + bleedArea.left + bleedArea.right,
    height: placement.height + bleedArea.top + bleedArea.bottom,
  };
}

function rectToStageStyle(rect: Rect, naturalSize: { width: number; height: number }) {
  return {
    left: `${(rect.x / naturalSize.width) * 100}%`,
    top: `${(rect.y / naturalSize.height) * 100}%`,
    width: `${(rect.width / naturalSize.width) * 100}%`,
    height: `${(rect.height / naturalSize.height) * 100}%`,
  };
}

interface PlacementEditorFieldProps {
  value: string;
  onChange: (jsonValue: string) => void;
  imageUrl: string | null;
  readOnly?: boolean;
  /** Omit either pair entirely to render placement-only (no safe/bleed area UI). */
  safeAreaValue?: string;
  onSafeAreaChange?: (jsonValue: string) => void;
  bleedAreaValue?: string;
  onBleedAreaChange?: (jsonValue: string) => void;
}

export function PlacementEditorField({
  value,
  onChange,
  imageUrl,
  readOnly,
  safeAreaValue,
  onSafeAreaChange,
  bleedAreaValue,
  onBleedAreaChange,
}: PlacementEditorFieldProps) {
  const [config, setConfig] = useState<Record<string, unknown>>(() => {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  });
  const [rawText, setRawText] = useState(value);
  const [rawTextInvalid, setRawTextInvalid] = useState(false);
  const [safeArea, setSafeArea] = useState<SafeArea>(() => parseJsonObject(safeAreaValue, DEFAULT_SAFE_AREA));
  const [bleedArea, setBleedArea] = useState<BleedArea>(() => parseJsonObject(bleedAreaValue, DEFAULT_BLEED_AREA));
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [stageSize, setStageSize] = useState<{ width: number; height: number } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<DragState | null>(null);

  const placement: Placement = { ...DEFAULT_PLACEMENT, ...((config.placement as Placement) ?? {}) };
  const showSafeArea = Boolean(onSafeAreaChange);
  const showBleedArea = Boolean(onBleedAreaChange);

  useEffect(() => {
    setNaturalSize(null);
  }, [imageUrl]);

  useEffect(() => {
    if (!stageRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setStageSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, []);

  const commitConfig = (nextConfig: Record<string, unknown>) => {
    setConfig(nextConfig);
    const json = JSON.stringify(nextConfig, null, 2);
    setRawText(json);
    setRawTextInvalid(false);
    onChange(json);
  };

  const updatePlacement = (patch: Partial<Placement>) => {
    commitConfig({ ...config, placement: { ...placement, ...patch } });
  };

  const commitSafeArea = (next: SafeArea) => {
    setSafeArea(next);
    onSafeAreaChange?.(JSON.stringify(next, null, 2));
  };

  const commitBleedArea = (next: BleedArea) => {
    setBleedArea(next);
    onBleedAreaChange?.(JSON.stringify(next, null, 2));
  };

  const handleRawTextBlur = () => {
    try {
      const parsed = JSON.parse(rawText);
      if (parsed && typeof parsed === "object") {
        setConfig(parsed);
        setRawTextInvalid(false);
        onChange(JSON.stringify(parsed, null, 2));
        return;
      }
    } catch {
      // fall through to invalid state
    }
    setRawTextInvalid(true);
  };

  const beginDrag = (event: ReactPointerEvent, partial: DragInit) => {
    if (readOnly || !naturalSize || !stageRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = stageRef.current.getBoundingClientRect();
    dragState.current = {
      ...partial,
      startClientX: event.clientX,
      startClientY: event.clientY,
      stageWidth: rect.width || 1,
      stageHeight: rect.height || 1,
    } as DragState;
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const handlePointerMove = (event: PointerEvent) => {
    const drag = dragState.current;
    if (!drag || !naturalSize) return;
    const scaleX = naturalSize.width / drag.stageWidth;
    const scaleY = naturalSize.height / drag.stageHeight;
    const deltaX = (event.clientX - drag.startClientX) * scaleX;
    const deltaY = (event.clientY - drag.startClientY) * scaleY;

    if (drag.mode === "move") {
      updatePlacement({
        x: clamp(drag.start.x + deltaX, 0, naturalSize.width - drag.start.width),
        y: clamp(drag.start.y + deltaY, 0, naturalSize.height - drag.start.height),
      });
    } else if (drag.mode === "resize") {
      updatePlacement({
        width: clamp(drag.start.width + deltaX, 24, naturalSize.width - drag.start.x),
        height: clamp(drag.start.height + deltaY, 24, naturalSize.height - drag.start.y),
      });
    } else if (drag.mode === "safeMove") {
      const pctDeltaX = (deltaX / drag.placementSnapshot.width) * 100;
      const pctDeltaY = (deltaY / drag.placementSnapshot.height) * 100;
      commitSafeArea({
        ...drag.start,
        left: clamp(drag.start.left + pctDeltaX, 0, 100 - drag.start.width),
        top: clamp(drag.start.top + pctDeltaY, 0, 100 - drag.start.height),
      });
    } else if (drag.mode === "safeResize") {
      const pctDeltaX = (deltaX / drag.placementSnapshot.width) * 100;
      const pctDeltaY = (deltaY / drag.placementSnapshot.height) * 100;
      commitSafeArea({
        ...drag.start,
        width: clamp(drag.start.width + pctDeltaX, 5, 100 - drag.start.left),
        height: clamp(drag.start.height + pctDeltaY, 5, 100 - drag.start.top),
      });
    } else if (drag.mode === "bleedEdge") {
      const next = { ...drag.start };
      if (drag.edge === "top") next.top = Math.max(0, drag.start.top - deltaY);
      else if (drag.edge === "bottom") next.bottom = Math.max(0, drag.start.bottom + deltaY);
      else if (drag.edge === "left") next.left = Math.max(0, drag.start.left - deltaX);
      else next.right = Math.max(0, drag.start.right + deltaX);
      commitBleedArea(next);
    }
  };

  const handlePointerUp = () => {
    dragState.current = null;
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
  };

  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scaleX = naturalSize && stageSize ? stageSize.width / naturalSize.width : 0;
  const scaleY = naturalSize && stageSize ? stageSize.height / naturalSize.height : 0;

  const numberInputClass =
    "w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white focus:border-neon-purple/50 focus:outline-none";

  const safeRect = naturalSize ? safeAreaPxRect(placement, safeArea) : null;
  const bleedRect = naturalSize ? bleedAreaPxRect(placement, bleedArea) : null;

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={stageRef}
        className="relative w-full overflow-visible rounded-xl border border-white/10 bg-black/40"
        style={{ aspectRatio: naturalSize ? `${naturalSize.width} / ${naturalSize.height}` : "16 / 9", minHeight: 180 }}
      >
        <div className="absolute inset-0 overflow-hidden rounded-xl">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className="pointer-events-none absolute inset-0 h-full w-full object-contain"
              onLoad={(event) => {
                const { naturalWidth, naturalHeight } = event.currentTarget;
                if (naturalWidth > 0 && naturalHeight > 0) {
                  setNaturalSize({ width: naturalWidth, height: naturalHeight });
                }
              }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-[11px] text-gray-500">
              Select a base image above to use the visual placement editor.
            </div>
          )}
        </div>

        {naturalSize && showBleedArea && bleedRect && (
          <div
            className="pointer-events-none absolute border-2 border-dashed border-amber-400/70"
            style={rectToStageStyle(bleedRect, naturalSize)}
          >
            <span className="pointer-events-none absolute -top-6 right-0 whitespace-nowrap rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-cyber-black">
              Bleed
            </span>
            {!readOnly &&
              (
                [
                  ["top", "left-1/2 -top-2 -translate-x-1/2 cursor-ns-resize"],
                  ["bottom", "left-1/2 -bottom-2 -translate-x-1/2 cursor-ns-resize"],
                  ["left", "top-1/2 -left-2 -translate-y-1/2 cursor-ew-resize"],
                  ["right", "top-1/2 -right-2 -translate-y-1/2 cursor-ew-resize"],
                ] as const
              ).map(([edge, positionClass]) => (
                <button
                  key={edge}
                  type="button"
                  aria-label={`Adjust ${edge} bleed`}
                  onPointerDown={(event) =>
                    beginDrag(event, { mode: "bleedEdge", edge, start: { ...bleedArea } })
                  }
                  className={cn(
                    "pointer-events-auto absolute h-3 w-3 rounded-full border-2 border-cyber-black bg-amber-400",
                    positionClass,
                  )}
                />
              ))}
          </div>
        )}

        {naturalSize && (
          <div
            role="presentation"
            onPointerDown={(event) => beginDrag(event, { mode: "move", start: { ...placement } })}
            className={cn(
              "absolute border-2 border-neon-blue bg-neon-blue/10",
              readOnly ? "cursor-default" : "cursor-move",
            )}
            style={{
              left: `${(placement.x / naturalSize.width) * 100}%`,
              top: `${(placement.y / naturalSize.height) * 100}%`,
              width: `${(placement.width / naturalSize.width) * 100}%`,
              height: `${(placement.height / naturalSize.height) * 100}%`,
              borderRadius: `${(placement.corner_radius ?? 0) * ((scaleX + scaleY) / 2)}px`,
            }}
          >
            <span className="absolute -top-6 left-0 whitespace-nowrap rounded-full bg-neon-blue px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-cyber-black">
              Print Area
            </span>
            {!readOnly && (
              <button
                type="button"
                aria-label="Resize print area"
                onPointerDown={(event) => beginDrag(event, { mode: "resize", start: { ...placement } })}
                className="pointer-events-auto absolute -bottom-2 -right-2 h-4 w-4 cursor-nwse-resize rounded-full border-2 border-cyber-black bg-neon-blue"
              />
            )}

            {showSafeArea && safeRect && naturalSize && (
              <div
                role="presentation"
                onPointerDown={(event) =>
                  beginDrag(event, { mode: "safeMove", start: { ...safeArea }, placementSnapshot: { ...placement } })
                }
                className={cn(
                  "pointer-events-auto absolute border-2 border-dashed border-emerald-400",
                  readOnly ? "cursor-default" : "cursor-move",
                )}
                style={{
                  // safeRect is in the same natural-pixel space as placement — reposition it
                  // relative to the placement box (its own positioned ancestor here), not the
                  // full stage, since this div is nested inside the placement box.
                  left: `${((safeRect.x - placement.x) / placement.width) * 100}%`,
                  top: `${((safeRect.y - placement.y) / placement.height) * 100}%`,
                  width: `${(safeRect.width / placement.width) * 100}%`,
                  height: `${(safeRect.height / placement.height) * 100}%`,
                }}
              >
                <span className="pointer-events-none absolute -bottom-6 left-0 whitespace-nowrap rounded-full bg-emerald-400 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-cyber-black">
                  Safe Area
                </span>
                {!readOnly && (
                  <button
                    type="button"
                    aria-label="Resize safe area"
                    onPointerDown={(event) =>
                      beginDrag(event, {
                        mode: "safeResize",
                        start: { ...safeArea },
                        placementSnapshot: { ...placement },
                      })
                    }
                    className="pointer-events-auto absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-nwse-resize rounded-full border-2 border-cyber-black bg-emerald-400"
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {(
          [
            ["x", "X"],
            ["y", "Y"],
            ["width", "Width"],
            ["height", "Height"],
            ["corner_radius", "Corner Radius"],
            ["rotation", "Rotation"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex flex-col gap-1">
            <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500">{label}</span>
            <input
              type="number"
              className={numberInputClass}
              value={placement[key] ?? 0}
              disabled={readOnly}
              onChange={(event) => {
                const num = Number(event.target.value);
                if (!Number.isNaN(num)) updatePlacement({ [key]: num });
              }}
            />
          </label>
        ))}
        <label className="flex flex-col gap-1">
          <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500">Opacity</span>
          <input
            type="number"
            min={0}
            max={1}
            step={0.05}
            className={numberInputClass}
            value={placement.opacity ?? 1}
            disabled={readOnly}
            onChange={(event) => {
              const num = Number(event.target.value);
              if (!Number.isNaN(num)) updatePlacement({ opacity: num });
            }}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500">Fit</span>
          <select
            className={numberInputClass}
            value={placement.fit ?? "contain"}
            disabled={readOnly}
            onChange={(event) => updatePlacement({ fit: event.target.value })}
          >
            <option value="contain" style={{ backgroundColor: "#121212", color: "#ffffff" }}>
              Contain
            </option>
            <option value="cover" style={{ backgroundColor: "#121212", color: "#ffffff" }}>
              Cover
            </option>
          </select>
        </label>
      </div>

      {showSafeArea && (
        <div className="flex flex-col gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/5 p-3">
          <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-400">
            Safe Area — % of print area above
          </span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(
              [
                ["left", "Left"],
                ["top", "Top"],
                ["width", "Width"],
                ["height", "Height"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex flex-col gap-1">
                <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500">{label}</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className={numberInputClass}
                  value={safeArea[key]}
                  disabled={readOnly}
                  onChange={(event) => {
                    const num = Number(event.target.value);
                    if (!Number.isNaN(num)) commitSafeArea({ ...safeArea, [key]: clamp(num, 0, 100) });
                  }}
                />
              </label>
            ))}
          </div>
        </div>
      )}

      {showBleedArea && (
        <div className="flex flex-col gap-2 rounded-xl border border-amber-400/25 bg-amber-400/5 p-3">
          <span className="text-[9px] font-bold uppercase tracking-widest text-amber-400">
            Bleed Area — px beyond the print area's edge
          </span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(
              [
                ["top", "Top"],
                ["right", "Right"],
                ["bottom", "Bottom"],
                ["left", "Left"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex flex-col gap-1">
                <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500">{label}</span>
                <input
                  type="number"
                  min={0}
                  className={numberInputClass}
                  value={bleedArea[key]}
                  disabled={readOnly}
                  onChange={(event) => {
                    const num = Number(event.target.value);
                    if (!Number.isNaN(num)) commitBleedArea({ ...bleedArea, [key]: Math.max(0, num) });
                  }}
                />
              </label>
            ))}
          </div>
        </div>
      )}

      <details className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
        <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-widest text-gray-400">
          Advanced Placement JSON {rawTextInvalid && <span className="text-neon-pink">(invalid — not applied)</span>}
        </summary>
        <textarea
          className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-white focus:border-neon-purple/50 focus:outline-none"
          rows={6}
          disabled={readOnly}
          value={rawText}
          onChange={(event) => setRawText(event.target.value)}
          onBlur={handleRawTextBlur}
        />
        <p className="mt-1 text-[10px] text-gray-500">
          Edit placement fields not covered above (e.g. <code>sample_placements</code>) directly. Applied on blur.
        </p>
      </details>
    </div>
  );
}
