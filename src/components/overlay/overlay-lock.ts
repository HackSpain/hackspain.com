import { useEffect } from "react";

/**
 * The landing page owns window-level wheel/touch/key handlers that snap between
 * sections, and the wheel one calls preventDefault(). A full-screen overlay
 * needs those to stand down so its own content can scroll.
 *
 * The flag lives on <body> rather than in React state because overlays are
 * created deep inside buildSections(), which returns plain nodes with no path
 * back to the landing page. Reading an attribute off <body> is cheap enough to
 * do on every wheel event.
 */
const OVERLAY_OPEN_ATTR = "data-hs-overlay-open";

export function isOverlayOpen(): boolean {
  if (typeof document === "undefined") {
    return false;
  }
  return document.body.hasAttribute(OVERLAY_OPEN_ATTR);
}

/** Flags the document while `open`, clearing the flag on close or unmount. */
export function useOverlayLock(open: boolean): void {
  useEffect(() => {
    if (!open) {
      return;
    }
    document.body.setAttribute(OVERLAY_OPEN_ATTR, "");
    return () => {
      document.body.removeAttribute(OVERLAY_OPEN_ATTR);
    };
  }, [open]);
}
