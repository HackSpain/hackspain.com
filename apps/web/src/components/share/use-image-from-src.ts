import { useEffect, useState } from "react";

/**
 * Decodes an image source into an element the badge canvas can draw. Returns
 * null until it is ready, and stays null if it never loads, which the badge
 * already treats as having no portrait.
 */
export function useImageFromSrc(src: string | null): HTMLImageElement | null {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src) {
      setImage(null);
      return;
    }

    let cancelled = false;
    const element = new Image();
    element.onload = () => {
      if (!cancelled) {
        setImage(element);
      }
    };
    element.onerror = () => {
      if (!cancelled) {
        setImage(null);
      }
    };
    element.src = src;

    return () => {
      cancelled = true;
    };
  }, [src]);

  return image;
}
