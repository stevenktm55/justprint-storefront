"use client";

import { useEffect, useState } from "react";

/** Client-only media query hook (SSR → false until hydrated). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);

  return matches;
}

/** Tailwind `lg` breakpoint — desktop preview vs sticky mobile. */
export function useIsLargeScreen(): boolean {
  return useMediaQuery("(min-width: 1024px)");
}
