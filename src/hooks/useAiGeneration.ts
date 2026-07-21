import { useCallback, useRef, useState } from 'react';
import { submitAiGeneration, type GeneratedImageResult } from '../lib/api.ts';
import { ApiError } from '../lib/api.ts';

export type AiGenerationStatus = 'idle' | 'generating' | 'succeeded' | 'failed';

interface UseAiGenerationResult {
  submitGeneration: (input: { prompt: string; aspectRatio: string }) => Promise<GeneratedImageResult>;
  generationStatus: AiGenerationStatus;
  generatedImages: GeneratedImageResult[];
  isGenerating: boolean;
  error: string | null;
  resetGeneration: () => void;
}

/** The one place Generator.tsx and Customization.tsx submit an AI generation request and read
 * its result — both call the same backend endpoint (apps.generator's Gemini-backed
 * GenerationRequest/GeneratedImage flow, see submitAiGeneration in lib/api.ts), map the response
 * the same way, and surface errors the same way. Neither page holds a Gemini API key or talks to
 * Google directly; the key lives only in the backend's environment. */
export function useAiGeneration(): UseAiGenerationResult {
  const [generationStatus, setGenerationStatus] = useState<AiGenerationStatus>('idle');
  const [generatedImages, setGeneratedImages] = useState<GeneratedImageResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Guards against a stale request's result landing after a newer one (or after reset) — same
  // "ignore this if a newer submission has since started" pattern used elsewhere in this app.
  const requestIdRef = useRef(0);

  const submitGeneration = useCallback(async (input: { prompt: string; aspectRatio: string }) => {
    const requestId = ++requestIdRef.current;
    setGenerationStatus('generating');
    setError(null);

    try {
      const image = await submitAiGeneration(input);
      if (requestIdRef.current !== requestId) {
        // A newer submission (or a reset) started while this one was in flight — drop it.
        return image;
      }
      setGeneratedImages((current) => [...current, image]);
      setGenerationStatus('succeeded');
      return image;
    } catch (err) {
      if (requestIdRef.current === requestId) {
        setGenerationStatus('failed');
        setError(err instanceof ApiError ? err.message : 'Generation failed. Please try again.');
      }
      throw err;
    }
  }, []);

  const resetGeneration = useCallback(() => {
    requestIdRef.current += 1;
    setGenerationStatus('idle');
    setGeneratedImages([]);
    setError(null);
  }, []);

  return {
    submitGeneration,
    generationStatus,
    generatedImages,
    isGenerating: generationStatus === 'generating',
    error,
    resetGeneration,
  };
}
