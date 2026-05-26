"use client";

import { useEffect } from "react";

const POLL_MS = 5000;

export function usePoll(callback: () => void, deps: unknown[] = []) {
  useEffect(() => {
    callback();
    const id = setInterval(callback, POLL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
