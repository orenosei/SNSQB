import { useEffect } from "react";
import { animate } from "motion/mini";

/** Animate the current surface in place so route state and focus stay intact. */
export function useSurfaceEntrance(
  surface: { readonly current: HTMLElement | null },
  pathname: string,
) {
  useEffect(() => {
    const node = surface.current;
    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const animation = animate(
      node,
      { opacity: [0.82, 1] },
      { duration: 0.28, ease: [0.2, 0.75, 0.25, 1] },
    );

    return () => animation.cancel();
  }, [surface, pathname]);
}
