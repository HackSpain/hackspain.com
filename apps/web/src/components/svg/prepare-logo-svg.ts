const LOGO_VIEW =
  'viewBox="0 82 250 80" preserveAspectRatio="xMidYMid meet" overflow="visible"';

const SVG_COMMENT_RE = /<!--[\s\S]*?-->\s*/g;
const CRLF_TO_LF = /\r\n/g;
const LOGO_DIMENSION_VIEWBOX_RE =
  /width="250"\s*height="250"\s*viewBox="0 0 250 250"/;
const STROKE_WIDTH_ATTR_RE = /stroke-width="[^"]*"/g;
const OPEN_SVG_TAG_RE = /<svg\b/;

export function prepareLogoSvg(raw: string): string {
  let out = raw
    .replace(SVG_COMMENT_RE, "")
    .replace(CRLF_TO_LF, "\n")
    .replace(LOGO_DIMENSION_VIEWBOX_RE, LOGO_VIEW);

  // Make the strokes thicker to match the poster style
  out = out.replace(STROKE_WIDTH_ATTR_RE, 'stroke-width="2.5"');

  out = out.replace(
    OPEN_SVG_TAG_RE,
    '<svg role="img" aria-label="HACKSPAIN" focusable="false" width="100%" height="100%"'
  );

  return out;
}
