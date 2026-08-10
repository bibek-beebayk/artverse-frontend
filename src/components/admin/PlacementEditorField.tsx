/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { cn } from "../../lib/utils.ts";

// Visual replacement for hand-typing MockupTemplate/MockupTemplatePart.config as raw JSON —
// mirrors the Django admin's existing widget (apps/generator/static/generator/admin/
// mockup_config_editor.js) exactly: config.placement.{x,y,width,height} are pixels in the base
// image's NATURAL (intrinsic) resolution, not percentages and not canvas_width/canvas_height
// (confirmed unused by both the Django widget and the customer-facing Customization.tsx
// renderer). Move = drag anywhere in the box; resize = drag the bottom-right handle only —
// same interaction model as the Django widget, same clamping rules (x/y clamped to
// [0, naturalDimension - size], width/height clamped to [24, naturalDimension - position]).
// Everything outside `placement` in the config object (e.g. sample_placements) is preserved
// untouched — only `config.placement` is written by the visual controls.

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

function parseConfig(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

interface PlacementEditorFieldProps {
  value: string;
  onChange: (jsonValue: string) => void;
  imageUrl: string | null;
  readOnly?: boolean;
}

export function PlacementEditorField({ value, onChange, imageUrl, readOnly }: PlacementEditorFieldProps) {
  const [config, setConfig] = useState<Record<string, unknown>>(() => parseConfig(value));
  const [rawText, setRawText] = useState(value);
  const [rawTextInvalid, setRawTextInvalid] = useState(false);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [stageSize, setStageSize] = useState<{ width: number; height: number } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{
    mode: "move" | "resize";
    startClientX: number;
    startClientY: number;
    startPlacement: Placement;
    stageWidth: number;
    stageHeight: number;
  } | null>(null);

  const placement: Placement = { ...DEFAULT_PLACEMENT, ...((config.placement as Placement) ?? {}) };

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

  const commit = (nextConfig: Record<string, unknown>) => {
    setConfig(nextConfig);
    const json = JSON.stringify(nextConfig, null, 2);
    setRawText(json);
    setRawTextInvalid(false);
    onChange(json);
  };

  const updatePlacement = (patch: Partial<Placement>) => {
    commit({ ...config, placement: { ...placement, ...patch } });
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

  const beginDrag = (event: ReactPointerEvent, mode: "move" | "resize") => {
    if (readOnly || !naturalSize || !stageRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = stageRef.current.getBoundingClientRect();
    dragState.current = {
      mode,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPlacement: { ...placement },
      stageWidth: rect.width || 1,
      stageHeight: rect.height || 1,
    };
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
        x: clamp(drag.startPlacement.x + deltaX, 0, naturalSize.width - drag.startPlacement.width),
        y: clamp(drag.startPlacement.y + deltaY, 0, naturalSize.height - drag.startPlacement.height),
      });
    } else {
      updatePlacement({
        width: clamp(drag.startPlacement.width + deltaX, 24, naturalSize.width - drag.startPlacement.x),
        height: clamp(drag.startPlacement.height + deltaY, 24, naturalSize.height - drag.startPlacement.y),
      });
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

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={stageRef}
        className="relative w-full overflow-hidden rounded-xl border border-white/10 bg-black/40"
        style={{ aspectRatio: naturalSize ? `${naturalSize.width} / ${naturalSize.height}` : "16 / 9", minHeight: 180 }}
      >
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

        {naturalSize && (
          <div
            role="presentation"
            onPointerDown={(event) => beginDrag(event, "move")}
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
                onPointerDown={(event) => beginDrag(event, "resize")}
                className="absolute -bottom-2 -right-2 h-4 w-4 cursor-nwse-resize rounded-full border-2 border-cyber-black bg-neon-blue"
              />
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

      <details className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
        <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-widest text-gray-400">
          Advanced JSON {rawTextInvalid && <span className="text-neon-pink">(invalid — not applied)</span>}
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
          Edit fields not covered above (e.g. <code>sample_placements</code>) directly. Applied on blur.
        </p>
      </details>
    </div>
  );
}
