import React from "react";
import { useStore } from "~/stores";

const VIMEO_URL = import.meta.env.VITE_VIMEO_URL ?? "https://vimeo.com/660215557";

function getVimeoEmbedUrl(value: string) {
  try {
    const url = new URL(value);
    const segments = url.pathname.split("/").filter(Boolean);

    if (url.hostname.includes("player.vimeo.com") && segments[0] === "video" && segments[1]) {
      return `https://player.vimeo.com/video/${segments[1]}`;
    }

    const videoId = segments.find((segment) => /^\d+$/.test(segment));
    return videoId ? `https://player.vimeo.com/video/${videoId}` : value;
  } catch {
    return value;
  }
}

export default function YouTube() {
  const dark = useStore((state) => state.dark);
  const videoUrl = getVimeoEmbedUrl(VIMEO_URL);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        fontFamily:
          "'SF Pro Text', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Inter', 'Helvetica Neue', sans-serif",
        backgroundColor: dark ? "#1c1c1e" : "#ffffff",
      }}
    >
      <iframe
        src={videoUrl}
        title="Vimeo video"
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          backgroundColor: "transparent",
        }}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
