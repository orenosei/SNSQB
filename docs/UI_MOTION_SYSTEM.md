# SNSQB motion system

Motion 14.14.0 uses its lightweight `motion/mini` entry point for a 280ms entrance on the signed-in main surface after pathname changes and on the login cover. A search-parameter change leaves the result surface steady. The hook animates existing DOM, so routes keep normal mounting, scrolling and focus behavior. This uses opacity from 0.82 to 1 with an ease-out `[0.2, 0.75, 0.25, 1]`.

CSS handles 160ms hover and press cues and the 220ms native dialog entrance. The dialog animates a short translation and opacity, with an independent backdrop fade. Shared nav and tab accents also change by CSS. Dialog dismissal follows native focus and Escape behavior.

Reduced motion skips Motion entrances and disables the custom modal animations. The workspace cascade also minimizes other animation and transition durations. There is no navigation delay, page exit wait, animation-driven scroll or shared layout overlay.

