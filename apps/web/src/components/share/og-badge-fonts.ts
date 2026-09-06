import bungee400 from "../../assets/fonts/bungee-latin-400-normal.woff?inline";
import dmSans700 from "../../assets/fonts/dm-sans-latin-700-normal.woff?inline";
import dmSans900 from "../../assets/fonts/dm-sans-latin-900-normal.woff?inline";

const BASE64_MARKER = ";base64,";

/**
 * The image renderer needs real font bytes, so the files are inlined into the
 * server bundle rather than fetched at request time. Latin subsets only, which
 * is all the Spanish-first copy on the badge needs.
 */
function fontBytes(dataUri: string): Buffer {
  const markerAt = dataUri.indexOf(BASE64_MARKER);
  if (markerAt === -1) {
    throw new Error("Expected a base64 data URI for the badge font");
  }
  return Buffer.from(dataUri.slice(markerAt + BASE64_MARKER.length), "base64");
}

export interface OgFont {
  data: Buffer;
  name: string;
  style: "normal";
  weight: 400 | 700 | 900;
}

export function ogBadgeFonts(): OgFont[] {
  return [
    {
      data: fontBytes(dmSans700),
      name: "DM Sans",
      style: "normal",
      weight: 700,
    },
    {
      data: fontBytes(dmSans900),
      name: "DM Sans",
      style: "normal",
      weight: 900,
    },
    {
      data: fontBytes(bungee400),
      name: "Bungee",
      style: "normal",
      weight: 400,
    },
  ];
}
