import { ImageResponse } from "@vercel/og";
import type { APIRoute } from "astro";
import { ogBadgeFonts } from "../../../components/share/og-badge-fonts";
import { PlayerMarketOgCard } from "../../../components/share/player-market-og-card";

export const prerender = false;

export const GET: APIRoute = () =>
  new ImageResponse(PlayerMarketOgCard(), {
    fonts: ogBadgeFonts(),
    headers: {
      "cache-control": "public, max-age=3600, s-maxage=604800",
    },
    height: 630,
    width: 1200,
  });
