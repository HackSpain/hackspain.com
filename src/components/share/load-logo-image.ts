import { logoWordmarkDataUri } from "./logo-wordmark";

export function loadLogoImage(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = logoWordmarkDataUri();
  });
}
