"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useStreamingText(
  text: string,
  options?: { charDelayMs?: number; enabled?: boolean }
) {
  const charDelayMs = options?.charDelayMs ?? 14;
  const enabled = options?.enabled ?? true;
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const onCompleteRef = useRef<(() => void) | undefined>(undefined);

  const reset = useCallback(() => {
    setDisplayed("");
    setDone(false);
  }, []);

  useEffect(() => {
    if (!enabled || !text) {
      setDisplayed("");
      setDone(false);
      return;
    }

    setDisplayed("");
    setDone(false);
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setDisplayed(text.slice(0, index));
      if (index >= text.length) {
        window.clearInterval(timer);
        setDone(true);
        onCompleteRef.current?.();
      }
    }, charDelayMs);

    return () => window.clearInterval(timer);
  }, [text, charDelayMs, enabled]);

  const onComplete = useCallback((fn: () => void) => {
    onCompleteRef.current = fn;
  }, []);

  return { displayed, done, reset, onComplete };
}
